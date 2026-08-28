import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import { ReplayDataIngestor } from '../replay/replayDataIngestor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function traceProvider(providerId) {
  const allProviders = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
  const disabledList = allProviders.filter(p => p !== providerId);
  
  process.env.DISABLED_PROVIDERS = disabledList.join(',');
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';
  process.env.ARL_MODE = 'SIMULATION';
  process.env.FAST_REPLAY = 'true';
  process.env.COURT_SECRET_KEY = 'REPLAY_SECRET_MOCK';

  const streamEnginePath = resolve(__dirname, '../../lyzer edge/backend/streamEngine.js');
  const { StreamEngine } = await import(pathToFileURL(streamEnginePath).href);

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  const ingestor = new ReplayDataIngestor(datasetPath, { symbol: 'BTCUSDT' });
  const split = ingestor.computeTemporalSplit({ is: 0.6, val: 0.2, oos: 0.2 });
  
  const isIngestor = new ReplayDataIngestor(datasetPath, {
    symbol: 'BTCUSDT',
    startTime: split.is.startTime,
    endTime: split.is.endTime,
  });

  const engine = new StreamEngine({
    mode: 'SIMULATION',
    symbol: 'BTCUSDT',
    interval: '1m',
    stabilizationWindowMs: 0,
  });
  engine.isRunning = true;
  engine.execution = null;

  // Warmup 500
  const warmupCandles = isIngestor.getWarmupCandles(500);
  for (const c of warmupCandles) {
    engine.updateMtfCandles(c);
    try { await engine.processCandle(c, 0); } catch (_) {}
  }
  engine.tradeHistory = [];
  engine.activePosition = null;

  const gates = {
    totalCandles: 0,
    providerSignalLong: 0,
    providerSignalShort: 0,
    confluenceLong: 0,
    confluenceShort: 0,
    goldenHoursPassed: 0,
    directionAllowedPassed: 0,
    eefPassed: 0,
    dealingRangePassed: 0,
    courtPassed: 0,
    tradesOpened: 0
  };

  isIngestor.reset();

  while (isIngestor.hasNext()) {
    const candle = isIngestor.next();
    if (!candle) break;
    gates.totalCandles++;

    engine.updateMtfCandles(candle);
    
    // We inspect state right before and during processCandle
    const prevTradeCount = engine.tradeHistory.length;
    const hadPos = !!engine.activePosition;

    try {
      await engine.processCandle(candle, gates.totalCandles);
    } catch (_) {}

    if (!hadPos && engine.activePosition) {
      gates.tradesOpened++;
    }
  }

  return { provider: providerId.toUpperCase(), gates };
}

async function main() {
  const targetProviders = ['v2', 'v4', 'v5', 'v6', 'v7'];
  console.log('='.repeat(70));
  console.log('🕵️ FORENSIC GATE-BY-GATE TRACER (IS: 77,760 CANDLES)');
  console.log('='.repeat(70));

  for (const p of targetProviders) {
    const res = await traceProvider(p);
    console.log(`\n--- GATING TRACE FOR PROVIDER ${res.provider} ---`);
    console.log(`Total Candles: ${res.gates.totalCandles}`);
    console.log(`Trades Opened: ${res.gates.tradesOpened}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

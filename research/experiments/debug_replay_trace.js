import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../');

process.env.AUTHORIZATION_STATE = 'AUTHORIZED';
process.env.AUTHORIZED_PROVIDER = 'REC_COMP_INSTITUTIONAL_v1';
process.env.MAX_DAILY_CAPITAL = '150000';
process.env.EXIT_POLICY = 'DYNAMIC_TP';
process.env.TIME_EXIT_MINUTES = '360';
process.env.ATR_SL_MULTIPLIER = '1.0';
process.env.ATR_TP_MULTIPLIER = '2.5';
process.env.FAST_TF = '1h';
process.env.INTERMEDIATE_TF = '1h';
process.env.SLOW_TF = '1h';
process.env.NODE_ENV = 'test';
process.env.COURT_SECRET_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { StreamEngine } from '../../lyzer edge/backend/streamEngine.js';
import { ConstitutionalCourt } from '../../packages/lyzer-constitution/src/eca/court.js';

const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');
const candlesH1 = JSON.parse(readFileSync(h1Path, 'utf8'));
candlesH1.sort((a, b) => a.openTime - b.openTime);

const freshCourt = new ConstitutionalCourt({
  dvfFloor: 0.1,
  stressAccumulation: 0.002,
  lethalIllusionLimit: 0.9,
  stressRelease: 0.1
}, {
  sclThreshold: 3,
  stabilizationWindowMs: 0
});

const engine = new StreamEngine({
  symbol: 'BTCUSDT',
  interval: '1h',
  exitPolicy: 'DYNAMIC_TP',
  timeExitMinutes: 360,
  mode: 'SIMULATION',
  court: freshCourt,
  providerConfigs: {
    v5: {
      lookback: 30,
      volumeZScore: 1.50,
      minPierceATR: 0.50,
      pocProximity: 0.003,
      requireVolume: true,
      requirePierce: true,
      requirePOC: false,
      requireReversal: true
    }
  }
});

engine.startLiveMode = async () => {};
engine.start = async () => {};
engine.startSimulationLoop = () => {};
engine.dualMonitor = { calculateDivergence: async () => 0.05 };

for (let i = 0; i < 500; i++) {
  const c = candlesH1[i];
  const tickEvent = {
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    timestamp: c.openTime,
    openTime: c.openTime,
    closed: true
  };
  
  engine.updateMtfCandles(tickEvent);

  if (i === 133) {
    console.log(`\n================== DETAILED STEP-BY-STEP TRACE CANDLE 133 ==================`);
    const mappedCandles = {
      fast: engine.mtfCandles['1h'] || engine.mtfCandles['1m'],
      intermediate: engine.mtfCandles['1h'] || engine.mtfCandles['15m'],
      slow: engine.mtfCandles['1h'],
      ...engine.mtfCandles
    };
    const v5Narrative = engine.v5.reconstruct(mappedCandles);
    console.log('1. V5 Narrative:', v5Narrative);

    const v5Sig = { signal: v5Narrative.signal, confidence: v5Narrative.confidence, id: 'v5' };
    const providers = { v5: v5Sig };
    const micro = {
      liquidityDivergence: 1.0,
      scaleDivergence: 0.05,
      lhds: 0.1,
      weights: { v5: 1.0 }
    };
    const kernelResult = engine.truthKernel.evaluate(providers, micro);
    console.log('2. TruthKernel Result:', kernelResult);

    console.log('3. Disabled Providers:', Array.from(engine.disabledProviders));
    console.log('\n--- EVALUATING PROCESS_CANDLE INTERNAL GATES AT CANDLE 133 ---');
    
    // Dealing Range
    const dealingRange = engine.candles ? engine.candles.slice(-100) : [];
    console.log('Total candles buffer:', engine.candles.length);

    // Let's check Court permission directly
    const courtState = {
      symbol: engine.symbol,
      trg: kernelResult.trg,
      dvf: kernelResult.dvf,
      scale_divergence: 0.05,
      lhds: 0.1,
      epistemic_authority: kernelResult.epistemic_authority,
      currentDrawdown: 0,
      currentSlippage: 0
    };

    const permissionToken = freshCourt.requestPermission('EXECUTE_TRADE', courtState, {
      eef: kernelResult.eef,
      epistemic_authority: kernelResult.epistemic_authority,
      reason: kernelResult.reason_codes[0]
    });
    console.log('4. Calling processCandle on engine...');
    await engine.processCandle(tickEvent, i);
    console.log('5. Engine Active Position after processCandle:', engine.activePosition);
    console.log('6. Engine Trade History length:', engine.tradeHistory.length);
    console.log('=============================================================================');
    break;
  }
}

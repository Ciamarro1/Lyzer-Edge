import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { ReplayRunner } from '../replay/replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runWorker(providerId, segment = 'is') {
  const allProviders = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
  const disabledList = allProviders.filter(p => p !== providerId.toLowerCase());
  
  process.env.DISABLED_PROVIDERS = disabledList.join(',');
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';
  process.env.ARL_MODE = 'SIMULATION';
  process.env.FAST_REPLAY = 'true';

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment,
    split: { is: 0.6, val: 0.2, oos: 0.2 },
    experimentId: `EXP-PROVIDER-ISOLATION-001-${providerId.toUpperCase()}`,
    hypothesis: `Isolate provider ${providerId} to measure its raw expectancy and MFE/MAE profile.`,
    takerFeePct: 0.001,
    slippagePct: 0.0002,
    warmupCandles: 500,
  };

  const runner = new ReplayRunner(config);
  const results = await runner.run();
  
  const resultsDir = resolve(__dirname, '../results');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  
  const outputPath = runner.saveResults(resultsDir);
  
  return {
    name: providerId.toUpperCase(),
    metrics: results.metrics,
    tradeCount: results.trades.length,
    path: outputPath,
    runtimeMs: results.metadata.runtimeMs,
    candlesProcessed: results.metadata.candlesProcessed,
  };
}

if (process.send) {
  // Invoked as child process / IPC worker
  process.on('message', async (msg) => {
    try {
      const { providerId, segment } = msg;
      const res = await runWorker(providerId, segment);
      process.send({ success: true, result: res });
    } catch (err) {
      process.send({ success: false, error: err.message, stack: err.stack });
    }
  });
} else {
  // Direct CLI invocation: node providerWorker.js <providerId> [segment]
  const providerId = process.argv[2] || 'v2';
  const segment = process.argv[3] || 'is';
  runWorker(providerId, segment).then(res => {
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

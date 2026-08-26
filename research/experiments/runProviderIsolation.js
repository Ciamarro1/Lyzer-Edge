import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ReplayRunner } from '../replay/replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runIsolation(providerId) {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 STARTING ISOLATION: PROVIDER ${providerId.toUpperCase()}`);
  console.log('='.repeat(60));

  // Determine which providers to disable
  const allProviders = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
  const disabledList = allProviders.filter(p => p !== providerId);
  
  // Apply environment overrides for streamEngine
  process.env.DISABLED_PROVIDERS = disabledList.join(',');
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment: 'is', 
    split: { is: 0.6, val: 0.2, oos: 0.2 },
    experimentId: `EXP-PROVIDER-ISOLATION-001-${providerId.toUpperCase()}`,
    hypothesis: `Isolate provider ${providerId} to measure its raw expectancy and MFE/MAE profile without interference from other providers.`,
    takerFeePct: 0.001,
    slippagePct: 0.0002,
    warmupCandles: 500,
  };

  const runner = new ReplayRunner(config);
  const results = await runner.run();
  
  const resultsDir = resolve(__dirname, '../results');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  
  const outputPath = runner.saveResults(resultsDir);
  runner.printReport();

  return { name: providerId.toUpperCase(), metrics: results.metrics, path: outputPath };
}

async function main() {
  // Test only the providers that are active in production by default
  const targetProviders = ['v2', 'v4', 'v5', 'v6', 'v7'];
  const results = [];

  for (const p of targetProviders) {
    const res = await runIsolation(p);
    results.push(res);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPERIMENT EXP-PROVIDER-ISOLATION-001 SUMMARY');
  console.log('='.repeat(60));
  
  for (const r of results) {
    console.log(`\n--- PROVIDER ${r.name} ---`);
    console.log(`Trades: ${r.metrics.trades} | Win Rate: ${r.metrics.winRate}%`);
    console.log(`Net PnL: $${r.metrics.netPnL} | Profit Factor: ${r.metrics.profitFactor}`);
    console.log(`Expectancy: $${r.metrics.expectancy} | Max DD: $${r.metrics.maxDrawdown}`);
  }
  
  console.log('\n============================================================');
  console.log('Isolation complete. Please refer to individual JSON reports for deep MFE/MAE autopsy.');
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

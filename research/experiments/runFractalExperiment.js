/**
 * @fileoverview FRACTAL TIMEFRAME EXPERIMENT (EXP-FRACTAL-001)
 * 
 * Objective: Discover if there is statistically significant Alpha 
 * in higher structural timeframes (M5, M15) vs the M1 baseline.
 * 
 * ARM A: Structure M1 (Baseline)
 * ARM B: Structure M5
 * ARM C: Structure M15
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ReplayRunner } from '../replay/replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runArm(armName, tfConfig) {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 STARTING ${armName}`);
  console.log(`   Fast: ${tfConfig.FAST_TF} | Intermediate: ${tfConfig.INTERMEDIATE_TF}`);
  console.log('='.repeat(60));

  // Set environment variables for streamEngine mapping
  process.env.FAST_TF = tfConfig.FAST_TF;
  process.env.INTERMEDIATE_TF = tfConfig.INTERMEDIATE_TF;
  process.env.SLOW_TF = tfConfig.SLOW_TF || '1h';

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment: 'is', 
    split: { is: 0.6, val: 0.2, oos: 0.2 },
    experimentId: `EXP-FRACTAL-001-${armName.replace(' ', '')}`,
    hypothesis: `Structural timeframe ${tfConfig.INTERMEDIATE_TF} provides better SNR and higher Alpha than M1 baseline.`,
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

  return { name: armName, metrics: results.metrics, path: outputPath };
}

async function main() {
  const arms = [
    {
      name: 'ARM A (Baseline M1/M1)',
      config: { FAST_TF: '1m', INTERMEDIATE_TF: '1m', SLOW_TF: '1m' }
    },
    {
      name: 'ARM B (Structure M5/M1)',
      config: { FAST_TF: '1m', INTERMEDIATE_TF: '5m', SLOW_TF: '1h' }
    },
    {
      name: 'ARM C (Structure M15/M1)',
      config: { FAST_TF: '1m', INTERMEDIATE_TF: '15m', SLOW_TF: '4h' }
    }
  ];

  const results = [];
  for (const arm of arms) {
    const res = await runArm(arm.name, arm.config);
    results.push(res);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏆 EXPERIMENT EXP-FRACTAL-001 SUMMARY (IN-SAMPLE)');
  console.log('='.repeat(60));
  
  for (const r of results) {
    console.log(`\n--- ${r.name} ---`);
    console.log(`Trades: ${r.metrics.trades} | Win Rate: ${r.metrics.winRate}%`);
    console.log(`Net PnL: $${r.metrics.netPnL} | Max DD: $${r.metrics.maxDrawdown} (${r.metrics.maxDrawdownPct}%)`);
    console.log(`Profit Factor: ${r.metrics.profitFactor} | Expectancy: $${r.metrics.expectancy}`);
  }
  
  console.log('\n============================================================');
  console.log('Done.');
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

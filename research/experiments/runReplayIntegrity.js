import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { ReplayRunner } from '../replay/replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 STARTING EXP-REPLAY-INTEGRITY-001 (Fixed Accounting)`);
  console.log('='.repeat(60));

  // Set environment variables for streamEngine mapping (Baseline)
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment: 'is', 
    split: { is: 0.6, val: 0.2, oos: 0.2 }, // 77,760 candles
    experimentId: `EXP-REPLAY-INTEGRITY-001`,
    hypothesis: `Fixing execution simulator to account for Hybrid Scale-Out (pos.accumulatedPnl) will reveal the true positive edge of the strategy.`,
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
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

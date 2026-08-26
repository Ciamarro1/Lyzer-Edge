/**
 * @fileoverview Baseline Determinism Validator
 * Runs the ReplayRunner TWICE with identical configuration and verifies
 * that both runs produce identical trade ledgers and PnL.
 * 
 * RULE: If this test fails, the Replay Engine is non-deterministic
 * and NO experiments should proceed until the bug is fixed.
 * 
 * Usage: node research/replay/validateDeterminism.js
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { ReplayRunner } from './replayRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  
  const config = {
    datasetPath,
    symbol: 'BTCUSDT',
    segment: 'is', // Use IS segment only
    split: { is: 0.05, val: 0.1, oos: 0.85 }, // FAST RUN: only 5% of data (~6,500 candles) for determinism check
    experimentId: 'DETERMINISM_CHECK',
    hypothesis: 'Two identical runs produce identical results',
    takerFeePct: 0.001,
    slippagePct: 0.0002,
    warmupCandles: 500,
  };

  console.log('='.repeat(60));
  console.log('🔬 DETERMINISM VALIDATION — RUN 1 OF 2');
  console.log('='.repeat(60));
  
  const runner1 = new ReplayRunner(config);
  const result1 = await runner1.run();
  
  console.log('\n' + '='.repeat(60));
  console.log('🔬 DETERMINISM VALIDATION — RUN 2 OF 2');
  console.log('='.repeat(60));
  
  const runner2 = new ReplayRunner(config);
  const result2 = await runner2.run();

  // Compare
  console.log('\n' + '='.repeat(60));
  console.log('📊 DETERMINISM COMPARISON');
  console.log('='.repeat(60));

  const hash1 = hashTrades(result1.trades);
  const hash2 = hashTrades(result2.trades);

  console.log(`  Run 1: ${result1.trades.length} trades, hash: ${hash1}`);
  console.log(`  Run 2: ${result2.trades.length} trades, hash: ${hash2}`);
  console.log(`  Trade count match: ${result1.trades.length === result2.trades.length ? '✅' : '❌'}`);
  console.log(`  Hash match: ${hash1 === hash2 ? '✅' : '❌'}`);
  console.log(`  Net PnL Run 1: $${result1.metrics.netPnL}`);
  console.log(`  Net PnL Run 2: $${result2.metrics.netPnL}`);
  console.log(`  PnL match: ${result1.metrics.netPnL === result2.metrics.netPnL ? '✅' : '❌'}`);

  if (hash1 === hash2 && result1.trades.length === result2.trades.length) {
    console.log('\n✅ DETERMINISM VALIDATED. Replay Engine is reproducible.');
    console.log('   Proceed to experimental phase.\n');
    
    // Print baseline metrics
    runner1.printReport();
    process.exit(0);
  } else {
    console.log('\n❌ DETERMINISM FAILURE. Replay Engine produces different results.');
    console.log('   DO NOT proceed to experiments. Fix non-determinism first.\n');
    
    // Find first divergent trade
    const maxLen = Math.max(result1.trades.length, result2.trades.length);
    for (let i = 0; i < maxLen; i++) {
      const t1 = result1.trades[i];
      const t2 = result2.trades[i];
      if (!t1 || !t2) {
        console.log(`  Divergence at trade ${i}: one run has more trades`);
        break;
      }
      if (t1.entryPrice !== t2.entryPrice || t1.direction !== t2.direction) {
        console.log(`  Divergence at trade ${i}:`);
        console.log(`    Run 1: ${t1.direction} @ ${t1.entryPrice}`);
        console.log(`    Run 2: ${t2.direction} @ ${t2.entryPrice}`);
        break;
      }
    }
    
    process.exit(1);
  }
}

function hashTrades(trades) {
  const data = trades.map(t => `${t.direction}|${t.entryPrice}|${t.exitPrice}|${t.netPnL}`).join(',');
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

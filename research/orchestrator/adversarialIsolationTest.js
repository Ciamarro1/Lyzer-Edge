import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { MultiExperimentScheduler } from './multiExperimentScheduler.js';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';
import { runReconciliationTask } from './workers/reconciliationWorker.js';
import { getDatasetSnapshot } from './datasetSnapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getFileSha256(filePath) {
  if (!existsSync(filePath)) return 'FILE_NOT_FOUND';
  const content = readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function runAdversarialIsolationTest() {
  console.log('='.repeat(95));
  console.log('🛡️ LYZER EDGE — ADVERSARIAL ISOLATION & CONCURRENT RESEARCH TEST');
  console.log('='.repeat(95));

  const frozenConfigPath = resolve(__dirname, './frozenConfig.js');
  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');

  const hashFrozenConfigBefore = getFileSha256(frozenConfigPath);
  const hashLockboxBefore = getFileSha256(lockboxPath);
  const v5BaselineBefore = runReconciliationTask();

  console.log(`Pre-Execution V5 Frozen Config Hash : ${hashFrozenConfigBefore}`);
  console.log(`Pre-Execution V5 Shadow Lockbox Hash: ${hashLockboxBefore}`);
  console.log(`Pre-Execution V5 Baseline Totals    : N=${v5BaselineBefore.totals.n} | Gross=+$${v5BaselineBefore.totals.trueGrossPnL} | Net=+$${v5BaselineBefore.totals.trueNetPnL}`);

  // Initialize Scheduler with 12 workers
  const scheduler = new MultiExperimentScheduler({ maxWorkers: 12 });
  await scheduler.initialize();

  console.log('\n🚀 Dispatching 3 Independent Hypotheses Concurrently (V6, V7, V8)...');

  const batchExperiments = [
    {
      experimentId: 'EXP-V6-VOL-EXPANSION-001',
      hypothesisId: 'VOLATILITY_EXPANSION_EDGE',
      hypothesisFamily: 'VOL_EXPANSION',
      config: { ...FROZEN_V5_CONFIG, minPierceATR: 0.75, volumeZScore: 2.0 },
      bootstrapIterations: 50000,
      permutationIterations: 20000,
      baseSeed: 6001
    },
    {
      experimentId: 'EXP-V7-LIQUIDATION-SPIKE-001',
      hypothesisId: 'LIQUIDATION_CASCADE_EDGE',
      hypothesisFamily: 'LIQUIDATION_SPIKE',
      config: { ...FROZEN_V5_CONFIG, lookbackBars: 60, volumeZScore: 1.8 },
      bootstrapIterations: 50000,
      permutationIterations: 20000,
      baseSeed: 7001
    },
    {
      experimentId: 'EXP-V8-ORDER-FLOW-DELTA-001',
      hypothesisId: 'ORDER_FLOW_IMBALANCE_EDGE',
      hypothesisFamily: 'ORDER_FLOW_DELTA',
      config: { ...FROZEN_V5_CONFIG, minPierceATR: 0.40, pocProximity: 0.015 },
      bootstrapIterations: 50000,
      permutationIterations: 20000,
      baseSeed: 8001
    }
  ];

  const batchResult = await scheduler.runBatch(batchExperiments);
  await scheduler.destroy();

  console.log(`\n✅ Concurrent Batch Execution Completed in ${batchResult.batchTotalTimeMs.toFixed(1)} ms!`);
  console.log('Batch Experiment Summaries:');
  console.table(batchResult.results.map(r => ({
    ID: r.experimentId,
    Family: r.hypothesisFamily,
    Workers: r.allocatedWorkers,
    TimeMs: r.elapsedTimeMs,
    Trades: r.sampleSizeN,
    NetPnL: `$${r.totalNetPnL}`,
    PF: r.netProfitFactor,
    WR: `${r.netWinRatePct}%`
  })));

  // Post-Execution Forensic Checks
  const hashFrozenConfigAfter = getFileSha256(frozenConfigPath);
  const hashLockboxAfter = getFileSha256(lockboxPath);
  const v5BaselineAfter = runReconciliationTask();

  console.log('\n' + '-'.repeat(95));
  console.log('🔍 FORENSIC AUDIT OF ISOLATION INTEGRITY:');
  console.log('-'.repeat(95));

  const isConfigUntouched = hashFrozenConfigBefore === hashFrozenConfigAfter;
  const isLockboxUntouched = hashLockboxBefore === hashLockboxAfter;
  const isTotalsIdentical = (
    v5BaselineBefore.totals.n === v5BaselineAfter.totals.n &&
    v5BaselineBefore.totals.trueGrossPnL === v5BaselineAfter.totals.trueGrossPnL &&
    v5BaselineBefore.totals.trueNetPnL === v5BaselineAfter.totals.trueNetPnL
  );

  console.log(`1. Frozen Config SHA-256 Match: ${isConfigUntouched ? '🟢 100% UNTOUCHED' : '🔴 TAMPERED'}`);
  console.log(`2. Shadow Lockbox SHA-256 Match: ${isLockboxUntouched ? '🟢 100% UNTOUCHED' : '🔴 TAMPERED'}`);
  console.log(`3. V5 Baseline Replay Match   : ${isTotalsIdentical ? '🟢 100% EXACT RECONCILIATION' : '🔴 DIVERGENCE'}`);

  const testPassed = isConfigUntouched && isLockboxUntouched && isTotalsIdentical;

  return {
    status: testPassed ? 'PASS' : 'FAIL',
    isConfigUntouched,
    isLockboxUntouched,
    isTotalsIdentical,
    batchResult
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runAdversarialIsolationTest().catch(err => {
    console.error('Fatal isolation test error:', err);
    process.exit(1);
  });
}

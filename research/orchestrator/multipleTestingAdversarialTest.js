import { MultipleTestingController, HYPOTHESIS_STATES } from './multipleTestingController.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';
import crypto from 'crypto';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';
import { runReconciliationTask } from './workers/reconciliationWorker.js';
import { getDatasetSnapshot } from './datasetSnapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMultipleTestingAdversarialSuite() {
  console.log('='.repeat(95));
  console.log('🛡️ LYZER EDGE — MULTIPLE TESTING FIREWALL & DETERMINISM ADVERSARIAL SUITE');
  console.log('='.repeat(95));

  const testDbPath = resolve(__dirname, '../results/firewall/TEST_MULTIPLE_TESTING_REGISTRY.json');
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  const controller = new MultipleTestingController(testDbPath);
  const datasetHash = getDatasetSnapshot().hashes.candles1hSha256;

  console.log('\n[1/3] Executing Adversarial Attack Vectors against the Firewall...');
  const attackResults = [];

  // Attack 1: Execute Unregistered Hypothesis
  try {
    controller.startExecution('UNREGISTERED_HYPOTHESIS_999');
    attackResults.push({ attack: '1. Execute Unregistered Hypothesis', outcome: '🔴 FAILED: Allowed execution', pass: false });
  } catch (err) {
    attackResults.push({ attack: '1. Execute Unregistered Hypothesis', outcome: `🟢 BLOCKED: ${err.message}`, pass: true });
  }

  // Register a legitimate test hypothesis
  const legitimateHyp = controller.registerHypothesis({
    hypothesisId: 'HYP-ALPHA-001',
    familyId: 'MOMENTUM_BREAKOUT',
    config: { ...FROZEN_V5_CONFIG, volumeZScore: 2.5 },
    datasetHash,
    seed: 42
  });

  // Attack 2: Re-register / Overwrite existing ID with different params
  try {
    controller.registerHypothesis({
      hypothesisId: 'HYP-ALPHA-001',
      familyId: 'MOMENTUM_BREAKOUT',
      config: { ...FROZEN_V5_CONFIG, volumeZScore: 1.0 },
      datasetHash,
      seed: 99
    });
    attackResults.push({ attack: '2. Overwrite / Reuse Hypothesis ID', outcome: '🔴 FAILED: Allowed overwrite', pass: false });
  } catch (err) {
    attackResults.push({ attack: '2. Overwrite / Reuse Hypothesis ID', outcome: `🟢 BLOCKED: ${err.message}`, pass: true });
  }

  // Move HYP-ALPHA-001 to RUNNING and record results
  controller.startExecution('HYP-ALPHA-001');
  controller.recordResults('HYP-ALPHA-001', { rawPValue: 0.008, resultsSummary: { netPnL: 50.0 } });

  // Attack 3: Illegal Lifecycle Transition (Direct from DISCOVERY_RESULT to PASSED skipping OOS)
  try {
    controller.finalizeOOSValidation('HYP-ALPHA-001', { oosRawPValue: 0.01, passedAllGates: true });
    attackResults.push({ attack: '3. Skip OOS Validation to PASSED', outcome: '🔴 FAILED: Allowed skip', pass: false });
  } catch (err) {
    attackResults.push({ attack: '3. Skip OOS Validation to PASSED', outcome: `🟢 BLOCKED: ${err.message}`, pass: true });
  }

  // Attack 4: Use Same Dataset for OOS Validation as Discovery
  controller.promoteToCandidate('HYP-ALPHA-001');
  try {
    controller.preRegisterConfirmatoryOOS('HYP-ALPHA-001', datasetHash); // Same dataset!
    attackResults.push({ attack: '4. Reuse In-Sample Dataset for OOS', outcome: '🔴 FAILED: Allowed in-sample OOS', pass: false });
  } catch (err) {
    attackResults.push({ attack: '4. Reuse In-Sample Dataset for OOS', outcome: `🟢 BLOCKED: ${err.message}`, pass: true });
  }

  // Legitimate OOS Pre-registration with distinct OOS Dataset Hash
  const distinctOosDatasetHash = crypto.createHash('sha256').update('SYNTHETIC_OOS_BTC_2026_DATASET').digest('hex');
  controller.preRegisterConfirmatoryOOS('HYP-ALPHA-001', distinctOosDatasetHash);

  // Attack 5: Transition from OOS back to RUNNING (Attempt to loop and p-hack)
  try {
    controller.startExecution('HYP-ALPHA-001');
    attackResults.push({ attack: '5. Loopback Lifecycle P-Hacking', outcome: '🔴 FAILED: Allowed loopback', pass: false });
  } catch (err) {
    attackResults.push({ attack: '5. Loopback Lifecycle P-Hacking', outcome: `🟢 BLOCKED: ${err.message}`, pass: true });
  }

  // Finalize legitimate OOS
  controller.finalizeOOSValidation('HYP-ALPHA-001', { oosRawPValue: 0.002, passedAllGates: true, oosSummary: { oosNetPnL: 45.0 } });

  console.table(attackResults.map(r => ({ Attack: r.attack, Outcome: r.outcome.slice(0, 75) })));
  const allAttacksBlocked = attackResults.every(r => r.pass);

  // --------------------------------------------------------------------------
  // [2/3] DETERMINISM VALIDATION TEST (3 EXACT REPEATS)
  // --------------------------------------------------------------------------
  console.log('\n[2/3] Executing 3-Repeat Determinism Replay Test...');
  const repeatResults = [];

  for (let rep = 1; rep <= 3; rep++) {
    const replay = runReconciliationTask();
    repeatResults.push({
      repeat: rep,
      configHash: FROZEN_CONFIG_HASH,
      tradesCount: replay.totals.n,
      grossPnL: replay.totals.trueGrossPnL,
      fees: replay.totals.totalFees,
      slippage: replay.totals.totalSlippage,
      netPnL: replay.totals.trueNetPnL,
      profitFactor: replay.totals.netProfitFactor,
      winRate: replay.totals.netWinRatePct
    });
  }

  console.table(repeatResults);

  const isDeterministic = (
    repeatResults[0].grossPnL === repeatResults[1].grossPnL && repeatResults[1].grossPnL === repeatResults[2].grossPnL &&
    repeatResults[0].netPnL === repeatResults[1].netPnL && repeatResults[1].netPnL === repeatResults[2].netPnL &&
    repeatResults[0].profitFactor === repeatResults[1].profitFactor && repeatResults[1].profitFactor === repeatResults[2].profitFactor
  );
  console.log(`Determinism Status: ${isDeterministic ? '🟢 100% IDENTICAL DOWN TO $0.000001' : '🔴 DIVERGENCE DETECTED'}`);

  // --------------------------------------------------------------------------
  // [3/3] CONTROLLER SCALING & MULTIPLE TESTING BENCHMARK (100, 1.000, 10.000)
  // --------------------------------------------------------------------------
  console.log('\n[3/3] Benchmarking Controller Mathematical Scalability (100, 1.000, 10.000 Hypotheses)...');
  const scaleLevels = [100, 1000, 10000];
  const controllerBenchmarks = [];

  for (const count of scaleLevels) {
    const scaleDbPath = resolve(__dirname, `../results/firewall/BENCH_${count}_REGISTRY.json`);
    if (existsSync(scaleDbPath)) unlinkSync(scaleDbPath);
    const benchController = new MultipleTestingController(scaleDbPath, false);

    const familyName = `SCALE_FAMILY_${count}`;
    const t0 = performance.now();

    // 1. Batch Register
    for (let i = 0; i < count; i++) {
      benchController.registerHypothesis({
        hypothesisId: `HYP-${count}-${String(i + 1).padStart(5, '0')}`,
        familyId: familyName,
        config: { p: i },
        datasetHash: 'DATASET_HASH_MOCK',
        seed: i
      });
    }

    // 2. Batch Execution & Results Recording with Simulated p-values
    for (let i = 0; i < count; i++) {
      const id = `HYP-${count}-${String(i + 1).padStart(5, '0')}`;
      benchController.startExecution(id);
      const simulatedP = (i === 0) ? 0.00001 : (i === 1) ? 0.0005 : Number(((i / count) * 0.9 + 0.01).toFixed(5));
      benchController.recordResults(id, { rawPValue: simulatedP, resultsSummary: { netPnL: 10 } });
    }

    benchController.flushToDisk();
    const t1 = performance.now();
    const elapsedMs = t1 - t0;
    const summary = benchController.getFamilySummary(familyName);

    console.log(`   -> Registered & Evaluated ${count.toLocaleString()} Hypotheses in ${elapsedMs.toFixed(1)} ms (${(count / (elapsedMs / 1000)).toFixed(0)} hyp/s)`);
    console.log(`      Bonferroni Alpha: ${summary.bonferroniAlpha} | Significant Raw: ${summary.significantNominal} | Significant Bonferroni: ${summary.significantBonferroni} | Significant FDR: ${summary.significantFDR}`);

    controllerBenchmarks.push({
      hypothesesCount: count,
      elapsedMs: Number(elapsedMs.toFixed(1)),
      hypothesesPerSecond: Number(((count / (elapsedMs / 1000))).toFixed(0)),
      familySummary: summary
    });

    if (existsSync(scaleDbPath)) unlinkSync(scaleDbPath);
  }

  // Cleanup test registry
  if (existsSync(testDbPath)) unlinkSync(testDbPath);

  return {
    allAttacksBlocked,
    isDeterministic,
    attackResults,
    repeatResults,
    controllerBenchmarks
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMultipleTestingAdversarialSuite().catch(err => {
    console.error('Fatal adversarial suite error:', err);
    process.exit(1);
  });
}

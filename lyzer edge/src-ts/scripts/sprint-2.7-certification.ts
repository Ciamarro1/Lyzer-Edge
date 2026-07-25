import assert from 'assert';
import { ExternalFeedAdapter } from '../../src/intelligence/ExternalFeedAdapter.js';
import { CounterfactualEngine, TimelineEvent } from '../../src/intelligence/CounterfactualEngine.js';
import { MetaInsightLayer } from '../../src/intelligence/MetaInsightLayer.js';

async function runCertificationSuite() {
  console.log('================================================================================');
  console.log('  LYZER LABS - SPRINT 2.7 COUNTERFACTUAL ENGINE CERTIFICATION SUITE');
  console.log('================================================================================');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${e.stack || e.message}`);
    }
  }

  // Helper to generate a standardized mock timeline of events
  function generateMockTimeline(length: number = 20): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const baseTime = Date.now() - 3600000 * length;
    for (let i = 0; i < length; i++) {
      events.push({
        id: `evt_${i}`,
        timestamp: baseTime + 3600000 * i,
        expectedEdge: 0.02,        // 2% expected edge
        realizedPnl: i % 2 === 0 ? 300 : -100, // profit on even steps, loss on odd
        migrationCost: 100,         // flat migration cost if taken
        allowed: i % 2 === 0,       // historical decision: allow even, veto odd
        opportunityEntropy: i % 5 === 0 ? 0.75 : 0.35,
        thermodynamicStress: 1.2,
        allocations: { Strat_A: 5000, Strat_B: 5000 }
      });
    }
    return events;
  }

  // D1: External Feed Adapter
  await test('T1: ExternalFeedAdapter Indicator Management', async () => {
    const adapter = new ExternalFeedAdapter();
    adapter.updateContext({
      benchmarkReturn: 0.05,
      marketVolatility: 0.35,
      externalRiskScore: 0.45,
      humanOverrideActive: true
    });

    const snapshot = await adapter.getExternalSnapshot(123456);
    assert.strictEqual(snapshot.timestamp, 123456);
    assert.strictEqual(snapshot.benchmarkReturn, 0.05);
    assert.strictEqual(snapshot.marketVolatility, 0.35);
    assert.strictEqual(snapshot.externalRiskScore, 0.45);
    assert.strictEqual(snapshot.humanOverrideActive, true);
  });

  // D2 & D3 & D10: Counterfactual Replay & SPC Pruning & Seed determinism
  await test('T2: CounterfactualEngine Cascaded Replay & SPC Pruning Checks', () => {
    const engine = new CounterfactualEngine(10000, 3);
    const events = generateMockTimeline(10);

    // Swap index 3 (originally vetoed because k=3 is odd) to ALLOW
    const result = engine.simulateAlternativeHistory(events, 3, 1.5, 15, 'seed-1');
    assert.strictEqual(result.isPruned, false, 'Standard simulation path should not prune');
    assert.ok(result.record.metrics.capitalDelta !== 0, 'Replay must calculate capital difference');

    // Test Negative Capital SPC Pruning: force a massive loss at index 1 to trigger negative equity
    const brokenEvents = [...events];
    brokenEvents[1] = {
      ...brokenEvents[1],
      allowed: false, // historical vetoed -> swapped to allowed in simulation
      realizedPnl: -12000, // exceeds $10k capital
      migrationCost: 100
    };

    const prunedResult = engine.simulateAlternativeHistory(brokenEvents, 1, 1.5, 15, 'seed-1');
    assert.strictEqual(prunedResult.isPruned, true, 'SPC should prune negative capital');
    assert.ok(prunedResult.pruneReason.includes('Negative Capital'), 'Prune reason should specify negative capital');
  });

  // D4: Weighted CCS Score Calculation
  await test('T3: Additive Weighted CCS Calculation', () => {
    const engine = new CounterfactualEngine();
    // Formula: 0.35 * cov + 0.35 * comp + 0.15 * dist + 0.15 * div
    const ccs = engine.calculateWeightedConfidence(0.8, 1.0, 0.5, 0.9);
    const expected = 0.35 * 0.8 + 0.35 * 1.0 + 0.15 * 0.5 + 0.15 * 0.9;
    assert.strictEqual(ccs, Math.round(expected * 10000) / 10000);
  });

  // D5: CSI Perturbation Analysis
  await test('T4: CSI Perturbation & Sensitivity Index Calculation', () => {
    const engine = new CounterfactualEngine(10000, 3);
    const events = generateMockTimeline(10);

    const result = engine.simulateAlternativeHistory(events, 2, 1.5, 15, 'perturb-seed-1');
    assert.strictEqual(result.isPruned, false);
    assert.ok(result.record.sensitivity >= 0, 'CSI score should be positive and evaluated');
  });

  // D6 & D9: Governance Metrics & Lineage Audit
  await test('T5: Governance Metrics (GCR-E, GCR-R, GCE, AOTD) & Lineage Audit', () => {
    const engine = new CounterfactualEngine(10000, 3);
    const events = generateMockTimeline(10);
    const result = engine.simulateAlternativeHistory(events, 3, 1.5, 15, 'audit-seed-1');

    const metrics = result.record.metrics;
    assert.ok(metrics.gcrE >= 0 && metrics.gcrE <= 1.0, 'GCR-E must be bounded [0, 1]');
    assert.ok(metrics.gcrR >= 0 && metrics.gcrR <= 1.0, 'GCR-R must be bounded [0, 1]');
    assert.strictEqual(metrics.gce, Math.round(Math.abs(metrics.gcrE - metrics.gcrR) * 10000) / 10000, 'GCE must match absolute difference');
    assert.ok(metrics.aotd >= 0, 'AOTD must be evaluated and positive');

    // Audit Lineage fields
    const lineage = result.record.lineage;
    assert.strictEqual(lineage.constitutionVersion, '1.5');
    assert.strictEqual(lineage.simulationVersion, '1.0.0');
    assert.ok(lineage.replayTimestamp > 0);
    assert.strictEqual(lineage.sourceEventsSet.length, events.length);
  });

  // D7 & D8: MIL Lock Detector & Persistence Quality Gate
  await test('T6: MIL Future Governance Lock & Persistence Quality Gate', () => {
    const mil = new MetaInsightLayer();
    const engine = new CounterfactualEngine();

    // 1. Verify Persistence quality gate
    const invalidRecord = { confidence: 0.5, sensitivity: 0.1, externalPlausibility: 0.6 }; // fails CCS threshold
    const invalidRecord2 = { confidence: 0.8, sensitivity: 0.4, externalPlausibility: 0.6 }; // fails CSI threshold
    const invalidRecord3 = { confidence: 0.8, sensitivity: 0.2, externalPlausibility: 0.4 }; // fails EPS threshold
    const validRecord = { confidence: 0.75, sensitivity: 0.25, externalPlausibility: 0.6 }; // passes all

    assert.strictEqual(engine.shouldPersistEvidence(invalidRecord as any), false);
    assert.strictEqual(engine.shouldPersistEvidence(invalidRecord2 as any), false);
    assert.strictEqual(engine.shouldPersistEvidence(invalidRecord3 as any), false);
    assert.strictEqual(engine.shouldPersistEvidence(validRecord as any), true);

    // 2. Verify Future Governance Lock conditions
    // Generate histories: 10 consecutive windows of high expected suppression (>60%) and missed alpha (>300)
    const gcrEHistory = Array(10).fill(0.75);
    const missedAlphaHistory = Array(10).fill(400);

    let lockAlertTriggered = false;
    // Set up lock listener
    mil.evaluateFutureGovernanceLock(gcrEHistory, missedAlphaHistory, 10000, 0.75, 0.25, 0.6);
    // Directly check eventBus notification simulation inside evaluateFutureGovernanceLock
    const isLocked = mil.evaluateFutureGovernanceLock(gcrEHistory, missedAlphaHistory, 10000, 0.75, 0.25, 0.6);
    assert.strictEqual(isLocked, true, 'MIL should trigger lock when metrics exceed limit under good quality parameters');

    // Verify low confidence (CCS < 0.6) blocks lock alerts
    const isLockedLowCCS = mil.evaluateFutureGovernanceLock(gcrEHistory, missedAlphaHistory, 10000, 0.5, 0.25, 0.6);
    assert.strictEqual(isLockedLowCCS, false, 'Low CCS must block Future Governance Lock alerts');
  });

  // D10 & D13: Simulation Seed Determinism Replays
  await test('T7: Deterministic Replay Repeatability (Audit Certification)', () => {
    const engine = new CounterfactualEngine(10000, 3);
    const events = generateMockTimeline(15);

    const seed = 'deterministic-seed-test-1234';
    
    // Execute multiple replay simulations with the same seed
    const run1 = engine.simulateAlternativeHistory(events, 4, 1.5, 15, seed);
    const run2 = engine.simulateAlternativeHistory(events, 4, 1.5, 15, seed);

    // Verify bit-identical results
    assert.strictEqual(run1.isPruned, run2.isPruned);
    assert.strictEqual(run1.record.confidence, run2.record.confidence, 'CCS must be identical');
    assert.strictEqual(run1.record.sensitivity, run2.record.sensitivity, 'CSI must be identical');
    assert.strictEqual(run1.record.metrics.capitalDelta, run2.record.metrics.capitalDelta, 'Capital delta must be identical');
    assert.strictEqual(run1.record.metrics.gcrE, run2.record.metrics.gcrE, 'GCR-E must be identical');
    assert.strictEqual(run1.record.metrics.gcrR, run2.record.metrics.gcrR, 'GCR-R must be identical');
  });

  // D12: Adversarial Certification (Regime shifts, corrupt/sparse data, black swans)
  await test('T8: Adversarial Simulation Scenarios', () => {
    const engine = new CounterfactualEngine(10000, 3);
    
    // Test Scenario A: Extreme Black Swan Event
    const blackSwanEvents = generateMockTimeline(5);
    blackSwanEvents[2].realizedPnl = -9500; // Major crash
    const blackSwanResult = engine.simulateAlternativeHistory(blackSwanEvents, 1, 1.5, 15, 'black-swan-seed');
    assert.strictEqual(blackSwanResult.isPruned, false, 'High-divergence extreme paths must NOT be pruned by SPC');

    // Test Scenario B: Invalid Allocation State
    const corruptEvents = generateMockTimeline(5);
    corruptEvents[1].allocations = { Strat_A: 10000, Strat_B: 20000 }; // Exceeds leverage limit sum > 1.5
    const corruptResult = engine.simulateAlternativeHistory(corruptEvents, 0, 1.5, 15, 'corrupt-seed');
    assert.strictEqual(corruptResult.isPruned, true, 'SPC must prune invalid allocation state');
  });

  console.log('================================================================================');
  if (passed === total) {
    console.log(`  🎉 ALL SPRINT 2.7 INTEGRATION AND DETERMINISM TESTS PASSED: ${passed}/${total}`);
    process.exit(0);
  } else {
    console.error(`  🔴 FAILURE: ${total - passed} certification tests failed.`);
    process.exit(1);
  }
}

runCertificationSuite().catch((err) => {
  console.error('Fatal crash in certification suite:', err);
  process.exit(1);
});

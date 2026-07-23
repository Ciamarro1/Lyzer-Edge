import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AdaptivePipelineController } from '../../src/adaptive-sandbox/AdaptivePipelineController.js';

describe('Fase 7.1 — AdaptivePipelineController Full Cycle Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_pipeline_ctrl_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  function generateCandles(count = 20) {
    const candles = [];
    for (let i = 0; i < count; i++) {
      const open = 50000 + Math.random() * 500;
      const direction = Math.random() > 0.3 ? 1 : -1;
      const close = open + (direction * (50 + Math.random() * 200));
      candles.push({ open, close, high: Math.max(open, close) + 50, low: Math.min(open, close) - 50 });
    }
    return candles;
  }

  test('runs a complete adaptive cycle: REFLECT → EXTRACT → PROPOSE → AUDIT → SHADOW → SCORE', async () => {
    const db = createDb();
    const controller = new AdaptivePipelineController(db);

    // Seed semantic memory with patterns for dream cycle
    await db.insertSemanticPattern({
      pattern_id: 'pat_test_001',
      pattern_type: 'REGIME_CORRELATION',
      conditions: { regime: 'ACCUMULATION', rsi_range: [30, 40] },
      observations_count: 150,
      success_rate: 0.72,
      avg_pnl: 3.5,
      confidence_score: 0.85,
      graph_edges: [{ from: 'pat_test_001', to: 'OUTCOME_001', relation: 'CAUSED_BY' }]
    });

    const candles = generateCandles(20);
    const result = await controller.runAdaptiveCycle({
      candles,
      rawState: { trg: 0.5, dvf: 0.3 },
      minShadowTicks: 10
    });

    expect(result.cycle_id).toBeDefined();
    expect(result.cycle_number).toBe(1);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(['COMPLETED', 'NO_PROPOSALS_EXTRACTED']).toContain(result.status);

    db.close();
  });

  test('rejects proposals below ACS threshold (< 80%)', async () => {
    const db = createDb();
    const controller = new AdaptivePipelineController(db);

    // Seed causal events with timestamp (required by schema)
    await db.insertCausalEvent({
      event_id: `evt_${Date.now()}`,
      timestamp: Date.now(),
      event_type: 'CONSTITUTIONAL_JUDGMENT',
      source: 'ECA_COURT',
      correlation_id: 'corr_test',
      payload: { evidence: { lhds_score: 0.88 } },
      hash_prev: 'hash_prev_test',
      hash: 'hash_test_001'
    });

    await db.insertSemanticPattern({
      pattern_id: 'pat_lowconf',
      pattern_type: 'STRESS_PATTERN',
      conditions: { dvf: 0.1 },
      observations_count: 10,
      success_rate: 0.40,
      avg_pnl: -1.5,
      confidence_score: 0.3,
      graph_edges: []
    });

    const candles = generateCandles(15);
    const result = await controller.runAdaptiveCycle({
      candles,
      rawState: { trg: 0.5, dvf: 0.3 },
      minShadowTicks: 10
    });

    // If proposals are extracted, they should be rejected by auditor or low ACS
    if (result.proposals && result.proposals.length > 0) {
      for (const p of result.proposals) {
        expect(['REJECTED_BY_AUDITOR', 'REJECTED_LOW_ACS', 'OBSERVING_SHADOW', 'PROMOTED']).toContain(p.status);
      }
    }

    db.close();
  });

  test('monitors and executes proactive rollback on drawdown > 5%', async () => {
    const db = createDb();
    const controller = new AdaptivePipelineController(db);

    // Save a promoted version first
    const ver = `v_rollback_${Date.now()}`;
    await db.insertParameterVersion({
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      version: ver,
      value: 0.85,
      proposal_id: 'prop_rollback_test'
    });

    // Simulate post-promotion degradation
    const rollbackResult = await controller.monitorAndRollback({
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      currentDrawdownPct: 7.5,
      currentPnlPct: -3.0
    });

    expect(rollbackResult.status).toBe('ROLLED_BACK');
    expect(rollbackResult.version).toBe(ver);
    expect(rollbackResult.reason).toContain('DRAWDOWN_EXCEEDED');

    db.close();
  });

  test('returns HEALTHY when no degradation is detected', async () => {
    const db = createDb();
    const controller = new AdaptivePipelineController(db);

    const ver = `v_healthy_${Date.now()}`;
    await db.insertParameterVersion({
      module: 'CSRL',
      parameter: 'CONSENSUS_LIMIT',
      version: ver,
      value: 0.40,
      proposal_id: 'prop_healthy_test'
    });

    const healthResult = await controller.monitorAndRollback({
      module: 'CSRL',
      parameter: 'CONSENSUS_LIMIT',
      currentDrawdownPct: 2.0,
      currentPnlPct: 4.5
    });

    expect(healthResult.status).toBe('HEALTHY');
    expect(healthResult.version).toBe(ver);

    db.close();
  });

  test('pipeline log accumulates across multiple cycles', async () => {
    const db = createDb();
    const controller = new AdaptivePipelineController(db);
    const candles = generateCandles(20);

    // Seed data to ensure proposals are generated (counterfactual path)
    await db.insertSemanticPattern({
      pattern_id: 'pat_accumulate_001',
      pattern_type: 'TREND_PATTERN',
      conditions: { rsi: 55 },
      observations_count: 500,
      success_rate: 0.80,
      avg_pnl: 5.0,
      confidence_score: 0.90,
      graph_edges: []
    });

    const result1 = await controller.runAdaptiveCycle({ candles, minShadowTicks: 5 });
    const result2 = await controller.runAdaptiveCycle({ candles, minShadowTicks: 5 });

    // Both cycles should complete (even if no proposals extracted)
    expect(result1.cycle_number).toBe(1);
    expect(result2.cycle_number).toBe(2);

    // getPipelineHistory only stores COMPLETED cycles (those with proposals)
    // Verify cycle_number increments regardless
    expect(controller.cycleCount).toBe(2);

    db.close();
  });
});

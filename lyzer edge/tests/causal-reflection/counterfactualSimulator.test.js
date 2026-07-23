import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';
import { CounterfactualSimulator } from '../../src/causal-reflection/CounterfactualSimulator.js';

describe('Fase 6.6 — CounterfactualSimulator Verification', () => {
  test('simulates counterfactual what-if scenarios on historical judgments', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_counterfactual_sim.db');
    const adapter = new CausalMemoryAdapter(db);
    const simulator = new CounterfactualSimulator(db);
    const correlationId = `sim_test_${Date.now()}`;

    // Record judgments with different LHDS evidence
    await adapter.recordJudgment({ symbol: 'BTCUSDT', judgmentType: 'ALLOW', evidence: { lhds_score: 0.88 }, correlationId });
    await adapter.recordJudgment({ symbol: 'BTCUSDT', judgmentType: 'ALLOW', evidence: { lhds_score: 0.92 }, correlationId });

    const sim = await simulator.runSimulation({
      hypotheticalParameter: 'LHDS_VETO_LIMIT',
      baselineValue: 0.90,
      testValue: 0.85
    });

    expect(sim.simulation_id).toBeDefined();
    expect(sim.events_analyzed).toBe(2);
    expect(sim.baseline_vetoes).toBe(1); // lhds 0.92 > 0.90
    expect(sim.test_vetoes).toBe(2);     // lhds 0.88 > 0.85 and 0.92 > 0.85
    expect(sim.veto_delta).toBe(1);

    db.close();
  });
});

import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { ReflectionEngine } from '../../src/causal-reflection/ReflectionEngine.js';

describe('Fase 6.6 — ReflectionEngine Verification', () => {
  test('executes offline dream cycle and generates metacognitive report', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_reflection_engine.db');
    const engine = new ReflectionEngine(db);

    // Save a semantic pattern to test decay
    await db.insertSemanticPattern({
      pattern_id: 'PAT_REFLECTION_TEST',
      pattern_type: 'TEST_PATTERN',
      conditions: {},
      observations_count: 600,
      success_rate: 0.9,
      avg_pnl: 4.0,
      confidence_score: 0.95,
      graph_edges: []
    });

    const report = await engine.runDreamCycle();
    expect(report.report_id).toBeDefined();
    expect(report.title).toContain('Metacognição');
    expect(report.simulations).toHaveLength(1);
    expect(report.decayed_patterns).toHaveLength(1);

    db.close();
  });
});

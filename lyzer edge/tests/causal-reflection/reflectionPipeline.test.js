import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalReflectionFacade } from '../../src/causal-reflection/index.js';

describe('Fase 6.6 — Causal Reflection Full Pipeline Verification', () => {
  test('executes end-to-end metacognitive reflection cycle', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_reflection_pipeline.db');
    const reflectionFacade = new CausalReflectionFacade(db);

    const report = await reflectionFacade.runDreamCycle();
    expect(report.report_id).toBeDefined();
    expect(report.recommendation).toBeDefined();

    db.close();
  });
});

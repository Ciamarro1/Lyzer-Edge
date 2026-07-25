import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { EmpiricalValidationFacade } from '../../src/empirical-validation/index.js';

describe('Fase 9 — Full Empirical Validation Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_emp_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('validates candidate through full empirical pipeline: Empirical → Statistical → CES → WFV → Maturation', () => {
    const db = createDb();
    const facade = new EmpiricalValidationFacade(db, { minSampleSize: 10 });

    const candidate = {
      candidate_id: 'cand_full_001',
      target_parameter: 'TruthKernel.LHDS_VETO_LIMIT',
      proposed_value: 0.85
    };

    const occurrences = [
      { pnl: 2.5, regime: 'REGIME_A' }, { pnl: 1.8, regime: 'REGIME_A' }, { pnl: 2.1, regime: 'REGIME_A' },
      { pnl: 1.5, regime: 'REGIME_B' }, { pnl: 1.9, regime: 'REGIME_B' }, { pnl: 2.0, regime: 'REGIME_B' },
      { pnl: 1.2, regime: 'REGIME_C' }, { pnl: 1.6, regime: 'REGIME_C' }, { pnl: 2.2, regime: 'REGIME_C' },
      { pnl: 1.7, regime: 'REGIME_A' }, { pnl: 1.9, regime: 'REGIME_B' }, { pnl: 2.4, regime: 'REGIME_C' }
    ];

    const regimeBreakdown = {
      REGIME_A: [2.5, 1.8, 2.1, 1.7],
      REGIME_B: [1.5, 1.9, 2.0, 1.9],
      REGIME_C: [1.2, 1.6, 2.2, 2.4]
    };

    const result = facade.validateCandidate({
      candidate,
      occurrences,
      regimeBreakdown
    });

    expect(result.is_approved_for_sandbox).toBe(true);
    expect(result.ces_score.verdict).toBe('PROVEN');
    expect(result.walk_forward_validation.is_passed).toBe(true);
    expect(result.knowledge_maturation.current_stage).toBe('VALIDATED');

    db.close();
  });
});

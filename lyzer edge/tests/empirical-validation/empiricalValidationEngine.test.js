import { describe, test, expect } from 'vitest';
import { EmpiricalValidationEngine } from '../../src/empirical-validation/EmpiricalValidationEngine.js';

describe('Fase 9 — EmpiricalValidationEngine Verification', () => {
  test('evaluates occurrences dataset to compute empirical statistics', () => {
    const engine = new EmpiricalValidationEngine();

    const occurrences = [
      { pnl: 2.5, regime: 'REGIME_A' },
      { pnl: 1.5, regime: 'REGIME_A' },
      { pnl: 3.0, regime: 'REGIME_B' },
      { pnl: -1.0, regime: 'REGIME_B' },
      { pnl: 2.0, regime: 'REGIME_C' }
    ];

    const result = engine.evaluate({ candidate_id: 'cand_test_1' }, occurrences);

    expect(result.status).toBe('EMPIRICALLY_VIABLE');
    expect(result.sample_size).toBe(5);
    expect(result.mean_pnl).toBeGreaterThan(1.5);
    expect(result.win_rate).toBe(0.8);
    expect(result.failure_rate).toBe(0.2);
  });
});

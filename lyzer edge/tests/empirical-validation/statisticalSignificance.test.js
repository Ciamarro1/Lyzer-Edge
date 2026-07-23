import { describe, test, expect } from 'vitest';
import { StatisticalSignificanceEngine } from '../../src/empirical-validation/StatisticalSignificanceEngine.js';

describe('Fase 9 — StatisticalSignificanceEngine Verification', () => {
  test('evaluates 95% confidence interval and regime Sharpe stability', () => {
    const engine = new StatisticalSignificanceEngine({ minSampleSize: 10 });

    const empiricalSummary = {
      sample_size: 20,
      mean_pnl: 2.0,
      std_dev: 0.5
    };

    const regimeBreakdown = {
      REGIME_A_CONSENSUS: [2.5, 2.0, 1.8],
      REGIME_B_DIVERGENT: [1.5, 1.2, 1.9]
    };

    const result = engine.evaluateSignificance(empiricalSummary, regimeBreakdown);

    expect(result.is_statistically_significant).toBe(true);
    expect(result.sample_size_adequate).toBe(true);
    expect(result.confidence_interval_95.is_positive).toBe(true);
    expect(result.confidence_interval_95.lower).toBeGreaterThan(0);
    expect(result.regime_sharpe_stability.is_stable).toBe(true);
  });
});

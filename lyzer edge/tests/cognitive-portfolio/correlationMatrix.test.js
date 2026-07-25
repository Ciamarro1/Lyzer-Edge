import { describe, test, expect } from 'vitest';
import { CorrelationMatrixEngine } from '../../src/cognitive-portfolio/CorrelationMatrixEngine.js';

describe('Fase 10.2 — CorrelationMatrixEngine Verification', () => {
  test('computes pairwise return correlation matrix and detects high correlation risk', () => {
    const engine = new CorrelationMatrixEngine({ highCorrelationThreshold: 0.70 });

    const returnsMap = {
      'STRAT_A': [1.0, 2.0, 3.0, 4.0, 5.0],
      'STRAT_B': [0.9, 2.1, 2.8, 4.2, 4.9], // highly correlated with A
      'STRAT_C': [-1.0, 0.5, -2.0, 1.0, -3.0] // uncorrelated / negatively correlated
    };

    const result = engine.computeMatrix(returnsMap);

    expect(result.matrix['STRAT_A']['STRAT_B']).toBeGreaterThan(0.9);
    expect(result.has_high_correlation_risk).toBe(true);
    expect(result.high_correlation_pairs.length).toBe(1);
    expect(result.high_correlation_pairs[0].strategy_a).toBe('STRAT_A');
    expect(result.high_correlation_pairs[0].strategy_b).toBe('STRAT_B');
  });
});

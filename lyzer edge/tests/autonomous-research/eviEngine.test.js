import { describe, test, expect } from 'vitest';
import { ExpectedValueInfoEngine } from '../../src/autonomous-research/ExpectedValueInfoEngine.js';

describe('Fase 15 — ExpectedValueInfoEngine Verification', () => {
  test('calculates EVI score and classifies HIGH_EVI_PRIORITY proposals', () => {
    const engine = new ExpectedValueInfoEngine();

    const result = engine.evaluateEVI({
      id: 'prop_01',
      potential_alpha_gain: 0.60,
      uncertainty_level: 0.90,
      estimated_compute_cost_units: 5.0
    });

    expect(result.evi_score).toBeGreaterThan(5.0);
    expect(result.priority).toBe('HIGH_EVI_PRIORITY');
    expect(result.is_worth_executing).toBe(true);
  });
});

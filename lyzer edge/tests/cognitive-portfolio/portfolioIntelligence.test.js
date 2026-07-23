import { describe, test, expect } from 'vitest';
import { PortfolioIntelligenceEngine } from '../../src/cognitive-portfolio/PortfolioIntelligenceEngine.js';

describe('Fase 10 — PortfolioIntelligenceEngine Verification', () => {
  test('computes Cognitive Allocation Score (CAS) and categorizes into CORE_ALLOCATION zone', () => {
    const engine = new PortfolioIntelligenceEngine();

    const genome = {
      strategy_id: 'SMC_V1',
      ces_score: 95.0,
      ehs_score: 92.0,
      regime_affinity: ['REGIME_A_CONSENSUS'],
      risk_profile: 'LOW'
    };

    const result = engine.calculateCAS(genome, 'REGIME_A_CONSENSUS');

    expect(result.cas).toBeGreaterThanOrEqual(90.0);
    expect(result.zone).toBe('CORE_ALLOCATION');
    expect(result.category).toBe('HIGH_PRIORITY');
    expect(result.is_allocatable).toBe(true);
  });
});

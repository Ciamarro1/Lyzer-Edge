import { describe, test, expect } from 'vitest';
import { StrategyGenomeRegistry } from '../../src/cognitive-portfolio/StrategyGenomeRegistry.js';

describe('Fase 10.1 — StrategyGenomeRegistry Verification', () => {
  test('registers strategy genome and queries by regime', () => {
    const registry = new StrategyGenomeRegistry();

    const g1 = registry.registerGenome({
      strategy_id: 'SMC_LHDS_V4',
      name: 'SMC LHDS Breakout',
      hypothesis: 'Liquidity compression breakout',
      ces_score: 94.0,
      ehs_score: 91.0,
      maturity_level: 'ESTABLISHED',
      regime_affinity: ['REGIME_A_CONSENSUS', 'REGIME_C_CRISIS'],
      risk_profile: 'MEDIUM'
    });

    expect(g1.strategy_id).toBe('SMC_LHDS_V4');
    expect(registry.getAllGenomes().length).toBe(1);

    const crisisGenomes = registry.getGenomesByRegime('REGIME_C_CRISIS');
    expect(crisisGenomes.length).toBe(1);
    expect(crisisGenomes[0].strategy_id).toBe('SMC_LHDS_V4');
  });
});

import { describe, test, expect } from 'vitest';
import { RegimeAllocationEngine } from '../../src/cognitive-portfolio/RegimeAllocationEngine.js';

describe('Fase 10.3 — RegimeAllocationEngine Verification', () => {
  test('allocates capital and cash reserve according to market regime', () => {
    const engine = new RegimeAllocationEngine();

    const genomes = [
      { strategy_id: 'SMC_CRISIS', name: 'Crisis Strat', regime_affinity: ['REGIME_C_CRISIS'] },
      { strategy_id: 'TREND_CONSENSUS', name: 'Trend Strat', regime_affinity: ['REGIME_A_CONSENSUS'] }
    ];

    const crisisResult = engine.allocateForRegime('REGIME_C_CRISIS', genomes);
    expect(crisisResult.cash_reserve_pct).toBe(40.0);
    expect(crisisResult.allocations.length).toBe(1);
    expect(crisisResult.allocations[0].strategy_id).toBe('SMC_CRISIS');

    const consensusResult = engine.allocateForRegime('REGIME_A_CONSENSUS', genomes);
    expect(consensusResult.cash_reserve_pct).toBe(10.0);
    expect(consensusResult.allocations.length).toBe(1);
    expect(consensusResult.allocations[0].strategy_id).toBe('TREND_CONSENSUS');
  });
});

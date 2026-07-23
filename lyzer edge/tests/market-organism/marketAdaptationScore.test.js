import { describe, test, expect } from 'vitest';
import { MarketAdaptationScore } from '../../src/market-organism/MarketAdaptationScore.js';

describe('Fase 11.5 — MarketAdaptationScore (MAS) Verification', () => {
  test('calculates ADAPTIVE_ORGANISM zone when ecology and alpha survival are strong', () => {
    const scorer = new MarketAdaptationScore();

    const result = scorer.calculate({
      ecologyReport: { volatility_state: 'NORMAL', liquidity_state: 'NORMAL' },
      competitionReport: { top_fitness_score: 90.0 },
      decayReports: [{ status: 'ACTIVE' }, { status: 'ACTIVE' }],
      mutationRate: 0.90
    });

    expect(result.mas).toBeGreaterThanOrEqual(90.0);
    expect(result.zone).toBe('ADAPTIVE_ORGANISM');
    expect(result.is_adaptive).toBe(true);
  });

  test('triggers EVOLUTION_REQUIRED when MAS drops below 50', () => {
    const scorer = new MarketAdaptationScore();

    const result = scorer.calculate({
      ecologyReport: { volatility_state: 'EXTREME', liquidity_state: 'LIQUIDITY_VACUUM' },
      competitionReport: { top_fitness_score: 30.0 },
      decayReports: [{ status: 'OBSOLETE' }, { status: 'OBSOLETE' }],
      mutationRate: 0.10
    });

    expect(result.mas).toBeLessThan(50.0);
    expect(result.zone).toBe('EVOLUTION_REQUIRED');
    expect(result.requires_mutation).toBe(true);
  });
});

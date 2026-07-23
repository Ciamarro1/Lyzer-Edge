import { describe, test, expect } from 'vitest';
import { EvolutionHealthScore } from '../../src/evolution-governance/EvolutionHealthScore.js';

describe('Fase 7.4 — EvolutionHealthScore Verification', () => {
  test('calculates HEALTHY status when EHS >= 90', () => {
    const scorer = new EvolutionHealthScore();

    const result = scorer.calculate({
      totalPromotions: 20,
      totalRollbacks: 1,
      totalRejections: 5,
      avgPnlDeltaPct: 3.5,
      unhandledVetoesCount: 0
    });

    expect(result.ehs).toBeGreaterThanOrEqual(90);
    expect(result.status).toBe('HEALTHY');
    expect(result.is_healthy).toBe(true);
    expect(result.action_required).toBe('NONE');
  });

  test('calculates CRITICAL_EVOLUTION_HALT status when EHS < 75', () => {
    const scorer = new EvolutionHealthScore();

    const result = scorer.calculate({
      totalPromotions: 10,
      totalRollbacks: 8,
      totalRejections: 15,
      avgPnlDeltaPct: -4.0,
      unhandledVetoesCount: 2
    });

    expect(result.ehs).toBeLessThan(75);
    expect(result.status).toBe('CRITICAL_EVOLUTION_HALT');
    expect(result.is_halted).toBe(true);
    expect(result.action_required).toBe('FREEZE_PROMOTIONS');
  });

  test('calculates MODERATE_DEGRADATION status when EHS is between 75 and 90', () => {
    const scorer = new EvolutionHealthScore();

    const result = scorer.calculate({
      totalPromotions: 10,
      totalRollbacks: 2,
      totalRejections: 5,
      avgPnlDeltaPct: 0.5,
      unhandledVetoesCount: 0
    });

    expect(result.ehs).toBeGreaterThanOrEqual(75);
    expect(result.ehs).toBeLessThan(90);
    expect(result.status).toBe('MODERATE_DEGRADATION');
    expect(result.action_required).toBe('INCREASE_OBSERVATION_WINDOW');
  });
});

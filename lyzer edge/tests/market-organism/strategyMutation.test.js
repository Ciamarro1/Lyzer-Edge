import { describe, test, expect } from 'vitest';
import { StrategyMutationEngine } from '../../src/market-organism/StrategyMutationEngine.js';

describe('Fase 11.4 — StrategyMutationEngine Verification', () => {
  test('generates mutated child strategy genome with incremented mutation count', () => {
    const engine = new StrategyMutationEngine();

    const parent = {
      strategy_id: 'SMC_V1',
      name: 'SMC Breakout V1',
      ces_score: 90.0,
      mutations_count: 0,
      regime_affinity: ['REGIME_A_CONSENSUS']
    };

    const child = engine.mutate(parent, {
      target_parameter: 'TruthKernel.LHDS_VETO_LIMIT',
      shift_pct: 12.0,
      added_filter: 'VOLATILITY_FILTER'
    });

    expect(child.strategy_id).toBe('SMC_V1_m1');
    expect(child.parent_strategy_id).toBe('SMC_V1');
    expect(child.mutations_count).toBe(1);
    expect(child.maturity_level).toBe('HYPOTHESIS');
    expect(child.mutation_details.added_filter).toBe('VOLATILITY_FILTER');
  });
});

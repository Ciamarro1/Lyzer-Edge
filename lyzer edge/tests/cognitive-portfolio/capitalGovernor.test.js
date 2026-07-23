import { describe, test, expect } from 'vitest';
import { CapitalAllocationGovernor } from '../../src/cognitive-portfolio/CapitalAllocationGovernor.js';

describe('Fase 10.4 — CapitalAllocationGovernor Verification', () => {
  test('caps single strategy exposure at 30% and rejects allocations with low CAS (< 50)', () => {
    const governor = new CapitalAllocationGovernor({ maxSingleStrategyExposurePct: 30.0, minCasThreshold: 50.0 });

    const proposed = [
      { strategy_id: 'STRAT_HIGH_PROPOSED', cas_score: 95.0, proposed_allocation_pct: 45.0 },
      { strategy_id: 'STRAT_LOW_CAS', cas_score: 35.0, proposed_allocation_pct: 20.0 }
    ];

    const result = governor.govern(proposed, 100000);

    expect(result.status).toBe('GOVERNED_ALLOCATION_APPROVED');
    expect(result.approved_allocations.length).toBe(1);
    expect(result.approved_allocations[0].strategy_id).toBe('STRAT_HIGH_PROPOSED');
    expect(result.approved_allocations[0].approved_allocation_pct).toBe(30.0); // capped from 45%
    expect(result.approved_allocations[0].was_capped).toBe(true);

    expect(result.rejected_allocations.length).toBe(1);
    expect(result.rejected_allocations[0].strategy_id).toBe('STRAT_LOW_CAS');
  });
});

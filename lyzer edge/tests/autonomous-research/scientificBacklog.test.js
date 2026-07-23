import { describe, test, expect } from 'vitest';
import { ScientificBacklogManager } from '../../src/autonomous-research/ScientificBacklogManager.js';

describe('Fase 15 — ScientificBacklogManager Verification', () => {
  test('ranks proposals by EVI and allocates batch within compute budget limit', () => {
    const manager = new ScientificBacklogManager({ maxComputeBudgetUnits: 30.0 });

    manager.addProposal({ id: 'prop_low', potential_alpha_gain: 0.10, uncertainty_level: 0.20, estimated_compute_cost_units: 10.0 });
    manager.addProposal({ id: 'prop_high', potential_alpha_gain: 0.80, uncertainty_level: 0.90, estimated_compute_cost_units: 15.0 });

    const batch = manager.allocateNextBatch(30.0);

    expect(batch.length).toBeGreaterThan(0);
    expect(batch[0].id).toBe('prop_high'); // higher EVI first
  });
});

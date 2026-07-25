import { describe, test, expect } from 'vitest';
import { ParameterProposalEngine } from '../../src/adaptive-sandbox/ParameterProposalEngine.js';

describe('Fase 7.0.1 — ParameterProposalEngine Verification', () => {
  test('creates ParameterProposal object with boundary clamping (max +/- 15%)', () => {
    const engine = new ParameterProposalEngine();

    // Propose 0.70 from 0.90 (-22.2% variation -> clamped to -15% = 0.765)
    const proposal = engine.createProposal({
      module: 'CSRL',
      parameter: 'LHDS_THRESHOLD',
      currentValue: 0.90,
      proposedValue: 0.70,
      reason: { hypothesis: 'test_clamping' }
    });

    expect(proposal.proposal_id).toBeDefined();
    expect(proposal.clamped_variation_pct).toBeGreaterThan(15.0);
    expect(proposal.proposed_value).toBe(0.765); // Clamped
    expect(proposal.status).toBe('PENDING_SANDBOX');
  });
});

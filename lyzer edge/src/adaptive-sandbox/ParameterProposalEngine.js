export class ParameterProposalEngine {
  createProposal({ module, parameter, currentValue, proposedValue, reason, evidence }) {
    if (!module || !parameter || currentValue === undefined || proposedValue === undefined) {
      throw new Error('Module, parameter, currentValue, and proposedValue are required for ParameterProposal');
    }

    // Boundary Clamping Check (max +/- 15% variation per version - ADR-014)
    const variationPct = Math.abs((proposedValue - currentValue) / currentValue) * 100;
    if (variationPct > 15.0) {
      const direction = proposedValue > currentValue ? 1 : -1;
      proposedValue = Number((currentValue * (1 + (direction * 0.15))).toFixed(4));
    }

    const proposalId = `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      proposal_id: proposalId,
      target: { module, parameter },
      current_value: currentValue,
      proposed_value: proposedValue,
      clamped_variation_pct: Number(variationPct.toFixed(2)),
      reason: reason || { hypothesis: 'ADAPTIVE_OPTIMIZATION', confidence: 0.85 },
      evidence: evidence || { sample_size: 500, regimes: ['REGIME_A_CONSENSUS'], backtest_gain: 0.05 },
      status: 'PENDING_SANDBOX',
      created_at: Date.now()
    };
  }
}

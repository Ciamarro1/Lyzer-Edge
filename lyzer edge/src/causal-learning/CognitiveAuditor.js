export class CognitiveAuditor {
  auditProposal(proposal) {
    if (!proposal || !proposal.proposal_id) {
      throw new Error('Invalid proposal: proposal_id is required');
    }

    const rejectionReasons = [];

    // Check 1: Minimum Sample Requirement (N >= 500)
    if ((proposal.evidence_count || 0) < 500) {
      rejectionReasons.push(`INSUFFICIENT_SAMPLE: evidence count (${proposal.evidence_count || 0}) is below threshold 500`);
    }

    // Check 2: Expected PnL Improvement (> +5%)
    if ((proposal.expected_pnl_improvement_pct || 0) <= 5.0) {
      rejectionReasons.push(`NEGLIGIBLE_IMPROVEMENT: expected PnL improvement (${proposal.expected_pnl_improvement_pct || 0}%) is <= 5%`);
    }

    // Check 3: Multi-regime Stability
    if (proposal.multi_regime_stable === false) {
      rejectionReasons.push(`REGIME_OVERFITTING: pattern is not verified across multiple regimes`);
    }

    // Check 4: Constitutional Violations (ADR-010 invariants)
    if (proposal.constitutional_violation === true) {
      rejectionReasons.push(`CONSTITUTIONAL_VIOLATION: proposal attempts to modify an immutable constitutional invariant`);
    }

    // Check 5: Temporal Decay Test
    if (proposal.temporal_decay_detected === true) {
      rejectionReasons.push(`TEMPORAL_DECAY: pattern effectiveness degraded in recent 30-day window`);
    }

    const approved = rejectionReasons.length === 0;

    return {
      proposal_id: proposal.proposal_id,
      approved,
      status: approved ? 'APPROVED' : 'REJECTED',
      rejection_reasons: rejectionReasons,
      audited_at: Date.now()
    };
  }
}

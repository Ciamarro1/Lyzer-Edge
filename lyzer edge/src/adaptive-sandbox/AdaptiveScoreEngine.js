export class AdaptiveScoreEngine {
  calculateACS({ historicalStability, riskRewardGain, multiRegimeConsistency, absenceOfConflicts, recencyScore }) {
    // ACS Weighted Average Formula (ADR-015):
    // 30% Historical Stability + 25% RiskReward Gain + 20% MultiRegime + 15% Absence of Conflicts + 10% Recency
    const hs = Math.min(1.0, Math.max(0, historicalStability || 0.8));
    const rr = Math.min(1.0, Math.max(0, riskRewardGain || 0.85));
    const mr = Math.min(1.0, Math.max(0, multiRegimeConsistency || 0.9));
    const ac = Math.min(1.0, Math.max(0, absenceOfConflicts || 0.95));
    const rc = Math.min(1.0, Math.max(0, recencyScore || 0.9));

    const weightedScore = (hs * 0.30) + (rr * 0.25) + (mr * 0.20) + (ac * 0.15) + (rc * 0.10);
    const acsPct = Number((weightedScore * 100).toFixed(2));

    let actionStatus = 'OBSERVING_SHADOW';
    if (acsPct < 80.0) {
      actionStatus = 'REJECTED_LOW_ACS';
    } else if (acsPct >= 95.0) {
      actionStatus = 'SUBMITTED_TO_ECA';
    }

    return {
      acs_score: acsPct,
      action_status: actionStatus,
      is_eligible_for_eca: acsPct >= 95.0,
      is_rejected: acsPct < 80.0
    };
  }
}

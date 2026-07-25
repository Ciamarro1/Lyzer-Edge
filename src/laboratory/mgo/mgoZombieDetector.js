/**
 * Meta-Governance Observatory (MGO)
 * Module: Zombie State Detector
 * 
 * Detects if the system achieved Survival at the cost of Value Generation
 * (e.g., Drawdown = 0 because Risk Allocation = 0 over extended periods).
 */

class MgoZombieDetector {
  /**
   * Evaluates the system's performance history for zombie states.
   * @param {Array} metrics Array of period objects: { periodId, drawdown, riskAllocation, valueGenerated }
   * @returns {Object|null} Alert object if zombie state detected, else null.
   */
  static analyze(metrics) {
    if (!Array.isArray(metrics) || metrics.length < 12) {
      return null; // Require at least a dozen periods to detect a trend
    }

    let zeroRiskPeriods = 0;
    let zeroDrawdownPeriods = 0;
    let totalValueGenerated = 0;

    for (const metric of metrics) {
      if (metric.riskAllocation === 0) zeroRiskPeriods++;
      if (metric.drawdown === 0) zeroDrawdownPeriods++;
      totalValueGenerated += metric.valueGenerated || 0;
    }

    const zombieRatio = zeroRiskPeriods / metrics.length;
    
    // Detection logic: significant periods with 0 risk leading to 0 drawdown and stagnation
    if (zombieRatio >= 0.75 && totalValueGenerated <= 0) { 
      let severity = 'MEDIUM';
      if (zombieRatio >= 0.90) severity = 'HIGH';
      if (zombieRatio >= 0.98) severity = 'CRITICAL';
      
      const confidence = Math.min(zombieRatio * 100, 99.9);

      return {
        threat_type: 'ZOMBIE_STATE',
        confidence: Number(confidence.toFixed(2)),
        severity: severity,
        evidence: {
          analyzed_periods: metrics.length,
          zero_risk_periods: zeroRiskPeriods,
          zero_drawdown_periods: zeroDrawdownPeriods,
          total_value_generated: totalValueGenerated,
          zombie_ratio: Number(zombieRatio.toFixed(4))
        },
        projected_cost: 'Opportunity cost equivalent to benchmark returns over analyzed period.',
        projected_survival_impact: 'High long-term risk of systemic irrelevance due to value stagnation.'
      };
    }

    return null;
  }
}

module.exports = { MgoZombieDetector };

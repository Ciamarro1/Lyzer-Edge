/**
 * @fileoverview Adaptive Regime Policy Engine for Lyzer Edge
 * Dynamically selects the optimal quantitative filter policy based on real-time market regime:
 * - TRENDING: Enforces H4 Trend Alignment + M15 Structure Confirmation
 * - RANGING: Disables static H4 trend (allows SMC reversal sweeps) + Elevates TRG Threshold to 0.60
 * - HIGH_VOLATILITY: Activates Cooldown + Strict TRG Asymmetry
 */

export class AdaptiveRegimePolicy {
  constructor(config = {}) {
    this.defaultPolicy = {
      featureH4: false,
      featureStructure: false,
      trgThreshold: 0.40,
      policyName: 'BASELINE'
    };
  }

  /**
   * Evaluates current market regime and returns optimal dynamic policy configuration.
   * @param {Object} regimeData - { trendBias, volatilityAtr, timeframeRatio, trg }
   * @returns {Object} Policy configuration
   */
  selectPolicy(regimeData = {}) {
    const { trendBias = 'NEUTRAL', volatilityAtr = 1.0, trg = 0.45 } = regimeData;

    // 1. High Volatility Churn Regime -> Strict Preservation
    if (volatilityAtr > 2.0) {
      return {
        featureH4: true,
        featureStructure: true,
        trgThreshold: 0.65,
        policyName: 'HIGH_VOLATILITY_PRESERVATION'
      };
    }

    // 2. RANGING Consolidation Regime -> Allow SMC Reversals + Elevate TRG
    if (trendBias === 'NEUTRAL' || trendBias === 'SIDEWAYS') {
      return {
        featureH4: false, // Do not block counter-trend sweeps in ranging market
        featureStructure: true, // Require M15 structure
        trgThreshold: 0.60,
        policyName: 'RANGING_REVERSAL_SWEEP'
      };
    }

    // 3. Strong Trend Regime -> Enforce H4 Alignment
    return {
      featureH4: true,
      featureStructure: true,
      trgThreshold: 0.45,
      policyName: 'TREND_FOLLOWING_CONFLUENCE'
    };
  }
}

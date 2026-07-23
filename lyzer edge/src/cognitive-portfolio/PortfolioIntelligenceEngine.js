/**
 * @fileoverview PortfolioIntelligenceEngine — Phase 10 (ADR-027)
 *
 * Computes Cognitive Allocation Score (CAS ∈ [0, 100%]) for strategy genomes:
 *   CAS = 0.30 * CES + 0.30 * EHS + 0.25 * RegimeFit + 0.15 * RiskEfficiency
 *
 * CAS Zones:
 *   90-100: CORE_ALLOCATION
 *   70-90:  ACTIVE
 *   50-70:  OBSERVATION
 *   < 50:   QUARANTINE
 */
export class PortfolioIntelligenceEngine {
  /**
   * Calculates Cognitive Allocation Score (CAS) for a strategy genome.
   *
   * @param {Object} genome - StrategyGenome object
   * @param {string} currentRegime - Active market regime ID
   * @returns {Object} CAS calculation report
   */
  calculateCAS(genome = {}, currentRegime = 'REGIME_A_CONSENSUS') {
    const ces = genome.ces_score || 70.0;
    const ehs = genome.ehs_score || 80.0;

    // 1. Regime Fit Score (0 - 100)
    const isExactMatch = genome.regime_affinity.includes(currentRegime);
    const isUniversal = genome.regime_affinity.includes('ALL');
    const regimeFit = isExactMatch ? 100 : isUniversal ? 80 : 30;

    // 2. Risk Efficiency Score (0 - 100)
    const riskProfileMap = { LOW: 95, MEDIUM: 80, HIGH: 60 };
    const riskEfficiency = riskProfileMap[genome.risk_profile] || 75;

    // Composite CAS
    const rawCas = (ces * 0.30) + (ehs * 0.30) + (regimeFit * 0.25) + (riskEfficiency * 0.15);
    const cas = Number(Math.min(100, Math.max(0, rawCas)).toFixed(2));

    // Zone & Category
    let zone, category;
    if (cas >= 90.0) {
      zone = 'CORE_ALLOCATION';
      category = 'HIGH_PRIORITY';
    } else if (cas >= 70.0) {
      zone = 'ACTIVE';
      category = 'STANDARD';
    } else if (cas >= 50.0) {
      zone = 'OBSERVATION';
      category = 'PAPER_SHADOW_ONLY';
    } else {
      zone = 'QUARANTINE';
      category = 'ZERO_CAPITAL';
    }

    return {
      strategy_id: genome.strategy_id,
      cas,
      zone,
      category,
      is_allocatable: cas >= 50.0,
      components: {
        ces_score: ces,
        ehs_score: ehs,
        regime_fit: regimeFit,
        risk_efficiency: riskEfficiency
      },
      calculated_at: Date.now()
    };
  }
}

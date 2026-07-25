/**
 * @fileoverview AdaptationRiskScore — Phase 7.2 (ADR-018)
 *
 * Computes the Adaptive Risk Score (ARS) — a composite metric that quantifies
 * the systemic risk of promoting an adaptation.
 *
 * ARS ∈ [0, 100]:
 *   0-30:  SAFE (promotion permitted)
 *   30-60: OBSERVATION (requires more data)
 *   60-80: ECA_REVIEW (requires explicit court approval)
 *   80+:   BLOCKED (promotion forbidden)
 *
 * Components:
 *   30% Impact Severity (from AdaptationImpactAnalyzer)
 *   30% Regime Instability (from RegimeStressEvaluator)
 *   20% Drawdown Risk (max drawdown delta)
 *   20% Exposure Increase (risk exposure delta)
 */
export class AdaptationRiskScore {
  /**
   * Calculates the Adaptive Risk Score (ARS).
   *
   * @param {Object} options
   * @param {Object} options.impactAnalysis - Result from AdaptationImpactAnalyzer.analyze()
   * @param {Object} options.regimeEvaluation - Result from RegimeStressEvaluator.evaluate()
   * @returns {Object} ARS result with score, zone, and recommendation
   */
  calculate({ impactAnalysis = {}, regimeEvaluation = {} }) {
    // 1. Impact Severity Score (0-100)
    const criticalFlags = (impactAnalysis.dimensions_flagged || []).filter(d => d.severity === 'CRITICAL').length;
    const warningFlags = (impactAnalysis.dimensions_flagged || []).filter(d => d.severity === 'WARNING').length;
    const impactSeverity = Math.min(100, (criticalFlags * 40) + (warningFlags * 15));

    // 2. Regime Instability Score (0-100)
    const rss = regimeEvaluation.rss || 0;
    const regimeInstability = regimeEvaluation.is_rejected
      ? 100
      : Math.min(100, Math.max(0, (1 - rss) * 100));

    // 3. Drawdown Risk Score (0-100)
    const ddDelta = Math.abs(impactAnalysis.max_drawdown_delta_pct || 0);
    const drawdownRisk = Math.min(100, ddDelta * 10); // 10% drawdown = score 100

    // 4. Exposure Increase Score (0-100)
    const exposureDelta = Math.max(0, impactAnalysis.risk_exposure_delta_pct || 0);
    const exposureRisk = Math.min(100, exposureDelta * 4); // 25% exposure increase = score 100

    // Weighted ARS
    const arsRaw = (impactSeverity * 0.30) + (regimeInstability * 0.30) + (drawdownRisk * 0.20) + (exposureRisk * 0.20);
    const ars = Number(Math.min(100, Math.max(0, arsRaw)).toFixed(2));

    // Zone classification
    let zone, recommendation;
    if (ars < 30) {
      zone = 'SAFE';
      recommendation = 'PROMOTION_PERMITTED';
    } else if (ars < 60) {
      zone = 'OBSERVATION';
      recommendation = 'REQUIRES_MORE_DATA';
    } else if (ars < 80) {
      zone = 'ECA_REVIEW';
      recommendation = 'REQUIRES_COURT_APPROVAL';
    } else {
      zone = 'BLOCKED';
      recommendation = 'PROMOTION_FORBIDDEN';
    }

    return {
      ars,
      zone,
      recommendation,
      is_promotable: ars < 60,
      is_blocked: ars >= 80,
      components: {
        impact_severity: Number(impactSeverity.toFixed(2)),
        regime_instability: Number(regimeInstability.toFixed(2)),
        drawdown_risk: Number(drawdownRisk.toFixed(2)),
        exposure_risk: Number(exposureRisk.toFixed(2))
      },
      calculated_at: Date.now()
    };
  }
}

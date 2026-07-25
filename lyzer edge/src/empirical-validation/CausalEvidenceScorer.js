/**
 * @fileoverview CausalEvidenceScorer — Phase 9 (ADR-026)
 *
 * Calculates the Causal Evidence Score (CES ∈ [0, 100%]) for any hypothesis or strategy candidate.
 *
 * Formula:
 *   CES = (SampleQuality + RegimeCoverage + TemporalStability + CausalConsistency) / 4
 *
 * Verdict Zones:
 *   CES >= 90: PROVEN (Eligible for accelerated promotion)
 *   70 <= CES < 90: PROMISING (Requires standard sandbox validation)
 *   CES < 70: SPECULATIVE (Rejected)
 */
export class CausalEvidenceScorer {
  /**
   * Calculates the Causal Evidence Score (CES).
   *
   * @param {Object} options
   * @param {Object} options.empiricalSummary - Output from EmpiricalValidationEngine
   * @param {Object} options.statisticalReport - Output from StatisticalSignificanceEngine
   * @param {number} [options.regimesTestedCount] - Number of distinct regimes tested
   * @param {number} [options.timeBlocksTestedCount] - Number of temporal blocks tested
   * @returns {Object} CES calculation report
   */
  calculate({ empiricalSummary = {}, statisticalReport = {}, regimesTestedCount = 1, timeBlocksTestedCount = 1 }) {
    const sampleSize = empiricalSummary.sample_size || 0;
    const minSample = statisticalReport.min_required_sample_size || 500;

    // 1. Sample Quality (0 - 100)
    const sampleQuality = Math.min(100, (sampleSize / minSample) * 100);

    // 2. Regime Coverage (0 - 100)
    const regimeCoverage = Math.min(100, (regimesTestedCount / 3) * 100);

    // 3. Temporal Stability (0 - 100)
    const temporalStability = Math.min(100, (timeBlocksTestedCount / 4) * 100);

    // 4. Causal Consistency (0 - 100)
    const isCiPositive = statisticalReport.confidence_interval_95?.is_positive;
    const winRate = empiricalSummary.win_rate || 0;
    const causalConsistency = isCiPositive ? Math.min(100, winRate * 100 + 20) : Math.max(0, winRate * 50);

    // Composite CES
    const rawCes = (sampleQuality + regimeCoverage + temporalStability + causalConsistency) / 4;
    const ces = Number(Math.min(100, Math.max(0, rawCes)).toFixed(2));

    // Verdict Zones
    let verdict, recommendation;
    if (ces >= 90.0) {
      verdict = 'PROVEN';
      recommendation = 'ACCELERATED_PROMOTION_ELIGIBLE';
    } else if (ces >= 70.0) {
      verdict = 'PROMISING';
      recommendation = 'STANDARD_SANDBOX_REQUIRED';
    } else {
      verdict = 'SPECULATIVE';
      recommendation = 'REJECTED_INSUFFICIENT_EVIDENCE';
    }

    return {
      ces,
      verdict,
      recommendation,
      is_proven: verdict === 'PROVEN',
      is_promising: verdict === 'PROMISING',
      is_rejected: verdict === 'SPECULATIVE',
      components: {
        sample_quality: Number(sampleQuality.toFixed(2)),
        regime_coverage: Number(regimeCoverage.toFixed(2)),
        temporal_stability: Number(temporalStability.toFixed(2)),
        causal_consistency: Number(causalConsistency.toFixed(2))
      },
      calculated_at: Date.now()
    };
  }
}

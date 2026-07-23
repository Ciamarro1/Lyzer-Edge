/**
 * @fileoverview CognitiveTelemetryAggregator — Phase 12 (ADR-029)
 *
 * Aggregates all 6 Cognitive Scores into a unified telemetry payload and calculates
 * the Global Cognitive Health Index (GCHI ∈ [0, 100%]).
 *
 * Scores:
 *   - CCS (Causal Memory Completeness)
 *   - CES (Causal Evidence Score)
 *   - EHS (Evolution Health Score)
 *   - ARS (Adaptive Risk Score)
 *   - CAS (Cognitive Allocation Score)
 *   - MAS (Market Adaptation Score)
 */
export class CognitiveTelemetryAggregator {
  /**
   * Aggregates current scores and metrics into a unified telemetry report.
   *
   * @param {Object} scores
   * @param {number} [scores.ccs] - Causal Memory Completeness (0-100)
   * @param {number} [scores.ces] - Causal Evidence Score (0-100)
   * @param {number} [scores.ehs] - Evolution Health Score (0-100)
   * @param {number} [scores.ars] - Adaptive Risk Score (0-100, where lower is safer)
   * @param {number} [scores.cas] - Cognitive Allocation Score (0-100)
   * @param {number} [scores.mas] - Market Adaptation Score (0-100)
   * @returns {Object} Unified Cognitive Telemetry Report
   */
  aggregate(scores = {}) {
    const ccs = scores.ccs !== undefined ? scores.ccs : 100.0;
    const ces = scores.ces !== undefined ? scores.ces : 85.0;
    const ehs = scores.ehs !== undefined ? scores.ehs : 90.0;
    const ars = scores.ars !== undefined ? scores.ars : 20.0; // low risk = good
    const cas = scores.cas !== undefined ? scores.cas : 80.0;
    const mas = scores.mas !== undefined ? scores.mas : 85.0;

    // Risk Safety Factor from ARS (100 - ARS)
    const riskSafety = Math.max(0, 100 - ars);

    // Global Cognitive Health Index (GCHI)
    const gchiRaw = (ccs * 0.15) + (ces * 0.20) + (ehs * 0.20) + (riskSafety * 0.15) + (cas * 0.15) + (mas * 0.15);
    const gchi = Number(Math.min(100, Math.max(0, gchiRaw)).toFixed(2));

    let systemStatus = 'HEALTHY';
    if (gchi < 60.0 || ars >= 80.0) {
      systemStatus = 'CRITICAL_RISK';
    } else if (gchi < 75.0 || ars >= 50.0) {
      systemStatus = 'ATTENTION_REQUIRED';
    }

    return {
      gchi,
      system_status: systemStatus,
      is_operational: systemStatus === 'HEALTHY',
      scores_snapshot: {
        ccs_causal_memory: ccs,
        ces_evidence: ces,
        ehs_evolution: ehs,
        ars_adaptive_risk: ars,
        cas_allocation: cas,
        mas_adaptation: mas
      },
      aggregated_at: Date.now()
    };
  }
}

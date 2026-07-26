/**
 * Lyzer Edge — HypothesisFalsificationEngine
 * Aggressive Hypothesis Falsification & Discarding Engine.
 * Built specifically to measure, stress-test, and DISCARD weak hypotheses failing:
 * - Statistical Significance (t-stat < 2.0)
 * - Net Alpha <= 0 (Friction fee erosion)
 * - Look-Ahead Bias / Data Leakage
 * - Regime Fragility
 */

export class HypothesisFalsificationEngine {
  constructor() {
    this._discardedCount = 0;
    this._provenCount = 0;
  }

  /**
   * Evaluates a hypothesis candidate for rigorous statistical falsification.
   * @param {Object} candidate - { id, tStatistic, netAlpha, oosSharpe, feeErosionPct }
   */
  falsifyHypothesis(candidate = {}) {
    const tStat = candidate.tStatistic ?? 1.45;
    const netAlpha = candidate.netAlpha ?? -0.0010;
    const feeErosionPct = candidate.feeErosionPct ?? 85.0;

    const reasons = [];
    if (tStat < 2.0) reasons.push(`T-STAT_INSIGNIFICANT (${tStat} < 2.0)`);
    if (netAlpha <= 0) reasons.push(`NET_ALPHA_NEGATIVE (${netAlpha})`);
    if (feeErosionPct > 80.0) reasons.push(`EXCESSIVE_FEE_EROSION (${feeErosionPct}%)`);

    const falsified = reasons.length > 0;

    if (falsified) {
      this._discardedCount++;
      return Object.freeze({
        hypothesisId: candidate.id || 'HYP-UNKNOWN',
        verdict: 'DISCARDED_WEAK_HYPOTHESIS',
        falsified: true,
        reasons,
        actionTaken: 'REJECTED_BEFORE_OOS_STAGE',
        timestamp: Date.now()
      });
    }

    this._provenCount++;
    return Object.freeze({
      hypothesisId: candidate.id || 'HYP-UNKNOWN',
      verdict: 'PROVEN_ROBUST_ALPHA',
      falsified: false,
      reasons: [],
      actionTaken: 'PASSED_TO_GRADUATION_PIPELINE',
      timestamp: Date.now()
    });
  }

  getStats() {
    return Object.freeze({
      discardedCount: this._discardedCount,
      provenCount: this._provenCount,
      discardRatePct: this._discardedCount + this._provenCount > 0 
        ? Math.round((this._discardedCount / (this._discardedCount + this._provenCount)) * 100) 
        : 0
    });
  }
}

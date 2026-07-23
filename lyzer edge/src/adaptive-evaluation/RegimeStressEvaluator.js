/**
 * @fileoverview RegimeStressEvaluator — Phase 7.2 (ADR-020)
 *
 * Tests adaptation stability across multiple market regimes.
 * Enforces:
 *   1. Unanimity Rule: positive PnL in ALL regimes
 *   2. Damage Limit: no regime with PnL < -10%
 *   3. Regime Stability Score (RSS) = 1 - σ(PnL) / (μ(PnL) + ε)
 */
export class RegimeStressEvaluator {
  constructor() {
    this.REGIMES = ['REGIME_A_CONSENSUS', 'REGIME_B_DIVERGENT', 'REGIME_C_CRISIS'];
    this.DAMAGE_LIMIT_PCT = -10.0;
    this.RSS_STABLE_THRESHOLD = 0.7;
    this.RSS_UNSTABLE_THRESHOLD = 0.4;
  }

  /**
   * Evaluates a proposal's performance across all recognized regimes.
   *
   * @param {Object} regimeResults - Map of regime → { pnl_pct, trades, sharpe }
   *   Example: { REGIME_A_CONSENSUS: { pnl_pct: 15 }, REGIME_B_DIVERGENT: { pnl_pct: 8 }, REGIME_C_CRISIS: { pnl_pct: -22 } }
   * @returns {Object} Evaluation result with RSS score and stability verdict
   */
  evaluate(regimeResults = {}) {
    const regimeKeys = Object.keys(regimeResults);
    if (regimeKeys.length === 0) {
      return { status: 'INSUFFICIENT_DATA', rss: 0, regimes_evaluated: 0, violations: [] };
    }

    const pnlValues = regimeKeys.map(k => regimeResults[k].pnl_pct || 0);
    const violations = [];

    // Rule 1: Unanimity — all regimes must have positive PnL
    const negativeRegimes = regimeKeys.filter(k => (regimeResults[k].pnl_pct || 0) <= 0);
    if (negativeRegimes.length > 0) {
      violations.push({
        rule: 'UNANIMITY',
        severity: 'WARNING',
        detail: `Negative PnL in regimes: ${negativeRegimes.join(', ')}`
      });
    }

    // Rule 2: Damage Limit — no regime with PnL < -10%
    const lethalRegimes = regimeKeys.filter(k => (regimeResults[k].pnl_pct || 0) < this.DAMAGE_LIMIT_PCT);
    if (lethalRegimes.length > 0) {
      violations.push({
        rule: 'DAMAGE_LIMIT',
        severity: 'CRITICAL',
        detail: `Lethal PnL (< ${this.DAMAGE_LIMIT_PCT}%) in regimes: ${lethalRegimes.join(', ')}`
      });
    }

    // Rule 3: Regime Stability Score (RSS)
    const mean = pnlValues.reduce((s, v) => s + v, 0) / pnlValues.length;
    const variance = pnlValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / pnlValues.length;
    const stdDev = Math.sqrt(variance);
    const epsilon = 0.01;
    const rss = Number((1 - (stdDev / (Math.abs(mean) + epsilon))).toFixed(4));

    let stabilityVerdict;
    if (lethalRegimes.length > 0) {
      stabilityVerdict = 'REJECTED_LETHAL_REGIME';
    } else if (rss >= this.RSS_STABLE_THRESHOLD) {
      stabilityVerdict = 'STABLE';
    } else if (rss >= this.RSS_UNSTABLE_THRESHOLD) {
      stabilityVerdict = 'UNSTABLE_OBSERVATION';
    } else {
      stabilityVerdict = 'REJECTED_HIGH_VARIANCE';
    }

    return {
      status: stabilityVerdict,
      rss: rss,
      is_stable: stabilityVerdict === 'STABLE',
      is_rejected: stabilityVerdict.startsWith('REJECTED'),
      regimes_evaluated: regimeKeys.length,
      regime_breakdown: regimeKeys.map(k => ({
        regime: k,
        pnl_pct: regimeResults[k].pnl_pct || 0,
        trades: regimeResults[k].trades || 0
      })),
      violations,
      evaluated_at: Date.now()
    };
  }
}

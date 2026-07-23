/**
 * @fileoverview StatisticalSignificanceEngine — Phase 9 (ADR-026)
 *
 * Validates sample size adequacy (N >= 500 by default), calculates 95% Confidence Intervals (95% CI),
 * and evaluates Sharpe stability across multiple market regimes.
 */
export class StatisticalSignificanceEngine {
  constructor(config = {}) {
    this.minSampleSize = config.minSampleSize || 500;
  }

  /**
   * Evaluates statistical significance and computes confidence intervals.
   *
   * @param {Object} empiricalSummary - Output from EmpiricalValidationEngine
   * @param {Object} [regimeBreakdown] - Map of regime -> Array of PnLs ({ REGIME_A: [1.2, 0.8], REGIME_B: [0.5, 0.4] })
   * @returns {Object} Statistical significance report
   */
  evaluateSignificance(empiricalSummary = {}, regimeBreakdown = {}) {
    const n = empiricalSummary.sample_size || 0;
    const mean = empiricalSummary.mean_pnl || 0;
    const stdDev = empiricalSummary.std_dev || 0;

    // 1. Sample Size Adequacy
    const isSampleAdequate = n >= this.minSampleSize;

    // 2. 95% Confidence Interval Calculation
    // CI = mean +- 1.96 * (stdDev / sqrt(N))
    const stdError = n > 0 ? stdDev / Math.sqrt(n) : 0;
    const marginOfError = 1.96 * stdError;
    const ciLower = Number((mean - marginOfError).toFixed(4));
    const ciUpper = Number((mean + marginOfError).toFixed(4));
    const isCiPositive = ciLower > 0;

    // 3. Sharpe Stability across Regimes
    const regimeSharpes = {};
    let isSharpeStableAcrossRegimes = true;
    const regimes = Object.keys(regimeBreakdown);

    if (regimes.length > 0) {
      for (const reg of regimes) {
        const pnls = regimeBreakdown[reg] || [];
        const sharpe = this._computeSharpe(pnls);
        regimeSharpes[reg] = sharpe;
        if (sharpe <= 0) {
          isSharpeStableAcrossRegimes = false;
        }
      }
    }

    const isStatisticallySignificant = isSampleAdequate && isCiPositive && isSharpeStableAcrossRegimes;

    return {
      is_statistically_significant: isStatisticallySignificant,
      sample_size_adequate: isSampleAdequate,
      sample_size: n,
      min_required_sample_size: this.minSampleSize,
      confidence_interval_95: {
        lower: ciLower,
        upper: ciUpper,
        margin_of_error: Number(marginOfError.toFixed(4)),
        is_positive: isCiPositive
      },
      regime_sharpe_stability: {
        is_stable: isSharpeStableAcrossRegimes,
        regime_sharpes: regimeSharpes
      },
      evaluated_at: Date.now()
    };
  }

  _computeSharpe(pnls) {
    if (!pnls || pnls.length < 2) return 0;
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (pnls.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : Number((mean / stdDev).toFixed(4));
  }
}

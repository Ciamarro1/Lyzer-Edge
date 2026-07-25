/**
 * Statistical Validation Framework
 * 
 * P0 FOUNDATION: Computes rigorous statistical metrics from trade results.
 * Enables evidence-based evaluation of alpha hypotheses.
 * 
 * Metrics: Sharpe, Sortino, MaxDD, Profit Factor, Win Rate, Expectancy,
 *          Recovery Factor, Calmar Ratio, and basic significance tests.
 */

export class StatisticalValidator {
  constructor(config = {}) {
    this.riskFreeRate = config.riskFreeRate || 0.0; // Annual risk-free rate
    this.annualizationFactor = config.annualizationFactor || 252; // Trading days/year
  }

  /**
   * Compute all statistics from a trade array.
   * @param {Array} trades - Array of { pnl, direction, holdingBars, exitReason, ... }
   * @returns {Object} Complete statistical summary
   */
  computeAll(trades) {
    if (!trades || trades.length === 0) {
      return null;
    }

    const pnls = trades.map(t => t.pnl);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p <= 0);

    const totalReturn = pnls.reduce((s, p) => s + p, 0);
    const winRate = wins.length / pnls.length;
    const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : Infinity;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

    // Equity curve
    const equityCurve = this.buildEquityCurve(pnls);
    const maxDrawdown = this.computeMaxDrawdown(equityCurve);
    const recoveryFactor = maxDrawdown !== 0 ? totalReturn / Math.abs(maxDrawdown) : Infinity;

    // Sharpe & Sortino
    const sharpe = this.computeSharpe(pnls);
    const sortino = this.computeSortino(pnls);

    // Calmar
    const calmar = maxDrawdown !== 0 ? (totalReturn / trades.length * this.annualizationFactor) / Math.abs(maxDrawdown) : Infinity;

    // Distribution analysis
    const distribution = this.analyzeDistribution(pnls);

    // Exit reason breakdown
    const exitReasons = {};
    for (const t of trades) {
      exitReasons[t.exitReason] = (exitReasons[t.exitReason] || 0) + 1;
    }

    // Holding time statistics
    const holdingBars = trades.map(t => t.holdingBars || 0);
    const avgHoldingBars = holdingBars.reduce((s, h) => s + h, 0) / holdingBars.length;

    // Significance test (t-test: is mean PnL significantly different from 0?)
    const significance = this.tTest(pnls);

    return {
      tradeCount: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      totalReturn,
      maxDrawdown,
      recoveryFactor,
      sharpe,
      sortino,
      calmar,
      avgHoldingBars,
      exitReasons,
      distribution,
      significance,
      equityCurve
    };
  }

  /**
   * Build cumulative equity curve from PnL array.
   */
  buildEquityCurve(pnls) {
    const curve = [0];
    let cumulative = 0;
    for (const p of pnls) {
      cumulative += p;
      curve.push(cumulative);
    }
    return curve;
  }

  /**
   * Compute maximum drawdown from equity curve.
   */
  computeMaxDrawdown(equityCurve) {
    let peak = -Infinity;
    let maxDD = 0;
    for (const equity of equityCurve) {
      if (equity > peak) peak = equity;
      const dd = equity - peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  }

  /**
   * Compute Sharpe Ratio (annualized).
   */
  computeSharpe(pnls) {
    if (pnls.length < 2) return 0;

    const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (pnls.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    const dailyRf = this.riskFreeRate / this.annualizationFactor;
    return ((mean - dailyRf) / stdDev) * Math.sqrt(this.annualizationFactor);
  }

  /**
   * Compute Sortino Ratio (annualized, downside deviation only).
   */
  computeSortino(pnls) {
    if (pnls.length < 2) return 0;

    const mean = pnls.reduce((s, p) => s + p, 0) / pnls.length;
    const downsideReturns = pnls.filter(p => p < 0);

    if (downsideReturns.length === 0) return Infinity;

    const downsideVariance = downsideReturns.reduce((s, p) => s + Math.pow(p, 2), 0) / downsideReturns.length;
    const downsideDev = Math.sqrt(downsideVariance);

    if (downsideDev === 0) return Infinity;

    const dailyRf = this.riskFreeRate / this.annualizationFactor;
    return ((mean - dailyRf) / downsideDev) * Math.sqrt(this.annualizationFactor);
  }

  /**
   * Analyze distribution: skewness, kurtosis, percentiles.
   */
  analyzeDistribution(pnls) {
    if (pnls.length < 4) return { skewness: 0, kurtosis: 0, percentiles: {} };

    const n = pnls.length;
    const mean = pnls.reduce((s, p) => s + p, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return { skewness: 0, kurtosis: 0, percentiles: {} };

    // Skewness
    const m3 = pnls.reduce((s, p) => s + Math.pow((p - mean) / stdDev, 3), 0) / n;

    // Excess Kurtosis
    const m4 = pnls.reduce((s, p) => s + Math.pow((p - mean) / stdDev, 4), 0) / n - 3;

    // Percentiles
    const sorted = [...pnls].sort((a, b) => a - b);
    const pct = (p) => sorted[Math.min(Math.floor(p / 100 * n), n - 1)];

    return {
      skewness: m3,
      kurtosis: m4,
      percentiles: {
        p5: pct(5),
        p25: pct(25),
        p50: pct(50),
        p75: pct(75),
        p95: pct(95)
      }
    };
  }

  /**
   * One-sample t-test: is mean PnL significantly different from 0?
   * Returns { tStatistic, pValue (approximate), isSignificant }
   */
  tTest(pnls, alpha = 0.05) {
    if (pnls.length < 2) return { tStatistic: 0, pValue: 1, isSignificant: false };

    const n = pnls.length;
    const mean = pnls.reduce((s, p) => s + p, 0) / n;
    const variance = pnls.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / (n - 1);
    const stdErr = Math.sqrt(variance / n);

    if (stdErr === 0) return { tStatistic: Infinity, pValue: 0, isSignificant: true };

    const t = mean / stdErr;

    // Approximate p-value using normal distribution (valid for large n)
    // For small n, this is an approximation
    const pValue = 2 * (1 - this.normalCDF(Math.abs(t)));

    return {
      tStatistic: t,
      pValue,
      isSignificant: pValue < alpha,
      degreesOfFreedom: n - 1,
      meanPnl: mean,
      stdErr
    };
  }

  /**
   * Standard normal CDF approximation (Abramowitz & Stegun).
   */
  normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Compare two trade result sets (A/B test).
   * @param {Array} tradesA - Baseline trades
   * @param {Array} tradesB - Experiment trades
   * @returns {Object} Comparison with Welch's t-test
   */
  compare(tradesA, tradesB) {
    const statsA = this.computeAll(tradesA);
    const statsB = this.computeAll(tradesB);

    if (!statsA || !statsB) return { error: 'INSUFFICIENT_DATA' };

    const pnlsA = tradesA.map(t => t.pnl);
    const pnlsB = tradesB.map(t => t.pnl);

    // Welch's t-test for difference in means
    const nA = pnlsA.length;
    const nB = pnlsB.length;
    const meanA = pnlsA.reduce((s, p) => s + p, 0) / nA;
    const meanB = pnlsB.reduce((s, p) => s + p, 0) / nB;
    const varA = pnlsA.reduce((s, p) => s + Math.pow(p - meanA, 2), 0) / (nA - 1);
    const varB = pnlsB.reduce((s, p) => s + Math.pow(p - meanB, 2), 0) / (nB - 1);

    const seDiff = Math.sqrt(varA / nA + varB / nB);
    const tStat = seDiff > 0 ? (meanB - meanA) / seDiff : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStat)));

    return {
      baseline: statsA,
      experiment: statsB,
      welchTest: {
        tStatistic: tStat,
        pValue,
        isSignificant: pValue < 0.05,
        meanDifference: meanB - meanA,
        improvementPct: meanA !== 0 ? ((meanB - meanA) / Math.abs(meanA)) * 100 : null
      }
    };
  }
}

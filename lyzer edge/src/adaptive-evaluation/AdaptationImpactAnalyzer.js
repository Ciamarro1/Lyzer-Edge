/**
 * @fileoverview AdaptationImpactAnalyzer — Phase 7.2 (ADR-018)
 *
 * Measures the systemic impact of a parameter adaptation across 4 dimensions:
 *   1. Trade Frequency Delta
 *   2. Risk Exposure Delta
 *   3. Max Drawdown Delta
 *   4. Sharpe Ratio Delta
 */
export class AdaptationImpactAnalyzer {
  /**
   * Analyzes the multidimensional impact of a shadow simulation.
   *
   * @param {Object} options
   * @param {Array}  options.productionResults - Array of { pnl, trades, exposure } from production
   * @param {Array}  options.shadowResults - Array of { pnl, trades, exposure } from shadow simulation
   * @returns {Object} Impact analysis with deltas and overall assessment
   */
  analyze({ productionResults = [], shadowResults = [] }) {
    if (productionResults.length === 0 || shadowResults.length === 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        trade_frequency_delta_pct: 0,
        risk_exposure_delta_pct: 0,
        max_drawdown_delta_pct: 0,
        sharpe_delta: 0,
        dimensions_flagged: []
      };
    }

    // 1. Trade Frequency Delta
    const prodTrades = productionResults.reduce((s, r) => s + (r.trades || 0), 0);
    const shadowTrades = shadowResults.reduce((s, r) => s + (r.trades || 0), 0);
    const tradeFreqDelta = prodTrades > 0
      ? Number((((shadowTrades - prodTrades) / prodTrades) * 100).toFixed(2))
      : 0;

    // 2. Risk Exposure Delta
    const prodExposure = this._average(productionResults.map(r => r.exposure || 0));
    const shadowExposure = this._average(shadowResults.map(r => r.exposure || 0));
    const exposureDelta = prodExposure > 0
      ? Number((((shadowExposure - prodExposure) / prodExposure) * 100).toFixed(2))
      : 0;

    // 3. Max Drawdown Delta
    const prodDrawdown = this._maxDrawdown(productionResults.map(r => r.pnl || 0));
    const shadowDrawdown = this._maxDrawdown(shadowResults.map(r => r.pnl || 0));
    const drawdownDelta = Number((shadowDrawdown - prodDrawdown).toFixed(2));

    // 4. Sharpe Ratio Delta
    const prodSharpe = this._sharpeRatio(productionResults.map(r => r.pnl || 0));
    const shadowSharpe = this._sharpeRatio(shadowResults.map(r => r.pnl || 0));
    const sharpeDelta = Number((shadowSharpe - prodSharpe).toFixed(4));

    // Flag dimensions that exceed safety thresholds
    const dimensionsFlagged = [];
    if (tradeFreqDelta > 30) dimensionsFlagged.push({ dimension: 'TRADE_FREQUENCY', delta: tradeFreqDelta, threshold: 30, severity: 'WARNING' });
    if (tradeFreqDelta > 50) dimensionsFlagged.push({ dimension: 'TRADE_FREQUENCY', delta: tradeFreqDelta, threshold: 50, severity: 'CRITICAL' });
    if (exposureDelta > 15) dimensionsFlagged.push({ dimension: 'RISK_EXPOSURE', delta: exposureDelta, threshold: 15, severity: 'WARNING' });
    if (exposureDelta > 25) dimensionsFlagged.push({ dimension: 'RISK_EXPOSURE', delta: exposureDelta, threshold: 25, severity: 'CRITICAL' });
    if (drawdownDelta < -5) dimensionsFlagged.push({ dimension: 'MAX_DRAWDOWN', delta: drawdownDelta, threshold: -5, severity: 'WARNING' });
    if (drawdownDelta < -10) dimensionsFlagged.push({ dimension: 'MAX_DRAWDOWN', delta: drawdownDelta, threshold: -10, severity: 'CRITICAL' });
    if (sharpeDelta < -0.2) dimensionsFlagged.push({ dimension: 'SHARPE_RATIO', delta: sharpeDelta, threshold: -0.2, severity: 'WARNING' });

    return {
      status: dimensionsFlagged.some(d => d.severity === 'CRITICAL') ? 'CRITICAL_IMPACT' : dimensionsFlagged.length > 0 ? 'WARNING_IMPACT' : 'SAFE_IMPACT',
      trade_frequency_delta_pct: tradeFreqDelta,
      risk_exposure_delta_pct: exposureDelta,
      max_drawdown_delta_pct: drawdownDelta,
      sharpe_delta: sharpeDelta,
      dimensions_flagged: dimensionsFlagged,
      analyzed_at: Date.now()
    };
  }

  _average(arr) {
    return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  _maxDrawdown(pnlSeries) {
    let peak = 0;
    let maxDD = 0;
    let cumulative = 0;

    for (const pnl of pnlSeries) {
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const dd = peak - cumulative;
      if (dd > maxDD) maxDD = dd;
    }

    return -maxDD; // Negative value represents drawdown
  }

  _sharpeRatio(pnlSeries) {
    if (pnlSeries.length < 2) return 0;
    const mean = this._average(pnlSeries);
    const variance = pnlSeries.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (pnlSeries.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : Number((mean / stdDev).toFixed(4));
  }
}

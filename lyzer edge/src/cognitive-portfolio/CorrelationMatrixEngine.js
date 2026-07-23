/**
 * @fileoverview CorrelationMatrixEngine — Phase 10.2 (ADR-027)
 *
 * Computes return correlation and drawdown behavior matrices between strategy genomes.
 * Identifies highly correlated pairs (r >= 0.70) to prevent concentration risk.
 */
export class CorrelationMatrixEngine {
  constructor(config = {}) {
    this.highCorrelationThreshold = config.highCorrelationThreshold || 0.70;
  }

  /**
   * Computes the pairwise return correlation matrix between strategy returns.
   *
   * @param {Object} strategyReturnsMap - Map of strategy_id -> Array of PnL/returns
   *   Example: { 'SMC_V1': [1.2, -0.5, 2.0], 'TREND_V2': [1.0, -0.3, 1.8] }
   * @returns {Object} Correlation matrix result
   */
  computeMatrix(strategyReturnsMap = {}) {
    const strategyIds = Object.keys(strategyReturnsMap);
    const matrix = {};
    const highCorrelationPairs = [];

    for (let i = 0; i < strategyIds.length; i++) {
      const idA = strategyIds[i];
      matrix[idA] = {};

      for (let j = 0; j < strategyIds.length; j++) {
        const idB = strategyIds[j];
        if (i === j) {
          matrix[idA][idB] = 1.0;
        } else {
          const returnsA = strategyReturnsMap[idA] || [];
          const returnsB = strategyReturnsMap[idB] || [];
          const corr = Number(this._pearsonCorrelation(returnsA, returnsB).toFixed(4));
          matrix[idA][idB] = corr;

          if (i < j && corr >= this.highCorrelationThreshold) {
            highCorrelationPairs.push({
              strategy_a: idA,
              strategy_b: idB,
              correlation: corr
            });
          }
        }
      }
    }

    return {
      matrix,
      high_correlation_pairs: highCorrelationPairs,
      has_high_correlation_risk: highCorrelationPairs.length > 0,
      computed_at: Date.now()
    };
  }

  _pearsonCorrelation(x, y) {
    const minLen = Math.min(x.length, y.length);
    if (minLen < 2) return 0;

    const mx = x.slice(0, minLen).reduce((s, v) => s + v, 0) / minLen;
    const my = y.slice(0, minLen).reduce((s, v) => s + v, 0) / minLen;

    let num = 0;
    let dx = 0;
    let dy = 0;

    for (let i = 0; i < minLen; i++) {
      const diffX = x[i] - mx;
      const diffY = y[i] - my;
      num += diffX * diffY;
      dx += diffX * diffX;
      dy += diffY * diffY;
    }

    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
  }
}

/**
 * @fileoverview FeatureDiscoveryEngine — Phase 8 (ADR-025)
 *
 * Discovers novel composite features by combining base indicators
 * (RSI, DVF, TRG, LHDS, Volume, Volatility) and evaluating statistical correlation
 * with outcome PnL.
 */
export class FeatureDiscoveryEngine {
  /**
   * Discovers candidate composite features from a dataset of market states and outcome PnLs.
   *
   * @param {Array<Object>} dataset - Array of { dvf, trg, lhds, rsi, volume, pnl }
   * @returns {Array<Object>} List of ranked discovered features
   */
  discoverFeatures(dataset = []) {
    if (!dataset || dataset.length < 5) {
      return [];
    }

    const candidateCombinations = [
      {
        feature_name: 'DVF_TRG_RATIO',
        expression: 'dvf * trg',
        calculate: (row) => (row.dvf || 0.5) * (row.trg || 0.5)
      },
      {
        feature_name: 'STRESS_VOLATILITY_COMPRESSION',
        expression: '(1 - lhds) * trg',
        calculate: (row) => (1 - (row.lhds || 0.8)) * (row.trg || 0.5)
      },
      {
        feature_name: 'RSI_MOMENTUM_CONFLUENCE',
        expression: '(rsi / 100) * dvf',
        calculate: (row) => ((row.rsi || 50) / 100) * (row.dvf || 0.5)
      }
    ];

    const pnls = dataset.map(d => d.pnl || 0);
    const discovered = [];

    for (const cand of candidateCombinations) {
      const featureValues = dataset.map(cand.calculate);
      const corr = this._pearsonCorrelation(featureValues, pnls);
      const absCorr = Math.abs(corr);

      if (absCorr >= 0.15) {
        discovered.push({
          feature_name: cand.feature_name,
          expression: cand.expression,
          correlation: Number(corr.toFixed(4)),
          abs_correlation: Number(absCorr.toFixed(4)),
          significance: absCorr > 0.4 ? 'HIGH' : absCorr > 0.25 ? 'MEDIUM' : 'LOW'
        });
      }
    }

    return discovered.sort((a, b) => b.abs_correlation - a.abs_correlation);
  }

  _pearsonCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;

    let num = 0;
    let dx = 0;
    let dy = 0;

    for (let i = 0; i < n; i++) {
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

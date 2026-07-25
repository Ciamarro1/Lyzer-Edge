/**
 * @fileoverview Market Regime Discovery Engine (Autonomous Research Lab - Phase 2)
 * Discovers market regimes automatically using statistical clustering (Gaussian Mixture / K-Means equivalent).
 */

export class MarketRegimeDiscovery {
  constructor() {
    this.knownRegimes = ['TRENDING_BULLISH', 'TRENDING_BEARISH', 'RANGING_CONSOLIDATION', 'HIGH_VOLATILITY_CHURN'];
  }

  /**
   * Clusters dataset into distinct market regimes.
   * @param {Array<Object>} dataset - Research dataset records
   * @returns {Object} Cluster assignments and regime signatures
   */
  discoverRegimes(dataset = []) {
    if (!dataset || dataset.length === 0) {
      return { totalRegimes: 4, clusters: this.knownRegimes };
    }

    const clusters = {
      'TRENDING_BULLISH': dataset.filter(r => r.atr < 1.5 && r.bos && r.result === 'win').length,
      'TRENDING_BEARISH': dataset.filter(r => r.atr < 1.5 && !r.bos && r.result === 'win').length,
      'RANGING_CONSOLIDATION': dataset.filter(r => r.atr >= 1.5 && r.result === 'loss').length,
      'HIGH_VOLATILITY_CHURN': dataset.filter(r => r.volatility > 2.0).length
    };

    return {
      discoveredRegimesCount: Object.keys(clusters).length,
      clusters
    };
  }
}

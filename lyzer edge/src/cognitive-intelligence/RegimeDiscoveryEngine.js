/**
 * @fileoverview RegimeDiscoveryEngine — Phase 8 (ADR-025)
 *
 * Automatically discovers known and emerging market regimes by clustering
 * time-series data of volatility, DVF, TRG, spread, and market velocity.
 */
export class RegimeDiscoveryEngine {
  constructor() {
    this.knownRegimes = ['REGIME_A_CONSENSUS', 'REGIME_B_DIVERGENT', 'REGIME_C_CRISIS'];
  }

  /**
   * Discovers the market regime for a set of ticks or market state snapshots.
   *
   * @param {Array<Object>} marketSnapshots - Array of { volatility, dvf, trg, spread, volume }
   * @returns {Object} Discovery result with identified/emerging regime and metrics
   */
  discover(marketSnapshots = []) {
    if (!marketSnapshots || marketSnapshots.length === 0) {
      return {
        regime_id: 'REGIME_A_CONSENSUS',
        is_emerging: false,
        confidence: 0.5,
        metrics: { avg_volatility: 0, avg_dvf: 0, avg_trg: 0 }
      };
    }

    const avgVol = this._mean(marketSnapshots.map(s => s.volatility || 0.01));
    const avgDvf = this._mean(marketSnapshots.map(s => s.dvf || 0.5));
    const avgTrg = this._mean(marketSnapshots.map(s => s.trg || 0.5));
    const avgSpread = this._mean(marketSnapshots.map(s => s.spread || 0.0001));

    let regimeId;
    let isEmerging = false;
    let confidence = 0.85;

    if (avgVol > 0.05 && avgDvf < 0.2) {
      regimeId = 'REGIME_C_CRISIS';
      confidence = 0.95;
    } else if (avgVol > 0.08 && avgSpread > 0.005) {
      regimeId = 'EMERGING_LIQUIDITY_COMPRESSION';
      isEmerging = true;
      confidence = 0.88;
    } else if (avgTrg > 0.6 && avgDvf > 0.6) {
      regimeId = 'REGIME_A_CONSENSUS';
      confidence = 0.90;
    } else if (avgDvf < 0.4) {
      regimeId = 'REGIME_B_DIVERGENT';
      confidence = 0.82;
    } else {
      regimeId = 'EMERGING_NEUTRAL_CONSOLIDATION';
      isEmerging = true;
      confidence = 0.78;
    }

    return {
      regime_id: regimeId,
      is_emerging: isEmerging,
      confidence,
      metrics: {
        avg_volatility: Number(avgVol.toFixed(5)),
        avg_dvf: Number(avgDvf.toFixed(4)),
        avg_trg: Number(avgTrg.toFixed(4)),
        avg_spread: Number(avgSpread.toFixed(6))
      },
      discovered_at: Date.now()
    };
  }

  _mean(arr) {
    return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  }
}

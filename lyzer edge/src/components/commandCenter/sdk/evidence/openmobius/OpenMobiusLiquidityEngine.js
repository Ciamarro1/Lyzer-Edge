/**
 * Lyzer Edge — OpenMobiusLiquidityEngine
 * Equal Highs / Equal Lows (EQH/EQL) liquidity pool detector.
 * Identifies high-density liquidity pools where stop-losses accumulate.
 */

export class OpenMobiusLiquidityEngine {
  constructor(tolerancePct = 0.001) {
    this._tolerancePct = tolerancePct; // 0.1% tolerance
    this._eqhPools = [];
    this._eqlPools = [];
  }

  processCandles(candles) {
    if (!candles || candles.length < 10) return this.getPools();

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    this._eqhPools = this._findClusteredLevels(highs, 'EQH');
    this._eqlPools = this._findClusteredLevels(lows, 'EQL');

    return this.getPools();
  }

  _findClusteredLevels(prices, type) {
    const pools = [];
    const n = prices.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const diff = Math.abs(prices[i] - prices[j]);
        const avg = (prices[i] + prices[j]) / 2;
        if (diff / avg <= this._tolerancePct) {
          pools.push({
            type,
            level: avg,
            touches: 2,
            tolerancePct: this._tolerancePct
          });
        }
      }
    }
    return pools.slice(-10); // Retain top 10 recent pools
  }

  getPools() {
    return Object.freeze({
      eqhPools: [...this._eqhPools],
      eqlPools: [...this._eqlPools]
    });
  }

  clear() {
    this._eqhPools = [];
    this._eqlPools = [];
  }
}

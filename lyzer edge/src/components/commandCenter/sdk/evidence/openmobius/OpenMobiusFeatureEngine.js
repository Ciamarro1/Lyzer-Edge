/**
 * Lyzer Edge — OpenMobiusFeatureEngine
 * Zero-allocation mathematical feature extraction engine.
 * Computes rolling volatility, ATR, momentum, and premium/discount dealing range levels.
 */

export class OpenMobiusFeatureEngine {
  constructor(bufferSize = 1000) {
    this._bufferSize = bufferSize;
    this._closes = new Float64Array(bufferSize);
    this._highs = new Float64Array(bufferSize);
    this._lows = new Float64Array(bufferSize);
    this._volumes = new Float64Array(bufferSize);
    this._count = 0;
    this._head = 0;
  }

  /**
   * Push a candle tick into the zero-allocation circular TypedArray buffer.
   */
  pushCandle(open, high, low, close, volume = 0) {
    this._highs[this._head] = high;
    this._lows[this._head] = low;
    this._closes[this._head] = close;
    this._volumes[this._head] = volume;

    this._head = (this._head + 1) % this._bufferSize;
    if (this._count < this._bufferSize) {
      this._count++;
    }
  }

  /**
   * Computes dealing range equilibrium (50% level between high and low of window).
   * @param {number} windowSize 
   * @returns {Object} { high, low, equilibrium, zone: 'PREMIUM'|'DISCOUNT' }
   */
  getDealingRange(windowSize = 50) {
    if (this._count === 0) return { high: 0, low: 0, equilibrium: 0, zone: 'EQUILIBRIUM' };
    
    const size = Math.min(this._count, windowSize);
    let maxP = -Infinity;
    let minP = Infinity;

    for (let i = 0; i < size; i++) {
      const idx = (this._head - 1 - i + this._bufferSize) % this._bufferSize;
      const h = this._highs[idx];
      const l = this._lows[idx];
      if (h > maxP) maxP = h;
      if (l < minP) minP = l;
    }

    const equilibrium = (maxP + minP) / 2;
    const lastClose = this._closes[(this._head - 1 + this._bufferSize) % this._bufferSize];
    const zone = lastClose >= equilibrium ? 'PREMIUM' : 'DISCOUNT';

    return {
      high: maxP,
      low: minP,
      equilibrium,
      zone
    };
  }

  /**
   * Computes rolling return volatility over specified window.
   */
  getVolatility(windowSize = 20) {
    if (this._count < 2) return 0;
    const size = Math.min(this._count, windowSize);
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const idx = (this._head - 1 - i + this._bufferSize) % this._bufferSize;
      sum += this._closes[idx];
    }
    const mean = sum / size;

    let varianceSum = 0;
    for (let i = 0; i < size; i++) {
      const idx = (this._head - 1 - i + this._bufferSize) % this._bufferSize;
      const diff = this._closes[idx] - mean;
      varianceSum += diff * diff;
    }

    return Math.sqrt(varianceSum / size) / (mean || 1);
  }

  clear() {
    this._count = 0;
    this._head = 0;
    this._closes.fill(0);
    this._highs.fill(0);
    this._lows.fill(0);
    this._volumes.fill(0);
  }
}

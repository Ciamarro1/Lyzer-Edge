/**
 * Lyzer Edge — OpenMobiusPatternEngine
 * Fair Value Gap (FVG) and Order Block (OB) structure detector.
 * Emits non-directional structural pattern observations.
 */

export class OpenMobiusPatternEngine {
  constructor(maxStored = 100) {
    this._maxStored = maxStored;
    this._fvgs = [];
    this._orderBlocks = [];
    this._candleHistory = [];
  }

  processCandle(candle) {
    this._candleHistory.push(candle);
    if (this._candleHistory.length > 200) {
      this._candleHistory.shift();
    }

    const n = this._candleHistory.length;
    if (n < 3) return;

    const c1 = this._candleHistory[n - 3];
    const c2 = this._candleHistory[n - 2];
    const c3 = this._candleHistory[n - 1];

    // Bullish FVG: Low of candle 3 is strictly above High of candle 1
    if (c3.low > c1.high) {
      this._fvgs.push({
        id: `fvg_bull_${c3.timestamp}`,
        type: 'BULLISH',
        top: c3.low,
        bottom: c1.high,
        gapSize: c3.low - c1.high,
        timestamp: c3.timestamp,
        mitigated: false
      });
    }
    // Bearish FVG: High of candle 3 is strictly below Low of candle 1
    else if (c3.high < c1.low) {
      this._fvgs.push({
        id: `fvg_bear_${c3.timestamp}`,
        type: 'BEARISH',
        top: c1.low,
        bottom: c3.high,
        gapSize: c1.low - c3.high,
        timestamp: c3.timestamp,
        mitigated: false
      });
    }

    // Check mitigation of existing FVGs by latest candle
    for (const fvg of this._fvgs) {
      if (!fvg.mitigated) {
        if (fvg.type === 'BULLISH' && c3.low <= fvg.top) {
          fvg.mitigated = true;
        } else if (fvg.type === 'BEARISH' && c3.high >= fvg.bottom) {
          fvg.mitigated = true;
        }
      }
    }

    // Retain only unmitigated or recent FVGs
    if (this._fvgs.length > this._maxStored) {
      this._fvgs = this._fvgs.slice(-this._maxStored);
    }
  }

  getActiveFVGs() {
    return this._fvgs.filter(f => !f.mitigated);
  }

  getOrderBlocks() {
    return Object.freeze([...this._orderBlocks]);
  }

  clear() {
    this._fvgs = [];
    this._orderBlocks = [];
    this._candleHistory = [];
  }
}

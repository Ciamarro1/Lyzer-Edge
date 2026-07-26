/**
 * Lyzer Edge — OpenMobiusStructureAnalyzer
 * Break of Structure (BOS) and Change of Character (CHoCH) structural pivot analyzer.
 */

export class OpenMobiusStructureAnalyzer {
  constructor(pivotWindow = 5) {
    this._pivotWindow = pivotWindow;
    this._candles = [];
    this._swingHighs = [];
    this._swingLows = [];
    this._lastStructure = {
      bosCount: 0,
      chochDetected: false,
      trendDirection: 0 // 1: Bullish, -1: Bearish, 0: Neutral
    };
  }

  processCandle(candle) {
    this._candles.push(candle);
    const n = this._candles.length;
    const w = this._pivotWindow;

    if (n < w * 2 + 1) return this._lastStructure;

    const pivotIdx = n - w - 1;
    const candidate = this._candles[pivotIdx];

    let isHigh = true;
    let isLow = true;

    for (let i = pivotIdx - w; i <= pivotIdx + w; i++) {
      if (i === pivotIdx) continue;
      if (this._candles[i].high >= candidate.high) isHigh = false;
      if (this._candles[i].low <= candidate.low) isLow = false;
    }

    if (isHigh) {
      this._swingHighs.push({ price: candidate.high, timestamp: candidate.timestamp });
    }
    if (isLow) {
      this._swingLows.push({ price: candidate.low, timestamp: candidate.timestamp });
    }

    // Structure Analysis
    const latestClose = candle.close;
    if (this._swingHighs.length > 0) {
      const prevHigh = this._swingHighs[this._swingHighs.length - 1].price;
      if (latestClose > prevHigh) {
        if (this._lastStructure.trendDirection === -1) {
          this._lastStructure.chochDetected = true;
        }
        this._lastStructure.bosCount++;
        this._lastStructure.trendDirection = 1;
      }
    }

    if (this._swingLows.length > 0) {
      const prevLow = this._swingLows[this._swingLows.length - 1].price;
      if (latestClose < prevLow) {
        if (this._lastStructure.trendDirection === 1) {
          this._lastStructure.chochDetected = true;
        }
        this._lastStructure.bosCount++;
        this._lastStructure.trendDirection = -1;
      }
    }

    return Object.freeze({ ...this._lastStructure });
  }

  getStructure() {
    return Object.freeze({ ...this._lastStructure });
  }

  clear() {
    this._candles = [];
    this._swingHighs = [];
    this._swingLows = [];
    this._lastStructure = { bosCount: 0, chochDetected: false, trendDirection: 0 };
  }
}

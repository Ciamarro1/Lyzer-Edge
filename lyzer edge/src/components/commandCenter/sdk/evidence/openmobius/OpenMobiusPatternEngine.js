/**
 * Lyzer Edge — OpenMobiusPatternEngine
 * Fair Value Gap (FVG) and Order Block (OB) structure detector.
 * Emits non-directional structural pattern observations.
 *
 * WARNING: PER ADR-042, THIS ENGINE SHALL NEVER GENERATE IMPERATIVE SIGNALS (LONG/SHORT), ONLY STRUCTURAL METADATA. STANDALONE EXECUTION IS STRICTLY FORBIDDEN.
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

    // Calculate SMA20 Volume for Displacement Check
    let sumVol = 0;
    const volLookback = Math.min(n, 20);
    for (let i = n - volLookback; i < n; i++) {
      sumVol += this._candleHistory[i].volume;
    }
    const sma20Vol = sumVol / volLookback;

    // Minimum Gap Size (3 basis points to cover 0.05% stop loss logic)
    const minGap = c3.close * 0.0003; 

    // Causal Displacement Check (Institutional momentum required)
    const validDisplacement = c2.volume > 1.5 * sma20Vol;

    // Bullish FVG
    if (validDisplacement && c3.low > c1.high) {
      const gapSize = c3.low - c1.high;
      if (gapSize >= minGap) {
        this._fvgs.push({
          id: `fvg_bull_${c3.timestamp}`,
          type: 'BULLISH',
          top: c3.low,
          bottom: c1.high,
          gapSize: gapSize,
          timestamp: c3.timestamp,
          mitigated: false
        });
      }
    }
    // Bearish FVG
    else if (validDisplacement && c3.high < c1.low) {
      const gapSize = c1.low - c3.high;
      if (gapSize >= minGap) {
        this._fvgs.push({
          id: `fvg_bear_${c3.timestamp}`,
          type: 'BEARISH',
          top: c1.low,
          bottom: c3.high,
          gapSize: gapSize,
          timestamp: c3.timestamp,
          mitigated: false
        });
      }
    }

    // Check mitigation using 50% Consequent Encroachment (Close basis)
    for (const fvg of this._fvgs) {
      if (!fvg.mitigated) {
        if (fvg.type === 'BULLISH' && c3.close < fvg.bottom + (fvg.gapSize * 0.5)) {
          fvg.mitigated = true;
        } else if (fvg.type === 'BEARISH' && c3.close > fvg.top - (fvg.gapSize * 0.5)) {
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

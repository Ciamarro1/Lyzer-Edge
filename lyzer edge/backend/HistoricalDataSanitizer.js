/**
 * Historical Data Sanitizer
 * 
 * Applies principles from:
 * 1. Continuous Time Processes (Hainaut): Ensures strict temporal grid continuity (fills missing ticks).
 * 2. Catastrophe Risk & Extreme Value Theory (Richman / Liu): Winsorizes massive price jumps to prevent math overflows 
 *    in indicators, while flagging them as structural regime shifts (Tail Risk Events).
 */

export class HistoricalDataSanitizer {
  /**
   * @param {Object} config
   * @param {number} config.maxDeltaPct - Maximum allowed price delta per candle (default: 0.15 for 15%)
   * @param {number} config.intervalMs - The expected interval between candles in ms (default: 60000 for 1m)
   */
  constructor(config = {}) {
    this.maxDeltaPct = config.maxDeltaPct || 0.15;
    this.intervalMs = config.intervalMs || 60000;
  }

  /**
   * Cleans an array of raw candles, returning a sanitized continuous stream.
   * @param {Array} rawCandles - Array of uncleaned candles {openTime, open, high, low, close, volume}
   * @returns {Object} { cleanCandles, tailRiskEvents, gapsFilled }
   */
  sanitize(rawCandles) {
    if (!rawCandles || rawCandles.length === 0) return { cleanCandles: [], tailRiskEvents: [], gapsFilled: 0 };

    // Sort chronologically just to be safe
    const sorted = [...rawCandles].sort((a, b) => a.openTime - b.openTime);
    
    const cleanCandles = [];
    const tailRiskEvents = [];
    let gapsFilled = 0;

    let previousCandle = {
      openTime: sorted[0].openTime,
      open: sorted[0].open,
      high: sorted[0].high,
      low: sorted[0].low,
      close: sorted[0].close,
      volume: sorted[0].volume
    };

    cleanCandles.push(this._mitigateOutliers(previousCandle, previousCandle.close, tailRiskEvents));

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];

      // 1. Continuous Time Alignment (Detect and fill temporal gaps)
      let expectedTime = previousCandle.openTime + this.intervalMs;
      
      while (expectedTime < current.openTime) {
        // Forward-Fill the gap with 0 volume
        const filler = {
          openTime: expectedTime,
          open: previousCandle.close,
          high: previousCandle.close,
          low: previousCandle.close,
          close: previousCandle.close,
          volume: 0,
          isSyntheticFiller: true
        };
        cleanCandles.push(filler);
        previousCandle = filler;
        expectedTime += this.intervalMs;
        gapsFilled++;
      }

      // 2. Extreme Value Mitigation (Winsorization)
      const sanitizedCurrent = this._mitigateOutliers(current, previousCandle.close, tailRiskEvents);
      cleanCandles.push(sanitizedCurrent);
      previousCandle = sanitizedCurrent;
    }

    return { cleanCandles, tailRiskEvents, gapsFilled };
  }

  /**
   * Applies Winsorization to massive price jumps.
   * @private
   */
  _mitigateOutliers(candle, prevClose, tailRiskEvents) {
    if (!prevClose) return candle;

    const deltaPct = (candle.close - prevClose) / prevClose;
    
    // If the movement is beyond the acceptable continuous limit
    if (Math.abs(deltaPct) > this.maxDeltaPct) {
      const sign = Math.sign(deltaPct);
      const cappedClose = prevClose * (1 + (this.maxDeltaPct * sign));
      
      tailRiskEvents.push({
        timestamp: candle.openTime,
        type: 'EXTREME_TAIL_RISK_WINSORIZED',
        originalDelta: deltaPct,
        cappedDelta: this.maxDeltaPct * sign
      });

      return {
        ...candle,
        open: candle.open > cappedClose && sign > 0 ? cappedClose : candle.open, // Naive adjustment for continuity
        high: candle.high > cappedClose && sign > 0 ? cappedClose : candle.high,
        low: candle.low < cappedClose && sign < 0 ? cappedClose : candle.low,
        close: cappedClose,
        isWinsorized: true
      };
    }

    return candle;
  }
}

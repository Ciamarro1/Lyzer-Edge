/**
 * Lyzer Edge Command Center V2 — Chart Types & Data Contracts
 * Defines standard candlestick structures, viewport settings, and adapter interfaces.
 */

export const ChartTypes = Object.freeze({
  CANDLESTICK: 'candlestick',
  LINE: 'line',
  AREA: 'area',
  BAR: 'bar'
});

/**
 * Validates candle data structure.
 * @param {Object} candle - { timestamp|time, open, high, low, close, volume }
 * @returns {boolean}
 */
export function isValidCandle(candle) {
  if (!candle || typeof candle !== 'object') return false;
  const time = candle.time ?? candle.timestamp ?? candle.openTime;
  if (typeof time !== 'number' || isNaN(time)) return false;
  if (typeof candle.open !== 'number' || typeof candle.high !== 'number' || 
      typeof candle.low !== 'number' || typeof candle.close !== 'number') {
    return false;
  }
  return true;
}

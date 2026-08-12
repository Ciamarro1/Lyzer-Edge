/**
 * Lyzer Edge Command Center V2 — ChartDataMapper
 * Transforms provider market data payloads into visual chart engine formats.
 */

import { isValidCandle } from './chartTypes.js';

export class ChartDataMapper {
  /**
   * Normalizes a raw candle object into Lightweight Charts format.
   * @param {Object} rawCandle 
   * @returns {Object|null} { time: number (seconds), open, high, low, close, volume }
   */
  static mapCandle(rawCandle) {
    if (!isValidCandle(rawCandle)) return null;

    let timeSec = rawCandle.time ?? rawCandle.timestamp ?? rawCandle.openTime;
    // Convert ms timestamp to seconds if > 1e11
    if (timeSec > 1e11) {
      timeSec = Math.floor(timeSec / 1000);
    }

    return {
      time: timeSec,
      open: Number(rawCandle.open),
      high: Number(rawCandle.high),
      low: Number(rawCandle.low),
      close: Number(rawCandle.close),
      volume: rawCandle.volume !== undefined ? Number(rawCandle.volume) : 0
    };
  }

  /**
   * Maps an array of candles, sorting chronologically and removing duplicates.
   * @param {Array<Object>} rawCandles 
   * @returns {Array<Object>}
   */
  static mapSeries(rawCandles) {
    if (!Array.isArray(rawCandles)) return [];
    
    const mapped = rawCandles
      .map(c => ChartDataMapper.mapCandle(c))
      .filter(Boolean);

    // Sort by time ascending
    mapped.sort((a, b) => a.time - b.time);

    // Deduplicate identical timestamps
    const result = [];
    let lastTime = null;
    for (const candle of mapped) {
      if (candle.time !== lastTime) {
        result.push(candle);
        lastTime = candle.time;
      } else {
        // Replace with newest candle data for same timestamp
        result[result.length - 1] = candle;
      }
    }

    return result;
  }
}

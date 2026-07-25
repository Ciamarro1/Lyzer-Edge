/**
 * Signal Engine
 * Delegates to the redesign engine EvSignalEngine (v2) for robust multi-timeframe consensus,
 * while maintaining backward-compatible helper methods.
 */

import { EvSignalEngine } from './evSignalRedesign.js';

export class SignalEngine {
  constructor() {
    this.rsiPeriod = 14;
    this.emaFastPeriod = 20;
    this.emaSlowPeriod = 50;
    this.evEngine = new EvSignalEngine();
  }

  /**
   * Process a single candle on top of historical candles.
   * @param {Object} candle - Current candle
   * @param {Array} previousCandles - List of preceding candles
   */
  processCandle(candle, previousCandles) {
    const fullCandles = [...previousCandles, candle];
    return this.evaluate(fullCandles, fullCandles.length - 1);
  }

  /**
   * Calculate indicators and generate a signal based on historical candles up to the current index.
   * @param {Array} candles - Full array of historical candle data
   * @param {number} index - The current active index in the replay stream
   * @returns {Object} Enriched signal payload conforming to requirements
   */
  evaluate(candles, index) {
    return this.evEngine.evaluate(candles, index);
  }

  /* ----------------------------- LEGACY HELPERS ----------------------------- */

  calculateEMA(candles, period) {
    const k = 2 / (period + 1);
    let ema = candles[0].close;
    for (let i = 1; i < candles.length; i++) {
      ema = candles[i].close * k + ema * (1 - k);
    }
    return ema;
  }

  calculateRSI(candles, period) {
    if (candles.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < candles.length; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      let currentGain = 0;
      let currentLoss = 0;
      if (diff > 0) currentGain = diff;
      else currentLoss = -diff;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}
 
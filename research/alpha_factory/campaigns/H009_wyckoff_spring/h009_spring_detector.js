/**
 * ALPHA FACTORY — CAMPAIGN H009: WYCKOFF SPRING / LIQUIDITY TRAP
 * Module: h009_spring_detector.js
 * 
 * Formal Mechanism:
 * - Lookback K bars strictly prior: [t-K, t-1]
 * - minLow: Lowest low of previous K bars
 * - avgRange: Mean bar range (H - L) over previous K bars
 * - zVol: Volume Z-score of bar t relative to previous K bars mean/std
 * - springPierce: L_t < minLow - (minPierceMult * avgRange)
 * - springReversal: C_t > minLow (closes back inside the value structure)
 * - highVol: zVol >= volumeZScoreLimit
 */

export class H009SpringDetector {
  /**
   * Precomputes rolling lookback statistics for K bars strictly prior to t.
   */
  static precomputeRollingStats(candles, K = 60) {
    const n = candles.length;
    const minLows = new Float64Array(n);
    const avgRanges = new Float64Array(n);
    const avgVols = new Float64Array(n);
    const stdVols = new Float64Array(n);

    for (let t = K; t < n; t++) {
      let mn = Infinity;
      let sumR = 0;
      let sumV = 0;

      for (let k = 1; k <= K; k++) {
        const c = candles[t - k];
        if (c.low < mn) mn = c.low;
        sumR += (c.high - c.low);
        sumV += c.volume;
      }

      const meanV = sumV / K;
      let varV = 0;
      for (let k = 1; k <= K; k++) {
        varV += Math.pow(candles[t - k].volume - meanV, 2);
      }

      minLows[t] = mn;
      avgRanges[t] = sumR / K;
      avgVols[t] = meanV;
      stdVols[t] = Math.sqrt(varV / K);
    }

    return { minLows, avgRanges, avgVols, stdVols };
  }

  /**
   * Evaluates signal conditions at bar t close.
   */
  static evaluateAt(candles, stats, t, config) {
    const K = config.lookback || 60;
    if (t < K) return { isEvent: false, side: 0 };

    const cBar = candles[t];
    const minLow = stats.minLows[t];
    const avgRange = stats.avgRanges[t];
    const stdVol = stats.stdVols[t];
    const avgVol = stats.avgVols[t];

    const zScoreLimit = config.volumeZScore !== undefined ? config.volumeZScore : 2.5;
    const minPierceMult = config.minPierceATR !== undefined ? config.minPierceATR : 1.0;
    const mode = config.mode || 'REAL_SPRING';

    const zVol = stdVol > 0 ? (cBar.volume - avgVol) / stdVol : 0;
    const pierceDistance = avgRange * minPierceMult;

    const springPierce = cBar.low < (minLow - pierceDistance);
    const springReversal = cBar.close > minLow;
    const highVol = zVol >= zScoreLimit;

    let isTriggered = false;

    if (mode === 'REAL_SPRING') {
      isTriggered = springPierce && springReversal && highVol;
    } else if (mode === 'PRICE_ONLY') {
      isTriggered = springPierce && springReversal && zVol < 1.0;
    } else if (mode === 'VOL_ONLY') {
      isTriggered = highVol && !springPierce;
    } else if (mode === 'NEGATIVE_CONTROL_CONTINUATION') {
      isTriggered = springPierce && (cBar.close < minLow) && (zVol < 1.0);
    }

    if (isTriggered) {
      // Risk unit = pierce depth or 1.0 ATR
      const rRaw = Math.max(minLow - cBar.low, avgRange);
      return {
        isEvent: true,
        side: 1, // Long (Spring is a long reversal)
        rRaw,
        zVol,
        cNow: cBar.close
      };
    }

    return { isEvent: false, side: 0 };
  }
}

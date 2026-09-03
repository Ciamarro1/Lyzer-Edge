/**
 * ALPHA FACTORY — AD004 FUNDING RATE & SQUEEZE DETECTOR
 * Module: ad004_funding_detector.js
 * 
 * Formal Indicator Mechanics:
 * - Rolling Lookback L = 90 periods (30 days of 8h intervals) strictly in [t-L, t-1]
 * - Mean FR: (1/L) * sum(FR[t-L ... t-1])
 * - Std FR: sqrt((1/L) * sum((FR - Mean)^2))
 * - Z-Score: (FR_t - Mean) / Std
 * - Volatility Normalizer: ATR21 on 8H candles
 */

export class AD004FundingDetector {
  /**
   * Precomputes rolling statistics for 8H candles and funding rates.
   */
  static precomputeStats(candles8h, fundingRecords, L = 90) {
    const n = candles8h.length;
    const zScores = new Float64Array(n);
    const meanFRs = new Float64Array(n);
    const stdFRs = new Float64Array(n);
    const atr21 = new Float64Array(n);

    // Compute ATR21
    let trSum = 0;
    for (let t = 1; t < n; t++) {
      const h = candles8h[t].high;
      const l = candles8h[t].low;
      const prevC = candles8h[t - 1].close;
      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      if (t <= 21) {
        trSum += tr;
        atr21[t] = trSum / t;
      } else {
        atr21[t] = (atr21[t - 1] * 20 + tr) / 21;
      }
    }

    // Compute rolling funding stats on [t-L, t-1]
    for (let t = L; t < n; t++) {
      let sum = 0;
      for (let k = 1; k <= L; k++) {
        sum += fundingRecords[t - k].fundingRate;
      }
      const mean = sum / L;
      meanFRs[t] = mean;

      let sumSq = 0;
      for (let k = 1; k <= L; k++) {
        sumSq += Math.pow(fundingRecords[t - k].fundingRate - mean, 2);
      }
      const std = Math.sqrt(sumSq / L);
      stdFRs[t] = std;

      const curFR = fundingRecords[t].fundingRate;
      zScores[t] = std > 1e-9 ? (curFR - mean) / std : 0;
    }

    return { zScores, meanFRs, stdFRs, atr21 };
  }

  /**
   * Evaluates hypothesis trigger conditions at period t.
   */
  static evaluateAt(candles8h, fundingRecords, stats, t, config) {
    const L = config.lookbackL || 90;
    if (t < L) return { isTrigger: false, side: 0 };

    const curFR = fundingRecords[t].fundingRate;
    const curZ = stats.zScores[t];
    const cNow = candles8h[t].close;
    const atr = stats.atr21[t];

    const mode = config.mode; // 'SHORT_SQUEEZE' (bet Long), 'LONG_FLUSH' (bet Short), 'SYMMETRIC'
    const metricType = config.metricType || 'ZSCORE'; // 'ZSCORE' or 'ABSOLUTE'
    const threshold = config.threshold; // e.g. 2.0 (Z) or 0.0003 (absolute)

    let isLong = false;
    let isShort = false;

    if (metricType === 'ZSCORE') {
      if (curZ <= -threshold) isLong = true;
      if (curZ >= threshold) isShort = true;
    } else if (metricType === 'ABSOLUTE') {
      if (curFR <= -threshold) isLong = true;
      if (curFR >= threshold) isShort = true;
    }

    let side = 0;
    if (mode === 'SHORT_SQUEEZE' && isLong) {
      side = 1; // Long
    } else if (mode === 'LONG_FLUSH' && isShort) {
      side = -1; // Short
    } else if (mode === 'SYMMETRIC') {
      if (isLong && !isShort) side = 1;
      else if (isShort && !isLong) side = -1;
    }

    if (side !== 0) {
      return {
        isTrigger: true,
        side,
        curFR,
        curZ,
        cNow,
        atrUnit: atr > 0 ? atr : 0.02 * cNow
      };
    }

    return { isTrigger: false, side: 0 };
  }
}

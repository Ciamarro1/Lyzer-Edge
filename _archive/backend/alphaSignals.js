/**
 * ARL v2 Signal Registry
 * Defines raw market signal hypotheses (primitives) for evaluation.
 */

export const signals = [
  {
    name: "breakout_momentum",
    description: "Triggers on breakout of previous candle's high/low with momentum confirmation.",
    trigger(candles, i, regime) {
      if (i < 2) return null;
      const current = candles[i];
      const prev = candles[i - 1];

      // Trend or high vol regimes favor breakout momentum
      if (current.close > prev.high) {
        return { direction: "LONG", price: current.close };
      } else if (current.close < prev.low) {
        return { direction: "SHORT", price: current.close };
      }
      return null;
    }
  },
  {
    name: "mean_reversion_lowvol",
    description: "Triggers when price deviates from the rolling mean during low volatility regimes.",
    trigger(candles, i, regime) {
      if (i < 20 || regime !== "low_vol") return null;

      const slice = candles.slice(i - 20, i + 1);
      const closes = slice.map(c => c.close);
      const sum = closes.reduce((a, b) => a + b, 0);
      const mean = sum / closes.length;

      const sqDiffs = closes.map(c => Math.pow(c - mean, 2));
      const variance = sqDiffs.reduce((a, b) => a + b, 0) / closes.length;
      const stdDev = Math.sqrt(variance);

      const current = candles[i];
      const lowerBand = mean - 2 * stdDev;
      const upperBand = mean + 2 * stdDev;

      if (current.close < lowerBand) {
        return { direction: "LONG", price: current.close };
      } else if (current.close > upperBand) {
        return { direction: "SHORT", price: current.close };
      }
      return null;
    }
  },
  {
    name: "wick_rejection",
    description: "Identifies candle bottom or top rejection indicating immediate direction reversal.",
    trigger(candles, i, regime) {
      if (i < 1) return null;
      const current = candles[i];
      const body = Math.abs(current.close - current.open);
      const totalRange = current.high - current.low;
      if (totalRange === 0) return null;

      const lowerWick = Math.min(current.open, current.close) - current.low;
      const upperWick = current.high - Math.max(current.open, current.close);

      // If lower wick is more than 60% of range, reject bottom (LONG)
      if (lowerWick / totalRange > 0.6) {
        return { direction: "LONG", price: current.close };
      }
      // If upper wick is more than 60% of range, reject top (SHORT)
      if (upperWick / totalRange > 0.6) {
        return { direction: "SHORT", price: current.close };
      }
      return null;
    }
  }
];

/**
 * DynamicWeightMatrix
 * 
 * Adjusts the influence of V1-V7 providers based on the current market regime.
 * High Volatility / Trend -> Higher weight for Tape (V7), Momentum (V3), and Causal (V4)
 * Low Volatility / Range -> Higher weight for Boundary (V2) and Wyckoff (V5)
 */
export class DynamicWeightMatrix {
  constructor() {
    this.BASE_MATRICES = {
      BALANCED: { v1: 1.0, v2: 1.0, v3: 1.0, v4: 1.0, v5: 1.0, v6: 1.0, v7: 1.0 },
      HIGH_VOLATILITY: { v1: 1.2, v2: 0.5, v3: 1.5, v4: 1.5, v5: 0.5, v6: 0.5, v7: 2.0 },
      RANGING: { v1: 1.0, v2: 1.8, v3: 0.8, v4: 0.5, v5: 1.6, v6: 1.5, v7: 0.4 },
      LOW_LIQUIDITY_NIGHT: { v1: 1.2, v2: 2.0, v3: 0.3, v4: 0.2, v5: 1.8, v6: 1.5, v7: 0.1 }
    };
  }

  detectRegime(atr, regimeSignal, hourUTC = null) {
    const ATR_HIGH = 0.002;
    const ATR_LOW = 0.0006;
    const sig = (regimeSignal || '').toUpperCase();

    // Asian session / Low liquidity night window (21:00 UTC to 06:00 UTC)
    const isNightWindow = hourUTC !== null ? (hourUTC >= 21 || hourUTC < 6) : false;

    if (atr > ATR_HIGH || sig.includes('TREND') || sig.includes('BREAKOUT') || sig.includes('IMBALANCE')) {
      return 'HIGH_VOLATILITY';
    }
    if (isNightWindow || (atr < ATR_LOW && (sig.includes('RANGE') || sig.includes('CHOP')))) {
      return 'LOW_LIQUIDITY_NIGHT';
    }
    if (sig.includes('RANGE') || sig.includes('CONSOLIDATION') || sig.includes('CHOP')) {
      return 'RANGING';
    }
    return 'BALANCED';
  }

  /**
   * Evaluates the dynamic weights for the current tick.
   * @param {number} atr - Topographical ATR
   * @param {string} regimeSignal - The regime signal from V6 Market Profile (e.g., 'TREND', 'RANGE')
   * @param {number|null} [hourUTC] - Current UTC hour (0-23)
   * @returns {Object} - Key-value pair of provider IDs to their dynamic multiplier with activeRegime
   */
  evaluate(atr, regimeSignal, hourUTC = null) {
    const activeRegime = this.detectRegime(atr, regimeSignal, hourUTC);
    const base = this.BASE_MATRICES[activeRegime] || this.BASE_MATRICES.BALANCED;
    return { ...base, activeRegime };
  }
}

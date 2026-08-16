/**
 * DynamicWeightMatrix
 * 
 * Adjusts the influence of V1-V7 providers based on the current market regime.
 * High Volatility / Trend -> Higher weight for Tape (V7), Momentum (V3), and Causal (V4)
 * Low Volatility / Range -> Higher weight for Boundary (V2) and Wyckoff (V5)
 */
export class DynamicWeightMatrix {
  /**
   * Evaluates the dynamic weights for the current tick.
   * @param {number} atr - Topographical ATR
   * @param {string} regimeSignal - The regime signal from V6 Market Profile (e.g., 'TREND', 'RANGE')
   * @returns {Object} - Key-value pair of provider IDs to their dynamic multiplier
   */
  evaluate(atr, regimeSignal) {
    const weights = { v1: 1.0, v2: 1.0, v3: 1.0, v4: 1.0, v5: 1.0, v6: 1.0, v7: 1.0 };
    
    // Static baseline for high volatility (can be converted to a rolling average in future iterations)
    const ATR_THRESHOLD_HIGH = 0.002; 
    const isVolatile = atr > ATR_THRESHOLD_HIGH;
    
    // Normalize V6 regime signals
    const regime = regimeSignal ? regimeSignal.toUpperCase() : 'UNKNOWN';
    const isTrending = regime.includes('TREND') || regime.includes('IMBALANCE') || regime.includes('BREAKOUT');
    const isRanging = regime.includes('RANGE') || regime.includes('CHOP') || regime.includes('CONSOLIDATION');
    
    if (isTrending) {
      weights.v3 = 1.5; // MomentumRSI has more authority in a trend
      weights.v1 = 1.2; // SMC structural breaks are more reliable
      weights.v2 = 0.5; // SNR support/resistance boundaries break easily in trend
    } else if (isRanging) {
      weights.v2 = 1.5; // SNR has peak authority in a range
      weights.v5 = 1.2; // Wyckoff accumulation/distribution dominates ranges
      weights.v3 = 0.5; // MomentumRSI generates false signals in chop
    }
    
    if (isVolatile) {
      weights.v7 = 2.0; // Tape Reading is highly predictive during volatile shocks
      weights.v4 = 1.5; // Institutional Microstructure Causality excels under high liquidity flux
    }

    return weights;
  }
}

/**
 * ALPHA FACTORY — AD005 CROSS-SECTIONAL DETECTOR
 * Module: ad005_cross_sectional_detector.js
 * 
 * Formal Mechanics:
 * - Operates across a synchronized panel of assets at hourly intervals.
 * - Computes past returns over lookback L: R_i(t) = P_i(t) / P_i(t-L) - 1.
 * - Ranks assets cross-sectionally.
 * - Selects Long and Short legs according to strategy (MOMENTUM vs MEAN_REVERSION).
 */

export class AD005CrossSectionalDetector {
  /**
   * Ranks assets cross-sectionally at time index t.
   * 
   * @param {Object} panel - Map of symbol -> array of candles
   * @param {Array<string>} symbols - List of symbols in universe
   * @param {number} t - Current time index
   * @param {number} L - Lookback window in hours
   * @param {string} strategy - 'MOMENTUM' or 'MEAN_REVERSION'
   */
  static selectPairAt(panel, symbols, t, L, strategy) {
    if (t < L) return null;

    const ranking = [];

    for (const sym of symbols) {
      const candles = panel[sym];
      const pNow = candles[t].close;
      const pPast = candles[t - L].close;
      const ret = pPast > 0 ? (pNow - pPast) / pPast : 0;

      ranking.push({
        symbol: sym,
        returnPast: ret,
        closeNow: pNow
      });
    }

    // Sort descending: highest return first
    ranking.sort((a, b) => b.returnPast - a.returnPast);

    const topAsset = ranking[0];
    const bottomAsset = ranking[ranking.length - 1];
    const spreadDispersion = topAsset.returnPast - bottomAsset.returnPast;

    if (strategy === 'MOMENTUM') {
      return {
        longSymbol: topAsset.symbol,
        shortSymbol: bottomAsset.symbol,
        longPastReturn: topAsset.returnPast,
        shortPastReturn: bottomAsset.returnPast,
        spreadDispersion,
        ranking
      };
    } else if (strategy === 'MEAN_REVERSION') {
      return {
        longSymbol: bottomAsset.symbol,
        shortSymbol: topAsset.symbol,
        longPastReturn: bottomAsset.returnPast,
        shortPastReturn: topAsset.returnPast,
        spreadDispersion,
        ranking
      };
    }

    return null;
  }
}

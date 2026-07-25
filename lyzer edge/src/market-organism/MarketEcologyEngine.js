/**
 * @fileoverview MarketEcologyEngine — Phase 11.1 (ADR-028)
 *
 * Monitors the broader market ecosystem across 4 environmental pillars:
 *   1. Liquidity state (HIGH, NORMAL, COMPRESSED, VACUUM)
 *   2. Volatility regime (LOW, NORMAL, EXPANDED, EXTREME)
 *   3. Market efficiency state (EFFICIENT, DEGRADING, INEFFICIENT)
 *   4. Competitive pressure (LOW, MEDIUM, HIGH)
 */
export class MarketEcologyEngine {
  /**
   * Analyzes current market metrics to derive the ecological state.
   *
   * @param {Object} metrics
   * @param {number} [metrics.volatility] - Market volatility index
   * @param {number} [metrics.spread] - Bid-ask spread
   * @param {number} [metrics.volume] - Volume indicator
   * @param {number} [metrics.efficiencyRatio] - Kaufman Efficiency Ratio or similar (0-1)
   * @returns {Object} Market Ecology State report
   */
  evaluateEcology(metrics = {}) {
    const vol = metrics.volatility !== undefined ? metrics.volatility : 0.02;
    const spread = metrics.spread !== undefined ? metrics.spread : 0.0002;
    const eff = metrics.efficiencyRatio !== undefined ? metrics.efficiencyRatio : 0.6;

    // 1. Liquidity State
    let liquidityState = 'NORMAL';
    if (spread > 0.003) liquidityState = 'LIQUIDITY_VACUUM';
    else if (spread > 0.001) liquidityState = 'LIQUIDITY_COMPRESSED';
    else if (spread < 0.0001) liquidityState = 'HIGH_LIQUIDITY';

    // 2. Volatility State
    let volatilityState = 'NORMAL';
    if (vol > 0.10) volatilityState = 'EXTREME';
    else if (vol > 0.05) volatilityState = 'EXPANDED';
    else if (vol < 0.01) volatilityState = 'LOW';

    // 3. Market Efficiency State
    let efficiencyState = 'EFFICIENT';
    if (eff < 0.3) efficiencyState = 'INEFFICIENT';
    else if (eff < 0.5) efficiencyState = 'DEGRADING';

    // 4. Competitive Pressure
    let competitivePressure = 'MEDIUM';
    if (volatilityState === 'EXTREME' || liquidityState === 'LIQUIDITY_VACUUM') {
      competitivePressure = 'HIGH';
    } else if (volatilityState === 'LOW' && efficiencyState === 'EFFICIENT') {
      competitivePressure = 'LOW';
    }

    return {
      ecology_id: `eco_${Date.now()}`,
      liquidity_state: liquidityState,
      volatility_state: volatilityState,
      efficiency_state: efficiencyState,
      competitive_pressure: competitivePressure,
      raw_metrics: {
        volatility: vol,
        spread,
        efficiency_ratio: eff
      },
      evaluated_at: Date.now()
    };
  }
}

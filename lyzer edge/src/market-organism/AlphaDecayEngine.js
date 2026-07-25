/**
 * @fileoverview AlphaDecayEngine — Phase 11.3 (ADR-028)
 *
 * Measures alpha half-life, Sharpe degradation, and model obsolescence.
 * Marks strategy state as ACTIVE, AGING, or OBSOLETE.
 */
export class AlphaDecayEngine {
  constructor(config = {}) {
    this.sharpeDecayThresholdPct = config.sharpeDecayThresholdPct || 40.0; // 40% drop vs peak = AGING
    this.obsolescenceSharpeThreshold = config.obsolescenceSharpeThreshold || 0.2; // Sharpe < 0.2 = OBSOLETE
  }

  /**
   * Evaluates alpha decay for a strategy over its lifetime.
   *
   * @param {Object} strategyGenome - StrategyGenome object
   * @param {Object} performanceHistory - { peak_sharpe, current_sharpe, lifetime_trades, days_active }
   * @returns {Object} Alpha Decay Report
   */
  evaluateDecay(strategyGenome = {}, performanceHistory = {}) {
    const strategyId = strategyGenome.strategy_id || 'strat_unknown';
    const peakSharpe = performanceHistory.peak_sharpe || 2.0;
    const currentSharpe = performanceHistory.current_sharpe || 1.5;
    const daysActive = performanceHistory.days_active || 30;

    const sharpeDropPct = peakSharpe > 0
      ? Number((((peakSharpe - currentSharpe) / peakSharpe) * 100).toFixed(2))
      : 0;

    // Alpha Half-Life estimation (days to 50% decay)
    let alphaHalfLifeDays = 365; // default 1 year
    if (sharpeDropPct > 0 && daysActive > 5) {
      const decayRatePerDay = (sharpeDropPct / 100) / daysActive;
      alphaHalfLifeDays = decayRatePerDay > 0
        ? Number((0.5 / decayRatePerDay).toFixed(1))
        : 365;
    }

    let status = 'ACTIVE';
    let recommendation = 'MAINTAIN';

    if (currentSharpe <= this.obsolescenceSharpeThreshold || sharpeDropPct >= 65.0) {
      status = 'OBSOLETE';
      recommendation = 'DECOMMISSION_AND_MUTATE';
    } else if (sharpeDropPct >= this.sharpeDecayThresholdPct) {
      status = 'AGING';
      recommendation = 'TRIGGER_CO_EVOLUTION_MUTATION';
    }

    return {
      strategy_id: strategyId,
      status,
      recommendation,
      is_obsolete: status === 'OBSOLETE',
      is_aging: status === 'AGING',
      peak_sharpe: peakSharpe,
      current_sharpe: currentSharpe,
      sharpe_decay_pct: sharpeDropPct,
      estimated_half_life_days: alphaHalfLifeDays,
      evaluated_at: Date.now()
    };
  }
}

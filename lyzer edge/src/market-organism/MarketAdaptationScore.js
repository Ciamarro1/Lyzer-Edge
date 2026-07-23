/**
 * @fileoverview MarketAdaptationScore — Phase 11.5 (ADR-028)
 *
 * Calculates the global Market Adaptation Score (MAS ∈ [0, 100%]).
 *
 * Formula:
 *   MAS = 0.30 * RegimeAdaptability + 0.30 * AlphaSurvival + 0.20 * EvolutionSpeed + 0.20 * Robustness
 *
 * Zones:
 *   90-100: ADAPTIVE_ORGANISM
 *   70-89:  HEALTHY
 *   50-69:  STRESSED
 *   < 50:   EVOLUTION_REQUIRED (triggers auto-mutation cycle)
 */
export class MarketAdaptationScore {
  /**
   * Calculates the global Market Adaptation Score (MAS).
   *
   * @param {Object} options
   * @param {Object} options.ecologyReport - Output from MarketEcologyEngine
   * @param {Object} options.competitionReport - Output from StrategyCompetitionEngine
   * @param {Array<Object>} options.decayReports - Array of outputs from AlphaDecayEngine
   * @param {number} [options.mutationRate] - Rate of successful mutations
   * @returns {Object} MAS Calculation Report
   */
  calculate({ ecologyReport = {}, competitionReport = {}, decayReports = [], mutationRate = 0.8 }) {
    // 1. Regime Adaptability (0 - 100)
    const isEcologyHealthy = ecologyReport.volatility_state !== 'EXTREME' && ecologyReport.liquidity_state !== 'LIQUIDITY_VACUUM';
    const regimeAdaptability = isEcologyHealthy ? 95 : 65;

    // 2. Alpha Survival (0 - 100)
    const activeCount = decayReports.filter(d => d.status === 'ACTIVE').length;
    const totalCount = decayReports.length || 1;
    const alphaSurvival = Math.min(100, Math.max(0, (activeCount / totalCount) * 100));

    // 3. Evolution Speed (0 - 100)
    const evolutionSpeed = Math.min(100, mutationRate * 100);

    // 4. Robustness (0 - 100)
    const topFitness = competitionReport.top_fitness_score || 70;
    const robustness = Math.min(100, topFitness);

    // Weighted MAS
    const rawMas = (regimeAdaptability * 0.30) + (alphaSurvival * 0.30) + (evolutionSpeed * 0.20) + (robustness * 0.20);
    const mas = Number(Math.min(100, Math.max(0, rawMas)).toFixed(2));

    // Zone classification
    let zone, actionRequired;
    if (mas >= 90.0) {
      zone = 'ADAPTIVE_ORGANISM';
      actionRequired = 'NONE';
    } else if (mas >= 70.0) {
      zone = 'HEALTHY';
      actionRequired = 'MONITOR';
    } else if (mas >= 50.0) {
      zone = 'STRESSED';
      actionRequired = 'INCREASE_MUTATION_RATE';
    } else {
      zone = 'EVOLUTION_REQUIRED';
      actionRequired = 'TRIGGER_AUTOMATIC_MUTATION_CYCLE';
    }

    return {
      mas,
      zone,
      action_required: actionRequired,
      is_adaptive: zone === 'ADAPTIVE_ORGANISM' || zone === 'HEALTHY',
      requires_mutation: zone === 'EVOLUTION_REQUIRED',
      components: {
        regime_adaptability: Number(regimeAdaptability.toFixed(2)),
        alpha_survival: Number(alphaSurvival.toFixed(2)),
        evolution_speed: Number(evolutionSpeed.toFixed(2)),
        robustness: Number(robustness.toFixed(2))
      },
      calculated_at: Date.now()
    };
  }
}

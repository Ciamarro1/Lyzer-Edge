/**
 * @fileoverview StrategyCompetitionEngine — Phase 11.2 (ADR-028)
 *
 * Models strategy genomes as competing species in the market ecosystem.
 * Evaluates relative fitness, market share of alpha, and evolutionary advancement vs decline.
 */
export class StrategyCompetitionEngine {
  /**
   * Evaluates relative fitness and competition status among strategy genomes.
   *
   * @param {Array<Object>} genomes - Array of StrategyGenome objects (with CAS, CES, EHS)
   * @param {Object} [performanceMap] - Map of strategy_id -> { current_pnl, recent_sharpe, win_rate }
   * @returns {Object} Strategy Competition Report
   */
  evaluateCompetition(genomes = [], performanceMap = {}) {
    if (!genomes || genomes.length === 0) {
      return {
        dominant_species: null,
        declining_species: [],
        competition_map: [],
        evaluated_at: Date.now()
      };
    }

    const competitionMap = [];
    let topFitness = -1;
    let dominantSpecies = null;
    const decliningSpecies = [];

    for (const genome of genomes) {
      const id = genome.strategy_id;
      const perf = performanceMap[id] || { recent_sharpe: 1.0, current_pnl: 0 };
      const cas = genome.cas_score || 70;
      const sharpe = perf.recent_sharpe || 1.0;

      // Fitness Score = 0.6 * CAS + 0.4 * (Sharpe * 20)
      const fitness = Number((cas * 0.60 + Math.max(0, sharpe) * 20).toFixed(2));

      let competitionStatus = 'HEALTHY';
      if (fitness > 85) {
        competitionStatus = 'DOMINANT';
      } else if (fitness < 50 || sharpe < 0.2) {
        competitionStatus = 'DECLINING';
        decliningSpecies.push(id);
      }

      if (fitness > topFitness) {
        topFitness = fitness;
        dominantSpecies = id;
      }

      competitionMap.push({
        strategy_id: id,
        name: genome.name || id,
        fitness_score: fitness,
        cas_score: cas,
        recent_sharpe: sharpe,
        status: competitionStatus
      });
    }

    return {
      dominant_species: dominantSpecies,
      top_fitness_score: topFitness,
      declining_species_count: decliningSpecies.length,
      declining_species: decliningSpecies,
      competition_map: competitionMap,
      evaluated_at: Date.now()
    };
  }
}

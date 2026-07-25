import { MarketEcologyEngine } from './MarketEcologyEngine.js';
import { StrategyCompetitionEngine } from './StrategyCompetitionEngine.js';
import { AlphaDecayEngine } from './AlphaDecayEngine.js';
import { StrategyMutationEngine } from './StrategyMutationEngine.js';
import { MarketAdaptationScore } from './MarketAdaptationScore.js';

export class CognitiveOrganismFacade {
  constructor(causalMemoryDB, config = {}) {
    this.db = causalMemoryDB;
    this.ecologyEngine = new MarketEcologyEngine();
    this.competitionEngine = new StrategyCompetitionEngine();
    this.decayEngine = new AlphaDecayEngine(config);
    this.mutationEngine = new StrategyMutationEngine();
    this.masScorer = new MarketAdaptationScore();
  }

  evaluateEcology(metrics) {
    return this.ecologyEngine.evaluateEcology(metrics);
  }

  evaluateCompetition(genomes, performanceMap) {
    return this.competitionEngine.evaluateCompetition(genomes, performanceMap);
  }

  evaluateDecay(genome, performanceHistory) {
    return this.decayEngine.evaluateDecay(genome, performanceHistory);
  }

  mutateStrategy(parentGenome, mutationOptions) {
    return this.mutationEngine.mutate(parentGenome, mutationOptions);
  }

  calculateMAS(options) {
    return this.masScorer.calculate(options);
  }

  /**
   * Runs an end-to-end Cognitive Market Organism life cycle:
   *   1. Evaluates Market Ecology
   *   2. Evaluates Strategy Species Competition
   *   3. Evaluates Alpha Decay for all active genomes
   *   4. Calculates MAS (Market Adaptation Score)
   *   5. Auto-triggers mutations if MAS < 50 or strategies are aging
   *
   * @param {Object} options
   * @param {Object} options.marketMetrics - Current volatility, spread, efficiency
   * @param {Array<Object>} options.genomes - Active strategy genomes
   * @param {Object} [options.performanceMap] - Performance map for genomes
   * @returns {Object} Organism Cycle Verdict
   */
  runOrganismCycle({ marketMetrics = {}, genomes = [], performanceMap = {} }) {
    const ecology = this.ecologyEngine.evaluateEcology(marketMetrics);
    const competition = this.competitionEngine.evaluateCompetition(genomes, performanceMap);

    const decayReports = genomes.map(g => {
      const perf = performanceMap[g.strategy_id] || {};
      return this.decayEngine.evaluateDecay(g, perf);
    });

    const masReport = this.masScorer.calculate({
      ecologyReport: ecology,
      competitionReport: competition,
      decayReports,
      mutationRate: 0.85
    });

    // Auto-trigger mutations for aging or obsolete genomes
    const mutatedGenomes = [];
    for (const decay of decayReports) {
      if (decay.is_aging || decay.is_obsolete || masReport.requires_mutation) {
        const parent = genomes.find(g => g.strategy_id === decay.strategy_id);
        if (parent) {
          const child = this.mutationEngine.mutate(parent, {
            target_parameter: 'TruthKernel.LHDS_VETO_LIMIT',
            shift_pct: 10.0,
            added_filter: 'VOLATILITY_ADAPTIVE_FILTER'
          });
          mutatedGenomes.push(child);
        }
      }
    }

    return {
      cycle_id: `org_cycle_${Date.now()}`,
      ecology,
      competition,
      decay_reports_count: decayReports.length,
      mas_report: masReport,
      auto_mutated_genomes_count: mutatedGenomes.length,
      mutated_genomes: mutatedGenomes,
      executed_at: Date.now()
    };
  }
}

export {
  MarketEcologyEngine,
  StrategyCompetitionEngine,
  AlphaDecayEngine,
  StrategyMutationEngine,
  MarketAdaptationScore
};

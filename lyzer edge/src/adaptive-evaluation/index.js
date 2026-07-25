import { AdaptationImpactAnalyzer } from './AdaptationImpactAnalyzer.js';
import { RegimeStressEvaluator } from './RegimeStressEvaluator.js';
import { AdaptationRiskScore } from './AdaptationRiskScore.js';
import { EvolutionLedger } from './EvolutionLedger.js';

export class AdaptiveEvaluationFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.impactAnalyzer = new AdaptationImpactAnalyzer();
    this.regimeEvaluator = new RegimeStressEvaluator();
    this.riskScorer = new AdaptationRiskScore();
    this.evolutionLedger = new EvolutionLedger(causalMemoryDB);
  }

  analyzeImpact(options) {
    return this.impactAnalyzer.analyze(options);
  }

  evaluateRegimeStability(regimeResults) {
    return this.regimeEvaluator.evaluate(regimeResults);
  }

  calculateARS(options) {
    return this.riskScorer.calculate(options);
  }

  async recordEvolution(entry) {
    return await this.evolutionLedger.record(entry);
  }

  async recordObservedResult(ledgerId, observedResult) {
    return await this.evolutionLedger.recordObservedResult(ledgerId, observedResult);
  }

  async getEvolutionHistory(module, parameter) {
    return await this.evolutionLedger.getEvolutionHistory(module, parameter);
  }

  async getFullLedger() {
    return await this.evolutionLedger.getFullLedger();
  }

  /**
   * Runs the full evaluation pipeline: Impact → Regime → ARS.
   * Returns a comprehensive evaluation verdict.
   */
  evaluateProposal({ productionResults, shadowResults, regimeResults }) {
    const impact = this.impactAnalyzer.analyze({ productionResults, shadowResults });
    const regime = this.regimeEvaluator.evaluate(regimeResults);
    const ars = this.riskScorer.calculate({ impactAnalysis: impact, regimeEvaluation: regime });

    return {
      impact,
      regime,
      ars,
      verdict: ars.is_blocked ? 'BLOCKED' : regime.is_rejected ? 'REJECTED_REGIME' : ars.is_promotable ? 'PROMOTABLE' : 'OBSERVATION'
    };
  }
}

export { AdaptationImpactAnalyzer, RegimeStressEvaluator, AdaptationRiskScore, EvolutionLedger };

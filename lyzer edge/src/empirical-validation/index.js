import { EmpiricalValidationEngine } from './EmpiricalValidationEngine.js';
import { StatisticalSignificanceEngine } from './StatisticalSignificanceEngine.js';
import { CausalEvidenceScorer } from './CausalEvidenceScorer.js';
import { KnowledgeMaturationPipeline } from './KnowledgeMaturationPipeline.js';
import { ResearchExperimentEngine } from './ResearchExperimentEngine.js';

export class EmpiricalValidationFacade {
  constructor(causalMemoryDB, config = {}) {
    this.db = causalMemoryDB;
    this.validationEngine = new EmpiricalValidationEngine();
    this.statisticalEngine = new StatisticalSignificanceEngine(config);
    this.scorer = new CausalEvidenceScorer();
    this.maturationPipeline = new KnowledgeMaturationPipeline(causalMemoryDB);
    this.experimentEngine = new ResearchExperimentEngine();
  }

  evaluateEmpiricalData(candidate, occurrences) {
    return this.validationEngine.evaluate(candidate, occurrences);
  }

  evaluateSignificance(empiricalSummary, regimeBreakdown) {
    return this.statisticalEngine.evaluateSignificance(empiricalSummary, regimeBreakdown);
  }

  calculateCES(options) {
    return this.scorer.calculate(options);
  }

  advanceMaturity(options) {
    return this.maturationPipeline.advanceMaturity(options);
  }

  runWalkForwardValidation(options) {
    return this.experimentEngine.runWalkForwardValidation(options);
  }

  /**
   * Runs the full empirical validation pipeline on a candidate strategy or hypothesis.
   *
   * @param {Object} options
   * @param {Object} options.candidate - Candidate strategy package
   * @param {Array}  options.occurrences - Historical outcome dataset
   * @param {Object} [options.regimeBreakdown] - Map of regime -> Array of PnLs
   * @returns {Object} Full empirical validation report
   */
  validateCandidate({ candidate = {}, occurrences = [], regimeBreakdown = {} }) {
    const empirical = this.validationEngine.evaluate(candidate, occurrences);
    const statistical = this.statisticalEngine.evaluateSignificance(empirical, regimeBreakdown);
    const ces = this.scorer.calculate({
      empiricalSummary: empirical,
      statisticalReport: statistical,
      regimesTestedCount: Object.keys(regimeBreakdown).length || 1,
      timeBlocksTestedCount: 4
    });

    const wfv = this.experimentEngine.runWalkForwardValidation({
      hypothesisId: candidate.candidate_id || candidate.hypothesis_id || 'cand_01',
      timelineData: occurrences
    });

    const maturation = this.maturationPipeline.advanceMaturity({
      patternId: candidate.target_parameter || 'pattern_01',
      cesScore: ces.ces,
      verificationCount: occurrences.length,
      currentStage: 'HYPOTHESIS'
    });

    const isApprovedForSandbox = (ces.is_proven || ces.is_promising) && wfv.is_passed;

    return {
      candidate_id: candidate.candidate_id || candidate.hypothesis_id,
      is_approved_for_sandbox: isApprovedForSandbox,
      verdict: ces.verdict,
      empirical_summary: empirical,
      statistical_report: statistical,
      ces_score: ces,
      walk_forward_validation: wfv,
      knowledge_maturation: maturation,
      validated_at: Date.now()
    };
  }
}

export {
  EmpiricalValidationEngine,
  StatisticalSignificanceEngine,
  CausalEvidenceScorer,
  KnowledgeMaturationPipeline,
  ResearchExperimentEngine
};

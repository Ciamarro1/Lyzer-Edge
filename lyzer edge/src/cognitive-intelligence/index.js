import { RegimeDiscoveryEngine } from './RegimeDiscoveryEngine.js';
import { FeatureDiscoveryEngine } from './FeatureDiscoveryEngine.js';
import { HypothesisGenerator } from './HypothesisGenerator.js';
import { AnomalyDetectionEngine } from './AnomalyDetectionEngine.js';
import { StrategyCandidateEngine } from './StrategyCandidateEngine.js';

export class CognitiveIntelligenceFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.regimeEngine = new RegimeDiscoveryEngine();
    this.featureEngine = new FeatureDiscoveryEngine();
    this.hypothesisEngine = new HypothesisGenerator();
    this.anomalyEngine = new AnomalyDetectionEngine();
    this.candidateEngine = new StrategyCandidateEngine();
  }

  discoverRegime(marketSnapshots) {
    return this.regimeEngine.discover(marketSnapshots);
  }

  discoverFeatures(dataset) {
    return this.featureEngine.discoverFeatures(dataset);
  }

  generateHypotheses(options) {
    return this.hypothesisEngine.generateHypotheses(options);
  }

  detectAnomaly(currentSnapshot, baseline) {
    return this.anomalyEngine.detectAnomaly(currentSnapshot, baseline);
  }

  createCandidates(options) {
    return this.candidateEngine.createCandidates(options);
  }

  /**
   * Runs an end-to-end Cognitive Market Intelligence cycle:
   *   1. Regime Discovery
   *   2. Feature Discovery
   *   3. Hypothesis Generation
   *   4. Strategy Candidate Synthesis
   *
   * @param {Object} options
   * @param {Array}  options.marketSnapshots - Market snapshots for regime discovery
   * @param {Array}  options.dataset - Dataset for feature discovery
   * @param {Object} [options.currentState] - Baseline parameter values
   * @returns {Object} Full intelligence cycle result
   */
  runIntelligenceCycle({ marketSnapshots = [], dataset = [], currentState = {} }) {
    const regime = this.regimeEngine.discover(marketSnapshots);
    const features = this.featureEngine.discoverFeatures(dataset);
    const hypotheses = this.hypothesisEngine.generateHypotheses({
      regimeInfo: regime,
      discoveredFeatures: features,
      currentState
    });
    const candidates = this.candidateEngine.createCandidates({
      hypotheses,
      regimeInfo: regime,
      discoveredFeatures: features
    });

    return {
      cycle_id: `intel_${Date.now()}`,
      regime,
      discovered_features_count: features.length,
      hypotheses_generated_count: hypotheses.length,
      candidates_count: candidates.length,
      features,
      hypotheses,
      candidates,
      executed_at: Date.now()
    };
  }
}

export {
  RegimeDiscoveryEngine,
  FeatureDiscoveryEngine,
  HypothesisGenerator,
  AnomalyDetectionEngine,
  StrategyCandidateEngine
};

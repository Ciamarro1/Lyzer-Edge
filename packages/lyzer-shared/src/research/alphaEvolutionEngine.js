import { ReplayEngine } from './replayEngine.js';
import { StatisticalValidator } from './statisticalValidator.js';

export const HypothesisState = {
  PROPOSED: 'PROPOSED',
  RUNNING: 'RUNNING',
  SIGNIFICANT: 'SIGNIFICANT',
  NOT_SIGNIFICANT: 'NOT_SIGNIFICANT',
  DEPLOYED: 'DEPLOYED',
  REJECTED: 'REJECTED'
};

export class HypothesisRegistry {
  constructor() {
    this.hypotheses = new Map();
  }

  register(hypothesis) {
    const id = hypothesis.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const entry = { 
      ...hypothesis, 
      id, 
      status: HypothesisState.PROPOSED,
      createdAt: new Date().toISOString()
    };
    this.hypotheses.set(id, entry);
    return id;
  }

  updateStatus(id, status, results = null) {
    const entry = this.hypotheses.get(id);
    if (!entry) throw new Error(`Hypothesis ${id} not found`);
    entry.status = status;
    entry.updatedAt = new Date().toISOString();
    
    if (results) {
      entry.results = {
        ...(entry.results || {}),
        ...results
      };
    }
    this.hypotheses.set(id, entry);
  }

  get(id) {
    return this.hypotheses.get(id);
  }

  getAll() {
    return Array.from(this.hypotheses.values());
  }

  toJSON() {
    return JSON.stringify(this.getAll(), null, 2);
  }

  fromJSON(jsonString) {
    const data = JSON.parse(jsonString);
    this.hypotheses.clear();
    for (const item of data) {
      this.hypotheses.set(item.id, item);
    }
  }
}

export class DriftDetector {
  constructor(windowSize = 100) {
    this.windowSize = windowSize;
    this.history = [];
  }

  observe(metrics) {
    this.history.push({ timestamp: Date.now(), ...metrics });
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
  }

  detectDrift() {
    if (this.history.length < this.windowSize) return { drifted: false, confidence: 0 };
    
    const mid = Math.floor(this.history.length / 2);
    const early = this.history.slice(0, mid);
    const recent = this.history.slice(mid);

    const earlySharpe = early.reduce((sum, m) => sum + (m.sharpe || 0), 0) / early.length;
    const recentSharpe = recent.reduce((sum, m) => sum + (m.sharpe || 0), 0) / recent.length;

    // Detect drift if recent Sharpe ratio is significantly lower than early Sharpe ratio
    const driftRatio = recentSharpe / (earlySharpe || 1);
    const drifted = driftRatio < 0.8; 
    
    return {
      drifted,
      earlySharpe,
      recentSharpe,
      confidence: drifted ? (1 - driftRatio) : 0
    };
  }
}

export class ExperimentRunner {
  constructor(registry) {
    this.registry = registry;
    this.validator = new StatisticalValidator();
  }

  async run(hypothesisId, candles) {
    const hypothesis = this.registry.get(hypothesisId);
    if (!hypothesis) throw new Error("Hypothesis not found");
    
    this.registry.updateStatus(hypothesisId, HypothesisState.RUNNING);

    try {
      // Run Baseline
      const baselineEngine = new ReplayEngine(hypothesis.baselineConfig);
      const baselineResult = baselineEngine.replay(candles);

      // Run Experiment
      const expEngine = new ReplayEngine(hypothesis.experimentConfig);
      const expResult = expEngine.replay(candles);

      // Statistically validate differences
      const comparison = this.validator.compare(
        baselineResult.trades || [],
        expResult.trades || []
      );
      
      const status = comparison.welchTest?.isSignificant 
        ? HypothesisState.SIGNIFICANT 
        : HypothesisState.NOT_SIGNIFICANT;
      
      const results = {
        baselineMetrics: baselineResult.stats,
        experimentMetrics: expResult.stats,
        pValue: comparison.welchTest?.pValue,
        tStatistic: comparison.welchTest?.tStatistic
      };

      this.registry.updateStatus(hypothesisId, status, results);
      return results;
    } catch (e) {
      this.registry.updateStatus(hypothesisId, HypothesisState.REJECTED, { error: e.message });
      throw e;
    }
  }
}

export class AlphaEvolutionEngine {
  constructor() {
    this.registry = new HypothesisRegistry();
    this.runner = new ExperimentRunner(this.registry);
    this.driftDetector = new DriftDetector();
  }

  /**
   * Propose a new research hypothesis.
   */
  propose(name, description, baselineConfig, experimentConfig, metricsToCompare = ['sharpe', 'winRate']) {
    return this.registry.register({
      name,
      description,
      baselineConfig,
      experimentConfig,
      metricsToCompare
    });
  }

  /**
   * Run the experiment.
   */
  async runExperiment(id, ticks) {
    return this.runner.run(id, ticks);
  }

  /**
   * Approve or reject a hypothesis based on experiment results.
   */
  evaluate(id) {
    const hypothesis = this.registry.get(id);
    if (!hypothesis || !hypothesis.results) {
      return false;
    }

    if (hypothesis.status === HypothesisState.SIGNIFICANT) {
      const baseSharpe = hypothesis.results.baselineMetrics?.sharpe || 0;
      const expSharpe = hypothesis.results.experimentMetrics?.sharpe || 0;
      
      // Validation logic: did the experiment actually improve performance?
      if (expSharpe > baseSharpe) {
        this.registry.updateStatus(id, HypothesisState.DEPLOYED);
        return true;
      } else {
        this.registry.updateStatus(id, HypothesisState.REJECTED, { reason: 'Negative alpha contribution' });
        return false;
      }
    }
    
    // If not significant, reject
    this.registry.updateStatus(id, HypothesisState.REJECTED, { reason: 'Not statistically significant' });
    return false;
  }

  /**
   * Continuous monitoring of deployed alphas for drift.
   */
  monitor(liveMetrics) {
    this.driftDetector.observe(liveMetrics);
    return this.driftDetector.detectDrift();
  }
}

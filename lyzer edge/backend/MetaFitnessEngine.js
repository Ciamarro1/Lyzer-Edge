/**
 * ARL v3.2 Meta Fitness Engine
 * Computes fitness with adaptive weighting based on environment metrics.
 */

export class MetaFitnessEngine {
  constructor() {
    this.alpha = 0.5; // EV weight
    this.beta = 0.3;  // stability weight
    this.gamma = 0.2; // drawdown weight
  }

  evaluate(strategyMetrics) {
    const { EV, stability, drawdown } = strategyMetrics;
    return EV * this.alpha + stability * this.beta + (1 - drawdown) * this.gamma;
  }

  adapt(envMetrics) {
    if (envMetrics.volatility > 0.7) {
      this.alpha *= 0.9;
    }
    if (envMetrics.chopiness > 0.5) {
      this.beta *= 1.1;
    }
  }
}

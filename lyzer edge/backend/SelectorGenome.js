/**
 * ARL v3.2 Selector Genome
 * Defines the evolutionary selection policies that decide strategy survival.
 */

export class SelectorGenome {
  constructor(id) {
    this.id = id;
    this.thresholds = {
      minEV: Math.random() * 0.02,       // Scaled to realistic percentage EV
      maxDrawdown: Math.random() * 0.1,  // Scaled to realistic percentage Drawdown
      minStability: Math.random() * 0.7,
    };
    this.regimeWeights = {
      trend_up: Math.random(),
      trend_down: Math.random(),
      low_vol: Math.random(),
      chop: Math.random(),
    };
    this.fitnessScore = 0;
  }

  mutate() {
    for (let k in this.thresholds) {
      this.thresholds[k] += (Math.random() - 0.5) * 0.05;
      this.thresholds[k] = Math.max(0, this.thresholds[k]);
    }
    for (let k in this.regimeWeights) {
      this.regimeWeights[k] = Math.max(0, Math.min(1, this.regimeWeights[k] + (Math.random() - 0.5) * 0.1));
    }
  }

  crossover(other) {
    const child = new SelectorGenome(`${this.id}-${other.id}`);
    for (let k in this.thresholds) {
      child.thresholds[k] = Math.random() < 0.5 ? this.thresholds[k] : other.thresholds[k];
    }
    for (let k in this.regimeWeights) {
      child.regimeWeights[k] = Math.random() < 0.5 ? this.regimeWeights[k] : other.regimeWeights[k];
    }
    return child;
  }

  score(strategyMetrics) {
    let s = 0;
    if (strategyMetrics.EV >= this.thresholds.minEV) s += 1;
    if (strategyMetrics.drawdown <= this.thresholds.maxDrawdown) s += 1;
    if (strategyMetrics.stability >= this.thresholds.minStability) s += 1;
    s *= this.regimeWeights[strategyMetrics.regime] || 0.5;
    this.fitnessScore = s;
    return s;
  }
}

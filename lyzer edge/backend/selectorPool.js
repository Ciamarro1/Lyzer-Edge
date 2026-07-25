/**
 * ARL v3.3 Selector Pool
 * Coordinates co-evolution of adversarial selector predator genomes.
 */

import { SelectorGenome } from './SelectorGenome.js';

export class SelectorPredator extends SelectorGenome {
  constructor(id) {
    super(id);
    this.strategyProfile = {
      aggressionLevel: Math.random(),        // 0..1 (multiplies minimum target expected value)
      deceptionBias: Math.random(),          // 0..1 (applies simulated slippage/timing offset penalty)
      volatilityPreference: Math.random() < 0.5 ? 'high' : 'low',
      collapseSeekingBehavior: Math.random() > 0.5
    };
  }

  mutate() {
    super.mutate();
    this.strategyProfile.aggressionLevel = Math.max(0.0, Math.min(1.0, this.strategyProfile.aggressionLevel + (Math.random() - 0.5) * 0.15));
    this.strategyProfile.deceptionBias = Math.max(0.0, Math.min(1.0, this.strategyProfile.deceptionBias + (Math.random() - 0.5) * 0.15));
    if (Math.random() < 0.2) {
      this.strategyProfile.volatilityPreference = this.strategyProfile.volatilityPreference === 'high' ? 'low' : 'high';
    }
    if (Math.random() < 0.2) {
      this.strategyProfile.collapseSeekingBehavior = !this.strategyProfile.collapseSeekingBehavior;
    }
  }

  crossover(other) {
    const child = new SelectorPredator(`SEL_C_${Math.floor(Math.random() * 1000)}`);
    child.thresholds = { ...this.thresholds };
    for (let k in this.thresholds) {
      child.thresholds[k] = Math.random() < 0.5 ? this.thresholds[k] : other.thresholds[k];
    }
    child.regimeWeights = { ...this.regimeWeights };
    for (let k in this.regimeWeights) {
      child.regimeWeights[k] = Math.random() < 0.5 ? this.regimeWeights[k] : other.regimeWeights[k];
    }
    child.strategyProfile = {
      aggressionLevel: Math.random() < 0.5 ? this.strategyProfile.aggressionLevel : other.strategyProfile.aggressionLevel,
      deceptionBias: Math.random() < 0.5 ? this.strategyProfile.deceptionBias : other.strategyProfile.deceptionBias,
      volatilityPreference: Math.random() < 0.5 ? this.strategyProfile.volatilityPreference : other.strategyProfile.volatilityPreference,
      collapseSeekingBehavior: Math.random() < 0.5 ? this.strategyProfile.collapseSeekingBehavior : other.strategyProfile.collapseSeekingBehavior
    };
    return child;
  }

  score(strategyMetrics) {
    // 1. Aggression scale target EV and DD challenge parameters
    const minEVChallenge = this.thresholds.minEV * (1.0 + this.strategyProfile.aggressionLevel * 0.6);
    const maxDrawdownChallenge = this.thresholds.maxDrawdown * (1.0 - this.strategyProfile.aggressionLevel * 0.25);

    // 2. Deception bias adds fake slippage/spread simulation
    const deceptionPenalty = this.strategyProfile.deceptionBias * 0.003; 
    const finalEV = strategyMetrics.EV - deceptionPenalty;

    let s = 0;
    if (finalEV >= minEVChallenge) s += 1;
    if (strategyMetrics.drawdown <= maxDrawdownChallenge) s += 1;
    if (strategyMetrics.stability >= this.thresholds.minStability) s += 1;

    // Volatility compatibility bonus
    const isHighVol = strategyMetrics.regime === 'trend_up' || strategyMetrics.regime === 'trend_down';
    if (this.strategyProfile.volatilityPreference === 'high' && isHighVol) s += 0.5;
    else if (this.strategyProfile.volatilityPreference === 'low' && !isHighVol) s += 0.5;

    // Collapse seeking behavior targets fragile/decaying genomes
    if (this.strategyProfile.collapseSeekingBehavior && strategyMetrics.stability < 0.45) {
      s *= 0.15;
    } else {
      s *= this.regimeWeights[strategyMetrics.regime] || 0.5;
    }

    this.fitnessScore = s;
    return s;
  }
}

export class SelectorPool {
  constructor(size = 20) {
    this.size = size;
    this.selectors = Array.from({ length: size }, (_, i) => new SelectorPredator(`SEL_${i}`));
  }

  step(ecosystemState) {
    this.selectors.sort((a, b) => b.fitnessScore - a.fitnessScore);
    const eliteSize = 5;
    const elites = this.selectors.slice(0, eliteSize);

    const nextGeneration = [];
    
    // Save elites directly
    for (let el of elites) {
      const clone = new SelectorPredator(`SEL_E_${Math.floor(Math.random() * 1000)}`);
      clone.thresholds = { ...el.thresholds };
      clone.regimeWeights = { ...el.regimeWeights };
      clone.strategyProfile = { ...el.strategyProfile };
      nextGeneration.push(clone);
    }

    // Crossover/mutate remaining selectors
    while (nextGeneration.length < this.size) {
      const pA = elites[Math.floor(Math.random() * elites.length)];
      const pB = elites[Math.floor(Math.random() * elites.length)];
      const child = pA.crossover(pB);
      child.mutate();

      // Adjust predator strategy behaviors based on global ecosystem warnings
      if (ecosystemState === 'CRITICAL') {
        child.strategyProfile.aggressionLevel = Math.min(1.0, child.strategyProfile.aggressionLevel * 1.35);
      } else if (ecosystemState === 'STRESS') {
        child.strategyProfile.deceptionBias = Math.min(1.0, child.strategyProfile.deceptionBias * 1.2);
      }

      nextGeneration.push(child);
    }

    this.selectors = nextGeneration;
  }

  scoreStrategy(strategy) {
    let sumScore = 0;
    this.selectors.forEach(sel => {
      sumScore += sel.score(strategy.metrics());
    });
    return sumScore / this.selectors.length;
  }

  resetSelectors() {
    this.selectors = Array.from({ length: this.size }, (_, i) => new SelectorPredator(`SEL_R_${i}`));
  }
}

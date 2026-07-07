/**
 * ARL v3.3 Evolutionary Research Engine
 * Coordinates populations, fitness simulations, and the Extinction state machine.
 */

import { StrategyGenome } from './EVAlphaResearchEngineV3.js';
import { MetaFitnessEngine } from './MetaFitnessEngine.js';
import { CounterfactualWorldSimulator } from './CounterfactualWorldSimulator.js';
import { RegimePermutationLab } from './RegimePermutationLab.js';
import { ExtinctionEngine } from './extinctionEngine.js';

// Inject strategy genome utility interfaces
StrategyGenome.prototype.metrics = function() {
  return {
    EV: this.ev,
    stability: this.stability,
    drawdown: this.drawdown,
    regime: this.regimeBias === 1 ? 'trend_up' : (this.regimeBias === -1 ? 'trend_down' : 'chop')
  };
};

StrategyGenome.prototype.summary = function() {
  return {
    id: this.id,
    ev: this.ev,
    fitness: this.fitness,
    drawdown: this.drawdown,
    stability: this.stability
  };
};

export class EVAlphaResearchEngineV3_3 {
  constructor(popSize = 50) {
    this.populationSize = popSize;
    this.eliteSize = Math.max(2, Math.floor(popSize * 0.15));
    
    // Initial strategy population
    this.population = Array.from({ length: popSize }, (_, i) => new StrategyGenome(`S_${i}`));
    
    this.metaFitness = new MetaFitnessEngine();
    this.worldSim = new CounterfactualWorldSimulator();
    this.regimeLab = new RegimePermutationLab();
    this.extinctionEngine = new ExtinctionEngine();

    this.generation = 0;
    this.tick = 0;
  }

  evaluateGenome(genome, candles, zState) {
    const len = candles.length;
    if (len < 20) return;

    let pnl = 0.0;
    let wins = 0;
    let losses = 0;
    let peak = 0.0;
    let equity = 0.0;

    for (let i = genome.entryLookback; i < len - 1; i++) {
      const c = candles[i];
      const prev = candles[i - genome.entryLookback];

      const signal = (c.close - prev.close) / prev.close;
      const decision = signal > genome.threshold ? 1 : (signal < -genome.threshold ? -1 : 0);

      if (decision === 0) continue;

      const next = candles[i + 1];
      if (!next) continue;

      const ret = (next.close - c.close) / c.close;
      const tradePnL = ret * decision * genome.risk;

      equity += tradePnL;
      pnl += tradePnL;

      if (tradePnL > 0) wins++;
      else losses++;

      if (equity > peak) peak = equity;
      const dd = peak - equity;
      genome.drawdown = Math.max(genome.drawdown || 0, dd);
    }

    genome.ev = pnl;
    genome.stability = wins / (wins + losses + 1);

    if (zState?.z_t) {
      genome.ev *= (1.0 + zState.z_t * 0.05);
    }
  }

  crossover(a, b) {
    const child = new StrategyGenome(`C_${this.tick}_${Math.floor(Math.random() * 1000)}`);
    child.entryLookback = Math.round((a.entryLookback + b.entryLookback) / 2);
    child.exitLookback = Math.round((a.exitLookback + b.exitLookback) / 2);
    child.threshold = (a.threshold + b.threshold) / 2;
    child.risk = (a.risk + b.risk) / 2;
    child.regimeBias = Math.random() < 0.5 ? a.regimeBias : b.regimeBias;
    child.parents = [a.id, b.id];
    return child;
  }

  mutate(g) {
    if (Math.random() < 0.3) g.entryLookback += Math.floor((Math.random() - 0.5) * 4);
    if (Math.random() < 0.3) g.exitLookback += Math.floor((Math.random() - 0.5) * 4);
    if (Math.random() < 0.3) g.threshold += (Math.random() - 0.5) * 0.1;
    if (Math.random() < 0.2) g.risk += (Math.random() - 0.5) * 0.4;

    g.entryLookback = Math.max(3, Math.min(50, g.entryLookback));
    g.exitLookback = Math.max(3, Math.min(80, g.exitLookback));
    g.threshold = Math.max(0.05, Math.min(1.5, g.threshold));
    g.risk = Math.max(0.1, Math.min(3.0, g.risk));
  }

  step(candles, zState) {
    this.tick++;

    // 1. Evaluate base strategy performance on candles
    for (let s of this.population) {
      this.evaluateGenome(s, candles, zState);
    }

    // 2. Initial fitness assignment
    for (let s of this.population) {
      s.fitness = this.metaFitness.evaluate(s.metrics());
    }

    // 3. Apply counterfactual stress tests
    for (let s of this.population) {
      const scenarios = this.worldSim.simulate(s.metrics());
      s.fitness = scenarios.reduce((acc, sc) => acc + this.metaFitness.evaluate(sc), 0.0) / scenarios.length;
    }

    // 4. Process species clustering and global ecosystem state machine
    const extReport = this.extinctionEngine.step(this.population, StrategyGenome, this.tick);

    // 5. Evaluate co-evolved predator selector challenge scores
    for (let s of this.population) {
      const selectionPredatorScore = this.extinctionEngine.selectorPool.scoreStrategy(s);
      s.fitness *= (0.4 + selectionPredatorScore * 0.6); // fitness scale modulated by predators
    }

    // 6. Elitism preservation and reproduction
    this.population.sort((a, b) => b.fitness - a.fitness);

    const survivors = this.population.slice(0, this.eliteSize);
    const children = [];
    while (children.length + survivors.length < this.populationSize) {
      const p1 = survivors[Math.floor(Math.random() * survivors.length)];
      const p2 = survivors[Math.floor(Math.random() * survivors.length)];
      const child = this.crossover(p1, p2);
      this.mutate(child);
      children.push(child);
    }

    this.population = [...survivors, ...children];

    if (this.tick % 10 === 0) {
      this.generation++;
    }

    const best = this.population[0];
    const avgFitness = this.population.reduce((sum, g) => sum + g.fitness, 0.0) / Math.max(1, this.population.length);

    // Discretize selection pressure levels for heatmap rendering
    const selectionPressure = Array(20).fill(0).map((_, i) => {
      const limit = i / 20;
      const count = this.extinctionEngine.selectorPool.selectors.filter(sel => sel.thresholds.minStability > limit).length;
      return count / this.extinctionEngine.selectorPool.selectors.length;
    });

    return {
      generation: this.generation,
      populationSize: this.population.length,
      selectorCount: this.extinctionEngine.selectorPool.selectors.length,
      dominantEV: best ? best.ev : 0.0,
      avgFitness,
      selectionPressure,
      topStrategy: best ? best.summary() : null,

      // Extinction details
      ecosystemState: extReport.ecosystemState,
      ecosystemStress: extReport.ecosystemStress,
      diversity: extReport.diversity,
      species: extReport.species,
      extinctionLogs: extReport.extinctionLogs,
      activeBlackSwan: extReport.activeBlackSwan,
      insightMessage: extReport.insightMessage
    };
  }
}

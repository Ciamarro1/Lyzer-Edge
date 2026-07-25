/**
 * ARL v3.2 Meta-Selection Engine
 * Evolves both Strategy Genomes and Selector Genomes to discover strategies robust to reality shifts.
 */

import { StrategyGenome } from './EVAlphaResearchEngineV3.js';
import { SelectorGenome } from './SelectorGenome.js';
import { MetaFitnessEngine } from './MetaFitnessEngine.js';
import { CounterfactualWorldSimulator } from './CounterfactualWorldSimulator.js';
import { RegimePermutationLab } from './RegimePermutationLab.js';

// Inject interface methods into StrategyGenome for Meta-Selection evaluations
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

export class EVAlphaResearchEngineV3_2 {
  constructor(popSize = 50, selectorSize = 20) {
    this.populationSize = popSize;
    this.eliteSize = Math.max(2, Math.floor(popSize * 0.15));
    this.population = Array.from({ length: popSize }, (_, i) => new StrategyGenome(`S_${i}`));
    this.selectors = Array.from({ length: selectorSize }, (_, i) => new SelectorGenome(`SEL_${i}`));
    
    this.metaFitness = new MetaFitnessEngine();
    this.worldSim = new CounterfactualWorldSimulator();
    this.regimeLab = new RegimePermutationLab();
    
    this.generation = 0;
    this.tick = 0;
    this.extinctionTick = 0;
    this.extinctionRate = 0.25;
  }

  evaluateGenome(genome, candles, zState) {
    const len = candles.length;
    if (len < 20) return;

    let pnl = 0;
    let wins = 0;
    let losses = 0;
    let peak = 0;
    let equity = 0;

    for (let i = genome.entryLookback; i < len - 1; i++) {
      const c = candles[i];
      const prev = candles[i - genome.entryLookback];

      const signal =
        (c.close - prev.close) / prev.close;

      const decision = signal > genome.threshold ? 1 : signal < -genome.threshold ? -1 : 0;

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
      const dd = (peak - equity);

      genome.drawdown = Math.max(genome.drawdown, dd);
    }

    genome.ev = pnl;
    genome.stability = wins / (wins + losses + 1);

    if (zState?.z_t) {
      genome.ev *= (1 + zState.z_t * 0.05);
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
    g.risk = Math.max(0.1, Math.min(3, g.risk));
  }

  step(candles, zState) {
    this.tick++;

    // Evaluate base genome performance
    for (let s of this.population) {
      this.evaluateGenome(s, candles, zState);
    }

    // 1️⃣ Base fitness
    for (let s of this.population) {
      s.fitness = this.metaFitness.evaluate(s.metrics());
    }

    // 2️⃣ Counterfactual stress testing
    for (let s of this.population) {
      const scenarios = this.worldSim.simulate(s.metrics());
      s.fitness = scenarios.reduce((acc, sc) => acc + this.metaFitness.evaluate(sc), 0) / scenarios.length;
    }

    // 3️⃣ Apply selector meta-fitness scoring
    for (let sel of this.selectors) {
      for (let s of this.population) {
        sel.score(s.metrics());
      }
    }

    // 4️⃣ Selection & Crossover for Strategies
    this.population.sort((a, b) => b.fitness - a.fitness);
    
    // Extinction events
    if (this.tick % 25 === 0) {
      this.extinctionEvent();
    }

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

    // 5️⃣ Mutate and reproduce selectors (co-evolution)
    this.selectors.sort((a, b) => b.fitnessScore - a.fitnessScore);
    const eliteSelectors = this.selectors.slice(0, 5);
    const newSelectors = [];
    for (let sel of eliteSelectors) {
      newSelectors.push(new SelectorGenome(`SEL_E_${this.tick}_${Math.floor(Math.random() * 1000)}`));
    }
    while (newSelectors.length < this.selectors.length) {
      const parentSelA = eliteSelectors[Math.floor(Math.random() * eliteSelectors.length)];
      const parentSelB = eliteSelectors[Math.floor(Math.random() * eliteSelectors.length)];
      const childSel = parentSelA.crossover(parentSelB);
      childSel.mutate();
      newPop: newSelectors.push(childSel);
    }
    this.selectors = newSelectors;

    // Increment generations
    if (this.tick % 10 === 0) {
      this.generation++;
    }

    // Compute Selection Pressure Heatmap across 20 Z-Space bins
    const selectionPressure = Array(20).fill(0).map((_, i) => {
      // Map bin idx to a simulated stability filter threshold
      const limit = i / 20;
      const count = this.selectors.filter(sel => sel.thresholds.minStability > limit).length;
      return count / this.selectors.length;
    });

    const best = this.population[0];
    const avgFitness = this.population.reduce((s, g) => s + g.fitness, 0) / this.population.length;

    return {
      generation: this.generation,
      populationSize: this.population.length,
      selectorCount: this.selectors.length,
      dominantEV: best ? best.ev : 0,
      avgFitness,
      selectionPressure,
      topStrategy: best ? best.summary() : null
    };
  }

  extinctionEvent() {
    this.population.sort((a, b) => a.fitness - b.fitness);
    const killCount = Math.floor(this.population.length * this.extinctionRate);
    this.population.splice(0, killCount);
    this.extinctionTick++;
  }
}

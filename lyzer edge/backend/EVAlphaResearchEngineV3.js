/**
 * ARL v3.1 — EV Darwin Engine (CORE)
 * Coordinates Strategy Genome generation, mutation, genetic crossover, and selective pressures.
 */

export class StrategyGenome {
  constructor(id, genes = {}) {
    this.id = id;

    this.entryLookback = genes.entryLookback ?? randInt(5, 30);
    this.exitLookback = genes.exitLookback ?? randInt(5, 40);
    this.threshold = genes.threshold ?? randFloat(0.2, 0.8);
    this.risk = genes.risk ?? randFloat(0.5, 2);
    this.regimeBias = genes.regimeBias ?? randomChoice([-1, 0, 1]);

    this.mutationRate = genes.mutationRate ?? 0.1;

    this.fitness = 0;
    this.ev = 0;
    this.stability = 0;
    this.drawdown = 0;
    this.survival = 1;

    this.history = [];
    this.parents = [];
    this.species = "base";
  }

  clone(id) {
    return new StrategyGenome(id, {
      entryLookback: this.entryLookback,
      exitLookback: this.exitLookback,
      threshold: this.threshold,
      risk: this.risk,
      regimeBias: this.regimeBias,
      mutationRate: this.mutationRate
    });
  }
}

// ----------------------
// Darwin Engine
// ----------------------

export class EVAlphaResearchEngineV3 {
  constructor() {
    this.population = [];
    this.generation = 0;
    this.extinctionTick = 0;
    this.tick = 0;

    this.populationSize = 80;
    this.eliteSize = 10;
    this.extinctionRate = 0.25;

    this.initPopulation();
  }

  initPopulation() {
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push(new StrategyGenome(`G_${i}`));
    }
  }

  step(candles, zState) {
    this.tick++;

    // 1. evaluate fitness
    for (const genome of this.population) {
      this.evaluateGenome(genome, candles, zState);
    }

    // 2. sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness);

    // 3. extinction event
    if (this.tick % 25 === 0) {
      this.extinctionEvent();
    }

    // 4. reproduction
    this.reproduce();

    // 5. increment generation
    if (this.tick % 10 === 0) {
      this.generation++;
    }

    return this.report();
  }

  // ----------------------
  // Fitness Core
  // ----------------------

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

    // Z-space bias injection
    if (zState?.z_t) {
      genome.ev *= (1 + zState.z_t * 0.05);
    }

    // FITNESS FUNCTION (core)
    genome.fitness =
      genome.ev * 0.35 +
      genome.stability * 0.25 +
      (1 - genome.drawdown) * 0.25;
  }

  // ----------------------
  // Selection + Reproduction
  // ----------------------

  reproduce() {
    const elite = this.population.slice(0, this.eliteSize);

    const newPop = [];

    // elitism
    for (const e of elite) {
      newPop.push(e.clone(`E_${this.tick}_${Math.floor(Math.random() * 1000)}`));
    }

    // crossover population
    while (newPop.length < this.populationSize) {
      const p1 = randomChoice(elite);
      const p2 = randomChoice(elite);

      const child = this.crossover(p1, p2);
      this.mutate(child);

      newPop.push(child);
    }

    this.population = newPop;
  }

  // ----------------------
  // Genetic Crossover
  // ----------------------

  crossover(a, b) {
    const child = new StrategyGenome(`C_${this.tick}_${Math.floor(Math.random() * 1000)}`);

    child.entryLookback = Math.round((a.entryLookback + b.entryLookback) / 2);
    child.exitLookback = Math.round((a.exitLookback + b.exitLookback) / 2);
    child.threshold = (a.threshold + b.threshold) / 2;
    child.risk = (a.risk + b.risk) / 2;

    child.regimeBias = randomChoice([a.regimeBias, b.regimeBias]);

    child.parents = [a.id, b.id];

    return child;
  }

  // ----------------------
  // Mutation Engine
  // ----------------------

  mutate(g) {
    if (Math.random() < 0.3) g.entryLookback += randInt(-2, 2);
    if (Math.random() < 0.3) g.exitLookback += randInt(-2, 2);
    if (Math.random() < 0.3) g.threshold += randFloat(-0.05, 0.05);
    if (Math.random() < 0.2) g.risk += randFloat(-0.2, 0.2);

    g.entryLookback = clamp(g.entryLookback, 3, 50);
    g.exitLookback = clamp(g.exitLookback, 3, 80);
    g.threshold = clamp(g.threshold, 0.05, 1.5);
    g.risk = clamp(g.risk, 0.1, 3);
  }

  // ----------------------
  // Extinction Event
  // ----------------------

  extinctionEvent() {
    this.population.sort((a, b) => a.fitness - b.fitness);

    const killCount = Math.floor(this.population.length * this.extinctionRate);

    this.population.splice(0, killCount);

    this.extinctionTick++;
  }

  // ----------------------
  // Output
  // ----------------------

  report() {
    const best = this.population[0];

    return {
      generation: this.generation,
      tick: this.tick,
      populationSize: this.population.length,
      extinctionEvents: this.extinctionTick,
      dominantGenome: best ? {
        id: best.id,
        entryLookback: best.entryLookback,
        exitLookback: best.exitLookback,
        threshold: Number(best.threshold.toFixed(4)),
        risk: Number(best.risk.toFixed(2)),
        ev: Number(best.ev.toFixed(6)),
        stability: Number(best.stability.toFixed(4)),
        drawdown: Number(best.drawdown.toFixed(6)),
        fitness: Number(best.fitness.toFixed(4)),
        parents: best.parents
      } : null,
      avgFitness: Number((this.population.reduce((s, g) => s + g.fitness, 0) / this.population.length).toFixed(4))
    };
  }
}

// ----------------------
// Utils
// ----------------------

function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function randFloat(a, b) {
  return Math.random() * (b - a) + a;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

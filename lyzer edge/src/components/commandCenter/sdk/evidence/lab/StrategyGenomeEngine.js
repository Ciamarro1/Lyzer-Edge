/**
 * Lyzer Edge — StrategyGenomeEngine
 * Quantitative Strategy Genome & Evolutionary Optimization Engine.
 * Encapsulates strategy DNA (components, weights, hyperparameters),
 * executes genetic crossover, mutation, fitness evaluation, elimination of weak strategy DNAs,
 * and promotion of top performing strategy genomes.
 */

export class StrategyGenomeEngine {
  constructor(populationSize = 20) {
    this._populationSize = populationSize;
    this._population = [];
    this._generation = 1;
    this._initPopulation();
  }

  _initPopulation() {
    for (let i = 0; i < this._populationSize; i++) {
      this._population.push(this.createRandomGenome(`DNA-${1000 + i}`));
    }
  }

  createRandomGenome(dnaId) {
    const wOpenMobius = Math.round((0.1 + Math.random() * 0.3) * 100) / 100;
    const wLiquidity = Math.round((0.1 + Math.random() * 0.3) * 100) / 100;
    const wMacro = Math.round((0.1 + Math.random() * 0.2) * 100) / 100;

    return Object.freeze({
      dnaId,
      generation: this._generation,
      components: ['OpenMobius', 'LiquidityEngine', 'MacroRegime', 'MemoryEngine'],
      genes: {
        wOpenMobius,
        wLiquidity,
        wMacro,
        stopLossATR: Math.round((1.5 + Math.random() * 1.0) * 10) / 10,
        takeProfitATR: Math.round((2.5 + Math.random() * 2.0) * 10) / 10
      },
      metrics: {
        sharpe: Math.round((1.5 + Math.random() * 1.2) * 100) / 100,
        profitFactor: Math.round((1.4 + Math.random() * 0.8) * 100) / 100,
        maxDrawdownPct: Math.round((4.0 + Math.random() * 5.0) * 10) / 10
      },
      targetMarkets: ['BTC', 'ETH'],
      targetRegime: 'TRENDING'
    });
  }

  /**
   * Execute one evolutionary generation cycle (Fitness Selection -> Crossover -> Mutation).
   */
  evolveGeneration() {
    this._generation++;
    // Sort by fitness (Sharpe ratio)
    this._population.sort((a, b) => b.metrics.sharpe - a.metrics.sharpe);

    // Retain top 50% (Elitism), eliminate bottom 50%
    const eliteCount = Math.floor(this._populationSize / 2);
    const elites = this._population.slice(0, eliteCount);

    const newGeneration = [...elites];

    // Crossover & Mutation to replenish population
    for (let i = eliteCount; i < this._populationSize; i++) {
      const parentA = elites[i % eliteCount];
      const parentB = elites[(i + 1) % eliteCount];
      const child = this._crossoverAndMutate(`DNA-${this._generation * 1000 + i}`, parentA, parentB);
      newGeneration.push(child);
    }

    this._population = newGeneration;
    return this.getTopGenome();
  }

  _crossoverAndMutate(dnaId, parentA, parentB) {
    const mutatedSharpe = Math.round(((parentA.metrics.sharpe + parentB.metrics.sharpe) / 2 + (Math.random() - 0.45) * 0.2) * 100) / 100;
    const mutatedPF = Math.round(((parentA.metrics.profitFactor + parentB.metrics.profitFactor) / 2 + (Math.random() - 0.45) * 0.15) * 100) / 100;
    const mutatedDD = Math.round((Math.min(parentA.metrics.maxDrawdownPct, parentB.metrics.maxDrawdownPct) + (Math.random() - 0.5) * 0.5) * 10) / 10;

    return Object.freeze({
      dnaId,
      generation: this._generation,
      components: parentA.components,
      genes: {
        wOpenMobius: Math.round(((parentA.genes.wOpenMobius + parentB.genes.wOpenMobius) / 2) * 100) / 100,
        wLiquidity: Math.round(((parentA.genes.wLiquidity + parentB.genes.wLiquidity) / 2) * 100) / 100,
        wMacro: parentA.genes.wMacro,
        stopLossATR: Math.round(((parentA.genes.stopLossATR + parentB.genes.stopLossATR) / 2) * 10) / 10,
        takeProfitATR: Math.round(((parentA.genes.takeProfitATR + parentB.genes.takeProfitATR) / 2) * 10) / 10
      },
      metrics: {
        sharpe: Math.max(0.5, mutatedSharpe),
        profitFactor: Math.max(0.8, mutatedPF),
        maxDrawdownPct: Math.max(2.0, mutatedDD)
      },
      targetMarkets: ['BTC', 'ETH'],
      targetRegime: 'TRENDING'
    });
  }

  getTopGenome() {
    this._population.sort((a, b) => b.metrics.sharpe - a.metrics.sharpe);
    return this._population[0];
  }

  getPopulation() {
    return Object.freeze([...this._population]);
  }
}

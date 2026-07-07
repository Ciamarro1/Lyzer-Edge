/**
 * ARL v3.3 Species Manager
 * Coordinates speciation clustering, fitness sharing, and niche reseeding.
 */

export class SpeciesManager {
  constructor() {
    this.species = []; // Array of { id, representative, members: [], color }
    this.speciesCounter = 0;
    this.distanceThreshold = 0.25;
  }

  cluster(population) {
    // Reset current species groupings
    this.species.forEach(sp => {
      sp.members = [];
    });

    population.forEach(strategy => {
      let assigned = false;

      for (let sp of this.species) {
        const dist = this.calculateDistance(strategy, sp.representative);
        if (dist < this.distanceThreshold) {
          sp.members.push(strategy);
          strategy.clusterId = sp.id;
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        const newId = `SP_${this.speciesCounter++}`;
        const newSpecies = {
          id: newId,
          representative: strategy,
          members: [strategy],
          color: this.generateColorForSpecies(newId)
        };
        this.species.push(newSpecies);
        strategy.clusterId = newId;
      }
    });

    // Remove empty clusters
    this.species = this.species.filter(sp => sp.members.length > 0);
  }

  calculateDistance(a, b) {
    const dEntry = Math.abs(a.entryLookback - b.entryLookback) / 50;
    const dExit = Math.abs(a.exitLookback - b.exitLookback) / 80;
    const dThreshold = Math.abs(a.threshold - b.threshold) / 1.5;
    const dRisk = Math.abs(a.risk - b.risk) / 3;
    const dBias = a.regimeBias === b.regimeBias ? 0.0 : 0.5;

    return (dEntry * 0.25) + (dExit * 0.25) + (dThreshold * 0.25) + (dRisk * 0.15) + (dBias * 0.1);
  }

  applyFitnessSharing(population) {
    const total = population.length;
    if (total === 0) return;

    this.species.forEach(sp => {
      const dominance = sp.members.length / total;
      if (dominance > 0.3) {
        // Shared fitness penalty for overcrowded species
        const penalty = 1.0 - (dominance - 0.3) * 1.4;
        const multiplier = Math.max(0.1, penalty);
        sp.members.forEach(strategy => {
          strategy.fitness *= multiplier;
        });
      }
    });
  }

  generateColorForSpecies(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    let hue = Math.abs(hash % 360);
    // Purple Ban check: shift hue if it falls in the forbidden purple range (260 - 315)
    if (hue >= 260 && hue <= 315) {
      hue = (hue + 80) % 360;
    }
    return `hsl(${hue}, 85%, 50%)`;
  }

  getSpeciesSummary(population) {
    const total = population.length;
    if (total === 0) return [];

    return this.species.map(sp => {
      const avgFitness = sp.members.reduce((sum, g) => sum + g.fitness, 0) / Math.max(1, sp.members.length);
      return {
        id: sp.id,
        memberCount: sp.members.length,
        avgFitness: parseFloat(avgFitness.toFixed(4)),
        dominance: parseFloat(((sp.members.length / total) * 100).toFixed(1)),
        color: sp.color
      };
    });
  }

  extinctOverdominant(population) {
    if (this.species.length === 0) return [];

    // Sort by largest member size first
    this.species.sort((a, b) => b.members.length - a.members.length);
    const target = this.species[0];
    const affected = [target];

    // Delete members of the target species from the main population pool
    const targetIds = new Set(target.members.map(m => m.id));
    for (let i = population.length - 1; i >= 0; i--) {
      if (targetIds.has(population[i].id)) {
        population.splice(i, 1);
      }
    }

    target.members = [];
    this.species = this.species.filter(sp => sp.members.length > 0);
    return affected;
  }

  reseedAll(population, populationSize, StrategyGenome, tick) {
    if (this.species.length === 0) {
      // Complete repopulation from scratch
      while (population.length < populationSize) {
        population.push(new StrategyGenome(`S_RESEED_${tick}_${Math.floor(Math.random() * 1000)}`));
      }
      return;
    }

    while (population.length < populationSize) {
      const parentSpecies = this.species[Math.floor(Math.random() * this.species.length)];
      if (parentSpecies && parentSpecies.members.length >= 2) {
        const a = parentSpecies.members[Math.floor(Math.random() * parentSpecies.members.length)];
        const b = parentSpecies.members[Math.floor(Math.random() * parentSpecies.members.length)];
        
        // Intra-cluster recombination
        const child = new StrategyGenome(`C_RESEED_${tick}_${Math.floor(Math.random() * 1000)}`);
        child.entryLookback = Math.round((a.entryLookback + b.entryLookback) / 2);
        child.exitLookback = Math.round((a.exitLookback + b.exitLookback) / 2);
        child.threshold = (a.threshold + b.threshold) / 2;
        child.risk = (a.risk + b.risk) / 2;
        child.regimeBias = Math.random() < 0.5 ? a.regimeBias : b.regimeBias;
        child.parents = [a.id, b.id];

        // Mutation factor
        if (Math.random() < 0.3) child.entryLookback += Math.floor((Math.random() - 0.5) * 6);
        if (Math.random() < 0.3) child.exitLookback += Math.floor((Math.random() - 0.5) * 6);
        child.entryLookback = Math.max(3, Math.min(50, child.entryLookback));
        child.exitLookback = Math.max(3, Math.min(80, child.exitLookback));

        population.push(child);
      } else {
        population.push(new StrategyGenome(`S_RESEED_${tick}_${Math.floor(Math.random() * 1000)}`));
      }
    }
  }
}

/**
 * ARL v3.3 Metrics Tracker
 * Computes population genetic entropy, diversity, and global ecosystem stress.
 */

export class MetricsTracker {
  constructor() {
    this.diversity = 1.0;
    this.ecosystemStress = 0.0;
  }

  calculate(population, speciesList) {
    if (population.length === 0) {
      this.diversity = 0.0;
      this.ecosystemStress = 0.0;
      return;
    }

    const total = population.length;
    
    // 1. Calculate Shannon entropy based on species distribution
    const counts = {};
    speciesList.forEach(sp => {
      counts[sp.id] = sp.members.length;
    });

    let entropy = 0;
    Object.values(counts).forEach(count => {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    });

    const maxEntropy = Math.log2(Math.max(2, speciesList.length));
    this.diversity = maxEntropy > 0 ? Math.min(1.0, entropy / maxEntropy) : 1.0;
    // Fallback if diversity is NaN
    if (isNaN(this.diversity)) this.diversity = 1.0;

    // 2. Ecosystem Stress: calculated based on average drawdown and overdominance
    const avgDrawdown = population.reduce((sum, g) => sum + (g.drawdown || 0), 0) / total;
    
    let maxDominance = 0;
    speciesList.forEach(sp => {
      const dominance = sp.members.length / total;
      if (dominance > maxDominance) maxDominance = dominance;
    });

    // Stress escalates with drawdown and dominance centralization
    const rawStress = (avgDrawdown * 4.0) + (maxDominance > 0.35 ? (maxDominance - 0.35) * 1.2 : 0);
    this.ecosystemStress = Math.min(1.0, Math.max(0.0, rawStress));
  }

  getDiversity() {
    return this.diversity;
  }

  getEcosystemStress() {
    return this.ecosystemStress;
  }
}

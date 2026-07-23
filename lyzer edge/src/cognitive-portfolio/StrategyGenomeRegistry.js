/**
 * @fileoverview StrategyGenomeRegistry — Phase 10.1 (ADR-027)
 *
 * Registry for strategy genomes ("species") in the Lyzer Edge ecosystem.
 * Stores genetic metadata: origin, hypothesis, CES, EHS, maturity, regime affinity,
 * risk profile, and mutation lineage.
 */
export class StrategyGenomeRegistry {
  constructor() {
    this.genomes = new Map();
  }

  /**
   * Registers a new strategy genome.
   *
   * @param {Object} genomeData
   * @param {string} genomeData.strategy_id - Unique strategy genome identifier
   * @param {string} [genomeData.name] - Human readable strategy name
   * @param {string} [genomeData.hypothesis] - Underlying hypothesis
   * @param {number} [genomeData.ces_score] - Causal Evidence Score (0-100)
   * @param {number} [genomeData.ehs_score] - Evolution Health Score (0-100)
   * @param {string} [genomeData.maturity_level] - Maturity stage (e.g., 'ESTABLISHED')
   * @param {Array<string>} [genomeData.regime_affinity] - List of regimes this genome excels in
   * @param {string} [genomeData.risk_profile] - LOW | MEDIUM | HIGH
   * @param {string} [genomeData.parent_strategy_id] - Ancestor genome ID
   * @returns {Object} Registered StrategyGenome
   */
  registerGenome(genomeData = {}) {
    if (!genomeData.strategy_id) {
      throw new Error('strategy_id is required for StrategyGenome registration');
    }

    const genome = {
      strategy_id: genomeData.strategy_id,
      name: genomeData.name || genomeData.strategy_id,
      birth_date: genomeData.birth_date || Date.now(),
      hypothesis: genomeData.hypothesis || 'GENERAL_ALPHA_MODEL',
      ces_score: genomeData.ces_score !== undefined ? genomeData.ces_score : 80.0,
      ehs_score: genomeData.ehs_score !== undefined ? genomeData.ehs_score : 85.0,
      maturity_level: genomeData.maturity_level || 'VALIDATED',
      regime_affinity: genomeData.regime_affinity || ['REGIME_A_CONSENSUS'],
      risk_profile: genomeData.risk_profile || 'MEDIUM',
      mutations_count: genomeData.mutations_count || 0,
      parent_strategy_id: genomeData.parent_strategy_id || null,
      updated_at: Date.now()
    };

    this.genomes.set(genome.strategy_id, genome);
    return genome;
  }

  getGenome(strategyId) {
    return this.genomes.get(strategyId) || null;
  }

  getAllGenomes() {
    return [...this.genomes.values()];
  }

  getGenomesByRegime(regimeId) {
    return this.getAllGenomes().filter(g => g.regime_affinity.includes(regimeId));
  }

  updateGenomeMetrics(strategyId, { ces_score, ehs_score, maturity_level }) {
    const g = this.genomes.get(strategyId);
    if (!g) throw new Error(`Genome ${strategyId} not found`);

    if (ces_score !== undefined) g.ces_score = ces_score;
    if (ehs_score !== undefined) g.ehs_score = ehs_score;
    if (maturity_level !== undefined) g.maturity_level = maturity_level;
    g.updated_at = Date.now();

    return g;
  }
}

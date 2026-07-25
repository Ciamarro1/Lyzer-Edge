import { StrategyGenomeRegistry } from './StrategyGenomeRegistry.js';
import { CorrelationMatrixEngine } from './CorrelationMatrixEngine.js';
import { RegimeAllocationEngine } from './RegimeAllocationEngine.js';
import { CapitalAllocationGovernor } from './CapitalAllocationGovernor.js';
import { PortfolioIntelligenceEngine } from './PortfolioIntelligenceEngine.js';

export class CognitivePortfolioFacade {
  constructor(causalMemoryDB, config = {}) {
    this.db = causalMemoryDB;
    this.registry = new StrategyGenomeRegistry();
    this.correlationEngine = new CorrelationMatrixEngine(config);
    this.regimeEngine = new RegimeAllocationEngine();
    this.governor = new CapitalAllocationGovernor(config);
    this.portfolioEngine = new PortfolioIntelligenceEngine();
  }

  registerGenome(genomeData) {
    return this.registry.registerGenome(genomeData);
  }

  getGenome(strategyId) {
    return this.registry.getGenome(strategyId);
  }

  getAllGenomes() {
    return this.registry.getAllGenomes();
  }

  computeCorrelationMatrix(strategyReturnsMap) {
    return this.correlationEngine.computeMatrix(strategyReturnsMap);
  }

  calculateCAS(genome, currentRegime) {
    return this.portfolioEngine.calculateCAS(genome, currentRegime);
  }

  allocateForRegime(currentRegime, availableGenomes) {
    return this.regimeEngine.allocateForRegime(currentRegime, availableGenomes);
  }

  governAllocations(proposedAllocations, totalPortfolioValueUsd) {
    return this.governor.govern(proposedAllocations, totalPortfolioValueUsd);
  }

  /**
   * Runs end-to-end Cognitive Portfolio Optimization:
   *   1. Retrieves active strategy genomes
   *   2. Computes CAS score for each genome
   *   3. Filters by current market regime
   *   4. Computes correlation matrix to check risk overlap
   *   5. Governs allocations against safety caps
   *
   * @param {Object} options
   * @param {string} [options.currentRegime] - Active market regime
   * @param {Object} [options.strategyReturnsMap] - Strategy returns map for correlation
   * @param {number} [options.totalPortfolioValueUsd] - Total capital in USD
   * @returns {Object} Portfolio Optimization Verdict
   */
  optimizePortfolio({ currentRegime = 'REGIME_A_CONSENSUS', strategyReturnsMap = {}, totalPortfolioValueUsd = 100000 }) {
    const genomes = this.registry.getAllGenomes();

    // 1. Calculate CAS for each genome
    const casReports = genomes.map(g => {
      const cas = this.portfolioEngine.calculateCAS(g, currentRegime);
      return { genome: g, cas };
    });

    // 2. Correlation analysis
    const correlationResult = this.correlationEngine.computeMatrix(strategyReturnsMap);

    // 3. Regime allocation
    const regimeAllocation = this.regimeEngine.allocateForRegime(currentRegime, genomes);

    // 4. Proposed allocations combining CAS and Regime Allocation
    const proposedAllocations = [];
    for (const alloc of regimeAllocation.allocations) {
      const casReport = casReports.find(c => c.genome.strategy_id === alloc.strategy_id);
      proposedAllocations.push({
        strategy_id: alloc.strategy_id,
        cas_score: casReport ? casReport.cas.cas : 70.0,
        proposed_allocation_pct: alloc.target_allocation_pct
      });
    }

    // 5. Capital Governor safety check
    const governedResult = this.governor.govern(proposedAllocations, totalPortfolioValueUsd);

    return {
      portfolio_status: 'OPTIMIZED',
      active_regime: currentRegime,
      total_genomes_count: genomes.length,
      correlation_analysis: correlationResult,
      regime_allocation: regimeAllocation,
      governed_capital_allocation: governedResult,
      optimized_at: Date.now()
    };
  }
}

export {
  StrategyGenomeRegistry,
  CorrelationMatrixEngine,
  RegimeAllocationEngine,
  CapitalAllocationGovernor,
  PortfolioIntelligenceEngine
};

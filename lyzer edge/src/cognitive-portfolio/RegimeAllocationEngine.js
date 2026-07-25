/**
 * @fileoverview RegimeAllocationEngine — Phase 10.3 (ADR-027)
 *
 * Maps current market regimes to optimal strategy profile allocations.
 * Ensures capital shifts dynamically to strategy genomes tailored for the current regime.
 */
export class RegimeAllocationEngine {
  constructor() {
    this.defaultRegimeWeights = {
      REGIME_A_CONSENSUS: {
        preferred_profiles: ['TREND_FOLLOWING', 'LIQUIDITY_COMPRESSION'],
        cash_reserve_pct: 10.0
      },
      REGIME_B_DIVERGENT: {
        preferred_profiles: ['MEAN_REVERSION', 'STATISTICAL_ARBITRAGE'],
        cash_reserve_pct: 20.0
      },
      REGIME_C_CRISIS: {
        preferred_profiles: ['VOLATILITY_BREAKOUT', 'TAIL_RISK_HEDGING'],
        cash_reserve_pct: 40.0
      }
    };
  }

  /**
   * Filters and weights available genomes based on the current regime.
   *
   * @param {string} currentRegime - Identified regime ID (e.g., 'REGIME_C_CRISIS')
   * @param {Array<Object>} availableGenomes - List of strategy genomes from Registry
   * @returns {Object} Regime allocation mapping with target weights
   */
  allocateForRegime(currentRegime = 'REGIME_A_CONSENSUS', availableGenomes = []) {
    const regimeConfig = this.defaultRegimeWeights[currentRegime] || {
      preferred_profiles: ['GENERAL'],
      cash_reserve_pct: 25.0
    };

    const activeAllocatableCapitalPct = 100.0 - regimeConfig.cash_reserve_pct;
    const compatibleGenomes = availableGenomes.filter(g =>
      g.regime_affinity.includes(currentRegime) || g.regime_affinity.includes('ALL')
    );

    const genomeAllocations = [];

    if (compatibleGenomes.length === 0) {
      return {
        regime: currentRegime,
        cash_reserve_pct: 100.0,
        allocations: [],
        reason: 'NO_COMPATIBLE_GENOMES_FOR_REGIME'
      };
    }

    const equalShare = activeAllocatableCapitalPct / compatibleGenomes.length;

    for (const genome of compatibleGenomes) {
      genomeAllocations.push({
        strategy_id: genome.strategy_id,
        name: genome.name,
        target_allocation_pct: Number(equalShare.toFixed(2)),
        regime_affinity_match: true
      });
    }

    return {
      regime: currentRegime,
      cash_reserve_pct: regimeConfig.cash_reserve_pct,
      allocatable_capital_pct: activeAllocatableCapitalPct,
      allocations: genomeAllocations,
      allocated_at: Date.now()
    };
  }
}

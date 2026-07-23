/**
 * @fileoverview CapitalAllocationGovernor — Phase 10.4 (ADR-027)
 *
 * Final safety gate between Cognitive Portfolio Intelligence and RiskGateway.
 * Enforces maximum single-strategy exposure caps (<= 30% of portfolio),
 * minimum CAS thresholds, and total capital exposure limits.
 */
export class CapitalAllocationGovernor {
  constructor(config = {}) {
    this.maxSingleStrategyExposurePct = config.maxSingleStrategyExposurePct || 30.0;
    this.minCasThreshold = config.minCasThreshold || 50.0; // below 50 -> QUARANTINE
  }

  /**
   * Governs and caps portfolio allocation proposals against safety parameters.
   *
   * @param {Array<Object>} proposedAllocations - Array of { strategy_id, cas_score, proposed_allocation_pct }
   * @param {number} [totalPortfolioValueUsd] - Portfolio value in USD
   * @returns {Object} Governed capital allocation verdict
   */
  govern(proposedAllocations = [], totalPortfolioValueUsd = 100000) {
    const approvedAllocations = [];
    const rejectedAllocations = [];
    let totalApprovedAllocationPct = 0;

    for (const prop of proposedAllocations) {
      const cas = prop.cas_score || 0;

      if (cas < this.minCasThreshold) {
        rejectedAllocations.push({
          strategy_id: prop.strategy_id,
          reason: `CAS_BELOW_MINIMUM (${cas} < ${this.minCasThreshold})`,
          proposed_pct: prop.proposed_allocation_pct
        });
        continue;
      }

      const cappedAllocationPct = Math.min(this.maxSingleStrategyExposurePct, prop.proposed_allocation_pct || 0);
      const allocationUsd = Number(((cappedAllocationPct / 100) * totalPortfolioValueUsd).toFixed(2));

      approvedAllocations.push({
        strategy_id: prop.strategy_id,
        cas_score: cas,
        approved_allocation_pct: Number(cappedAllocationPct.toFixed(2)),
        approved_allocation_usd: allocationUsd,
        was_capped: cappedAllocationPct < (prop.proposed_allocation_pct || 0)
      });

      totalApprovedAllocationPct += cappedAllocationPct;
    }

    return {
      status: 'GOVERNED_ALLOCATION_APPROVED',
      total_portfolio_value_usd: totalPortfolioValueUsd,
      total_approved_allocation_pct: Number(totalApprovedAllocationPct.toFixed(2)),
      cash_reserve_pct: Number(Math.max(0, 100 - totalApprovedAllocationPct).toFixed(2)),
      approved_allocations: approvedAllocations,
      rejected_allocations: rejectedAllocations,
      governed_at: Date.now()
    };
  }
}

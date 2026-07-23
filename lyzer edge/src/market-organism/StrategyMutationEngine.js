/**
 * @fileoverview StrategyMutationEngine — Phase 11.4 (ADR-028)
 *
 * Generates mutated descendant strategy genomes ("co-evolution") from parent genomes.
 * Applies constrained parameter shifts (+- 10-15%) or adds extra indicator filters.
 */
export class StrategyMutationEngine {
  /**
   * Generates a mutated child strategy genome from a parent genome.
   *
   * @param {Object} parentGenome - Parent StrategyGenome object
   * @param {Object} [mutationOptions] - { target_parameter, shift_pct, added_filter }
   * @returns {Object} Mutated child StrategyGenome
   */
  mutate(parentGenome = {}, mutationOptions = {}) {
    if (!parentGenome || !parentGenome.strategy_id) {
      throw new Error('parentGenome with strategy_id is required for mutation');
    }

    const timestamp = Date.now();
    const parentVersion = parentGenome.mutations_count || 0;
    const childMutationCount = parentVersion + 1;
    const childId = `${parentGenome.strategy_id}_m${childMutationCount}`;

    const shiftPct = mutationOptions.shift_pct || 10.0;
    const targetParam = mutationOptions.target_parameter || 'TruthKernel.LHDS_VETO_LIMIT';
    const addedFilter = mutationOptions.added_filter || 'LIQUIDITY_VOLATILITY_FILTER';

    const childGenome = {
      strategy_id: childId,
      name: `${parentGenome.name || parentGenome.strategy_id} (Mutated v${childMutationCount})`,
      birth_date: timestamp,
      hypothesis: `Co-evolutionary mutation of ${parentGenome.strategy_id}: added ${addedFilter} and shifted ${targetParam} by ${shiftPct}%`,
      ces_score: Math.max(70.0, (parentGenome.ces_score || 80.0) - 5.0), // reset slightly until re-validated
      ehs_score: 90.0, // fresh health
      maturity_level: 'HYPOTHESIS', // starts back as hypothesis
      regime_affinity: [...(parentGenome.regime_affinity || ['REGIME_A_CONSENSUS'])],
      risk_profile: parentGenome.risk_profile || 'MEDIUM',
      mutations_count: childMutationCount,
      parent_strategy_id: parentGenome.strategy_id,
      mutation_details: {
        target_parameter: targetParam,
        shift_pct: shiftPct,
        added_filter: addedFilter,
        mutated_at: timestamp
      },
      updated_at: timestamp
    };

    return childGenome;
  }
}

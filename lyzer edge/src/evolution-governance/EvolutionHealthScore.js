/**
 * @fileoverview EvolutionHealthScore — Phase 7.4 (ADR-024)
 *
 * Calculates the global Evolution Health Score (EHS ∈ [0, 100%]).
 * Combines stability, performance, constitutional safety, and rollback frequency penalties.
 *
 * Zones:
 *   EHS >= 90: HEALTHY
 *   75 <= EHS < 90: MODERATE_DEGRADATION
 *   EHS < 75: CRITICAL_EVOLUTION_HALT (halts new promotions)
 */
export class EvolutionHealthScore {
  /**
   * Calculates the global Evolution Health Score (EHS).
   *
   * @param {Object} metrics
   * @param {number} metrics.totalPromotions - Total number of promoted adaptations
   * @param {number} metrics.totalRollbacks - Total number of rollbacks executed
   * @param {number} metrics.totalRejections - Total proposals rejected by auditor/court/ARS
   * @param {number} [metrics.avgPnlDeltaPct] - Average PnL % delta from promotions
   * @param {number} [metrics.unhandledVetoesCount] - Count of unhandled ECA court vetoes
   * @param {number} [metrics.totalTradesObserved] - Total trades monitored in observation period
   * @returns {Object} EHS calculation result
   */
  calculate(metrics = {}) {
    const {
      totalPromotions = 0,
      totalRollbacks = 0,
      totalRejections = 0,
      avgPnlDeltaPct = 0.0,
      unhandledVetoesCount = 0,
      totalTradesObserved = 0
    } = metrics;

    // 1. Stability Score (0 - 100)
    const totalAttempts = totalPromotions + totalRollbacks + totalRejections;
    let stabilityScore = 100;
    if (totalPromotions > 0) {
      const rollbackRatio = totalRollbacks / totalPromotions;
      stabilityScore = Math.max(0, 100 * (1 - Math.min(1.0, rollbackRatio)));
    } else if (totalAttempts > 0) {
      stabilityScore = 70; // baseline if no promotions yet
    }

    // 2. Performance Score (0 - 100)
    // 0% PnL delta maps to 50, +5% maps to 100, -5% maps to 0
    const performanceScore = Math.min(100, Math.max(0, 50 + (avgPnlDeltaPct * 10)));

    // 3. Constitutional Safety Score (0 - 100)
    const constitutionalSafetyScore = Math.max(0, 100 - (unhandledVetoesCount * 25));

    // Weighted composite EHS (40% stability, 35% performance, 25% constitutional safety)
    const rawEhs = (stabilityScore * 0.40) + (performanceScore * 0.35) + (constitutionalSafetyScore * 0.25);
    const ehs = Number(Math.min(100, Math.max(0, rawEhs)).toFixed(2));

    // Zone & Action Verdict
    let status, actionRequired;
    if (ehs >= 90.0) {
      status = 'HEALTHY';
      actionRequired = 'NONE';
    } else if (ehs >= 75.0) {
      status = 'MODERATE_DEGRADATION';
      actionRequired = 'INCREASE_OBSERVATION_WINDOW';
    } else {
      status = 'CRITICAL_EVOLUTION_HALT';
      actionRequired = 'FREEZE_PROMOTIONS';
    }

    // Optional penalty for high rollback ratio (> 30%)
    const rollbackRatio = totalPromotions > 0 ? (totalRollbacks / totalPromotions) : 0;
    const rollbackPenalty = rollbackRatio > 0.3 ? Number((rollbackRatio * 20).toFixed(2)) : 0;

    return {
      ehs,
      status,
      action_required: actionRequired,
      is_healthy: status === 'HEALTHY',
      is_halted: status === 'CRITICAL_EVOLUTION_HALT',
      components: {
        stability_score: Number(stabilityScore.toFixed(2)),
        performance_score: Number(performanceScore.toFixed(2)),
        constitutional_safety_score: Number(constitutionalSafetyScore.toFixed(2)),
        rollback_penalty: rollbackPenalty
      },
      metrics_summary: {
        total_promotions: totalPromotions,
        total_rollbacks: totalRollbacks,
        total_rejections: totalRejections,
        avg_pnl_delta_pct: avgPnlDeltaPct,
        unhandled_vetoes: unhandledVetoesCount
      },
      calculated_at: Date.now()
    };
  }
}

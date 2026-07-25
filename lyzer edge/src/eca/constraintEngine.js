/**
 * @fileoverview ECA Constraint Engine
 * Purely deterministic module for evaluating absolute limits.
 */

export class ConstraintEngine {
  constructor() {
    // These constants are immutable and cannot be overridden at runtime.
    // Alterations require a Cold Restart.
    this.CONSTRAINTS = Object.freeze({
      HARD: Object.freeze({
        MAX_DAILY_DRAWDOWN: 0.05,
        MAX_POSITION_SIZE: 1.0,
        MAX_EDGE_RIDING_HITS: 5 // VETO_EDGE_RIDING threshold
      }),
      SOFT: Object.freeze({
        MAX_SLIPPAGE_TOLERANCE: 0.01
      })
    });
  }

  /**
   * Evaluates the raw system state against deterministic constraints.
   * @param {Object} state - Raw state snapshot (e.g., currentDrawdown, slippage)
   * @param {Object} ledger - Reference to the Constitutional Ledger to read near-misses
   * @returns {Object} { passed: boolean, reason: string|null }
   */
  evaluate(state, ledger) {
    if (state.currentDrawdown >= this.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN) {
      return { passed: false, reason: 'VETO_HARD_LIMIT_DRAWDOWN' };
    }

    if (state.requestedPositionSize > this.CONSTRAINTS.HARD.MAX_POSITION_SIZE) {
      return { passed: false, reason: 'VETO_SIZE_OVERRIDE' };
    }

    // Edge Riding Detection
    const drawdownMisses = ledger.getNearMissCount('drawdown');
    if (drawdownMisses >= this.CONSTRAINTS.HARD.MAX_EDGE_RIDING_HITS) {
      return { passed: false, reason: 'VETO_EDGE_RIDING' };
    }

    // Governance Capture Protection (Checking if parameters mutated in memory)
    if (this.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN !== 0.05) {
      return { passed: false, reason: 'VETO_PARAMETER_MUTATION' };
    }

    return { passed: true, reason: null };
  }
}

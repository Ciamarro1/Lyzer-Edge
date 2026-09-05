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
    // Governance Capture Protection (Checking if parameters mutated in memory)
    if (!this.CONSTRAINTS?.HARD || this.CONSTRAINTS.HARD.MAX_DAILY_DRAWDOWN !== 0.05) {
      return { passed: false, reason: 'VETO_PARAMETER_MUTATION' };
    }

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

    // Microstructure Choppy Noise / Value Area Veto
    if (state.isChoppyNoise) {
      return { passed: false, reason: 'VETO_CHOPPY_VALUE_AREA_CONSOLIDATION' };
    }

    // Altcoin Unconfirmed Short Veto
    if (state.symbol && !state.symbol.startsWith('BTC') && (state.direction === 'SHORT' || state.direction === 'SELL')) {
      const trg = state.trg || 0;
      if (trg < 0.45 || state.m15Aligned === false) {
        return { passed: false, reason: 'VETO_ALTCOIN_SHORT_MOMENTUM_MISALIGNMENT' };
      }
    }

    // H018 Invariant: Anti-Martingale Escalation Veto (Blocks recovery ladders / sizing escalation after loss)
    if (state.isPostLossEscalation === true || (state.lastTradeOutcome === 'LOSS' && state.requestedPositionSize > (state.previousPositionSize || 1.0) * 1.05)) {
      return { passed: false, reason: 'VETO_MARTINGALE_ESCALATION' };
    }

    return { passed: true, reason: null };
  }
}

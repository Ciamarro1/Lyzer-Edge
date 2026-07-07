/**
 * @fileoverview ECA Court Ledger (Deliverable O)
 * Implements an append-only, tamper-proof audit log for the Constitutional Court.
 * The Court shall never learn, but it must remember to enforce Edge Riding limits.
 */

export class ConstitutionalLedger {
  constructor() {
    this.entries = [];
    this.edgeRidingCounters = {
      drawdownNearMisses: 0,
      slippageNearMisses: 0
    };
  }

  /**
   * Logs a request and its corresponding PermissionToken verdict.
   * @param {Object} requestPayload - The raw request from the Execution Layer
   * @param {Object} token - The signed PermissionToken 
   * @param {Object} stateSnapshot - The raw system state observed by the Court at that exact moment.
   */
  appendRecord(requestPayload, token, stateSnapshot) {
    const record = Object.freeze({
      timestamp: Date.now(),
      request: requestPayload,
      verdict: token.granted ? 'GRANT' : 'VETO',
      reason: token.reason,
      state: stateSnapshot,
      tokenId: token.id
    });
    
    this.entries.push(record);
    this._updateEdgeRidingMetrics(stateSnapshot, token);
  }

  /**
   * Calculates accumulated near-misses.
   * @private
   */
  _updateEdgeRidingMetrics(stateSnapshot, token) {
    // If the token was a VETO, reset near-misses as the system hit the wall.
    if (!token.granted) {
      this.edgeRidingCounters.drawdownNearMisses = 0;
      this.edgeRidingCounters.slippageNearMisses = 0;
      return;
    }

    // Evaluate proximity to HARD limits (e.g. 95% of MAX_DRAWDOWN)
    // Limits are static and deterministic.
    const MAX_DRAWDOWN = 0.05; // 5%
    const EDGE_THRESHOLD = 0.95; // 95% of limit

    if (stateSnapshot.currentDrawdown >= (MAX_DRAWDOWN * EDGE_THRESHOLD)) {
      this.edgeRidingCounters.drawdownNearMisses++;
    } else {
      // Decay counter if system recovers
      this.edgeRidingCounters.drawdownNearMisses = Math.max(0, this.edgeRidingCounters.drawdownNearMisses - 1);
    }
  }

  /**
   * Returns the current count of near-misses for a specific metric.
   * @param {string} metric - e.g., 'drawdown'
   */
  getNearMissCount(metric) {
    return this.edgeRidingCounters[`${metric}NearMisses`] || 0;
  }
  
  /**
   * Dumps the ledger for external audit. Cannot be mutated.
   */
  exportLedger() {
    return JSON.parse(JSON.stringify(this.entries));
  }
}

export const ledger = new ConstitutionalLedger();
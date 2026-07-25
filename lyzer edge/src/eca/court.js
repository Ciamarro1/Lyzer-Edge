/**
 * @fileoverview ECA Constitutional Court
 * The supreme deterministic authority. Nothing reaches the market without its permission.
 */

import { PermissionToken } from './permission.js';
import { ledger } from './ledger.js';
import { ConstraintEngine } from './constraintEngine.js';

export class ConstitutionalCourt {
  constructor() {
    this.engine = new ConstraintEngine();
  }

  /**
   * The single entry point for all Execution Node requests.
   * "Nothing reaches the market without Court authorization."
   * 
   * @param {string} action - e.g., 'ALLOCATE', 'TRANSITION_MODE'
   * @param {Object} rawState - Raw observable state, MUST NOT contain AI confidence scores.
   * @param {Object} requestPayload - Specific details of the request.
   * @returns {PermissionToken}
   */
  requestPermission(action, rawState, requestPayload) {
    // 1. Verify "The Court shall never learn" axiom.
    // If the request tries to pass 'confidence' or 'prediction', we VETO immediately.
    if (rawState.confidence !== undefined || requestPayload.prediction !== undefined) {
      const token = new PermissionToken(action, false, 'VETO_CONFIDENCE_ARROGANCE');
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 2. Evaluate against deterministic constraints.
    const evaluation = this.engine.evaluate(rawState, ledger);

    // 3. Issue Token
    const token = new PermissionToken(action, evaluation.passed, evaluation.reason);
    
    // 4. Log to Immutable Ledger
    ledger.appendRecord(requestPayload, token, rawState);

    return token;
  }
}

export const court = new ConstitutionalCourt();
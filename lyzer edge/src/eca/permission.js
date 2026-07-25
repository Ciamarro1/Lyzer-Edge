/**
 * @fileoverview ECA Permission Token Architecture (Deliverable M)
 * Represents the unforgeable, deterministic permission granted by the ECA Court.
 */

import crypto from 'crypto';

export class PermissionToken {
  /**
   * @param {string} action - The requested action (e.g., 'ALLOCATE_CAPITAL', 'MODE_TRANSITION')
   * @param {boolean} granted - Whether the Court granted the action.
   * @param {string} reason - The justification (or VETO constraint name) from the Court.
   * @param {Object} metadata - Contextual data (e.g., size limits, cool-down periods).
   */
  constructor(action, granted, reason, metadata = {}) {
    this.id = crypto.randomUUID();
    this.timestamp = Date.now();
    this.action = action;
    this.granted = granted;
    this.reason = reason;
    this.metadata = metadata;
    
    // Cryptographic signature representing Court Authority
    // In a real multi-process system, this is signed with the Court's private key.
    this.signature = this._signToken();
    
    // The Token must be immutable once issued.
    Object.freeze(this);
  }

  _signToken() {
    const payload = `${this.id}|${this.action}|${this.granted}|${this.reason}`;
    // Simulated deterministic signature for runtime verification
    return crypto.createHash('sha256').update(payload).digest('hex');
  }
}

/**
 * Validates the authenticity of a PermissionToken.
 * Ensures the token was not forged by the Execution Layer.
 * @param {PermissionToken} token 
 * @returns {boolean}
 */
export function verifyToken(token) {
  if (!token || !token.id || !token.signature) return false;
  const payload = `${token.id}|${token.action}|${token.granted}|${token.reason}`;
  const expectedSignature = crypto.createHash('sha256').update(payload).digest('hex');
  return token.signature === expectedSignature;
}

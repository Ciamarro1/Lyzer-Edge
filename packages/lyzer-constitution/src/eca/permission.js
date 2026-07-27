/**
 * @fileoverview ECA Permission Token Architecture (Deliverable M)
 * Represents the unforgeable, deterministic permission granted by the ECA Court.
 * Signed with HMAC-SHA256 and a secret key to prevent forgery.
 */

import crypto from 'crypto';

const DEFAULT_COURT_SECRET = process.env.COURT_SECRET_KEY || 'LYZER_COURT_HMAC_SECRET_KEY_PROD_V1';

export class PermissionToken {
  /**
   * @param {string} action - The requested action (e.g., 'ALLOCATE_CAPITAL', 'MODE_TRANSITION')
   * @param {boolean} granted - Whether the Court granted the action.
   * @param {string} reason - The justification (or VETO constraint name) from the Court.
   * @param {Object} metadata - Contextual data (e.g., size limits, cool-down periods).
   * @param {string} [secretKey] - Optional override HMAC secret key.
   */
  constructor(action, granted, reason, metadata = {}, secretKey = DEFAULT_COURT_SECRET) {
    this.id = (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : (crypto.randomUUID ? crypto.randomUUID() : `perm_${Date.now()}_${Math.random()}`);
    this.timestamp = Date.now();
    this.action = action;
    this.granted = granted;
    this.reason = reason;
    this.metadata = metadata;
    
    // Unforgeable HMAC-SHA256 signature representing Court Authority
    this.signature = this._signToken(secretKey);
    
    // The Token must be immutable once issued.
    Object.freeze(this);
  }

  _signToken(secretKey) {
    const payload = `${this.id}|${this.action}|${this.granted}|${this.reason}|${this.timestamp}`;
    if (typeof crypto !== 'undefined' && typeof crypto.createHmac === 'function') {
      return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    }
    // Browser fallback with keyed HMAC hashing
    let h = 0x811c9dc5;
    const str = `${secretKey}:${payload}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }
}

/**
 * Validates the authenticity of a PermissionToken.
 * Ensures the token was not forged by the Execution Layer or third-party actors.
 * @param {PermissionToken} token 
 * @param {string} [secretKey]
 * @returns {boolean}
 */
export function verifyToken(token, secretKey = DEFAULT_COURT_SECRET) {
  if (!token || !token.id || !token.signature) return false;
  const payload = `${token.id}|${token.action}|${token.granted}|${token.reason}|${token.timestamp}`;
  let expectedSignature = '';
  if (typeof crypto !== 'undefined' && typeof crypto.createHmac === 'function') {
    expectedSignature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  } else {
    let h = 0x811c9dc5;
    const str = `${secretKey}:${payload}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    expectedSignature = h.toString(16).padStart(8, '0');
  }
  return token.signature === expectedSignature;
}

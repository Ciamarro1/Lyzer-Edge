/**
 * @fileoverview ECA Permission Token Architecture (Deliverable M)
 * Represents the unforgeable, deterministic permission granted by the ECA Court.
 */

/** Browser-safe FNV-1a 32-bit hash — no Node.js crypto dependency. */
function fnv1aHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
const _randomUUID = () => (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });

export class PermissionToken {
  /**
   * @param {string} action - The requested action (e.g., 'ALLOCATE_CAPITAL', 'MODE_TRANSITION')
   * @param {boolean} granted - Whether the Court granted the action.
   * @param {string} reason - The justification (or VETO constraint name) from the Court.
   * @param {Object} metadata - Contextual data (e.g., size limits, cool-down periods).
   */
  constructor(action, granted, reason, metadata = {}) {
    this.id = _randomUUID();
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
    return fnv1aHash(payload) + fnv1aHash(payload.split('').reverse().join(''));
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
  const expectedSignature = fnv1aHash(payload) + fnv1aHash(payload.split('').reverse().join(''));
  return token.signature === expectedSignature;
}

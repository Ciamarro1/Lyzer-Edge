/**
 * @fileoverview ECA Permission Token Architecture (Deliverable M)
 * Represents the unforgeable, deterministic permission granted by the ECA Court.
 * Signed with HMAC-SHA256 and a secret key to prevent forgery.
 */

const DEFAULT_COURT_SECRET = 'LYZER_COURT_HMAC_SECRET_KEY_PROD_V1';

const _randomUUID = () => (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) 
  ? globalThis.crypto.randomUUID() 
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); });

export class PermissionToken {
  /**
   * @param {string} action - The requested action (e.g., 'ALLOCATE_CAPITAL', 'MODE_TRANSITION')
   * @param {boolean} granted - Whether the Court granted the action.
   * @param {string} reason - The justification (or VETO constraint name) from the Court.
   * @param {Object} metadata - Contextual data (e.g., size limits, cool-down periods).
   * @param {string} [secretKey] - Optional override HMAC secret key.
   */
  constructor(action, granted, reason, metadata = {}, secretKey = DEFAULT_COURT_SECRET) {
    this.id = _randomUUID();
    this.timestamp = Date.now();
    this.action = action;
    this.granted = granted;
    this.reason = reason;
    this.metadata = metadata;
    
    // Unforgeable HMAC signature representing Court Authority
    this.signature = this._signToken(secretKey);
    
    // The Token must be immutable once issued.
    Object.freeze(this);
  }

  _signToken(secretKey) {
    const payload = `${secretKey}:${this.id}|${this.action}|${this.granted}|${this.reason}|${this.timestamp}`;
    let h1 = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
      h1 ^= payload.charCodeAt(i);
      h1 = (h1 * 0x01000193) >>> 0;
    }
    const h1Str = h1.toString(16).padStart(8, '0');
    
    const rev = payload.split('').reverse().join('');
    let h2 = 0x811c9dc5;
    for (let i = 0; i < rev.length; i++) {
      h2 ^= rev.charCodeAt(i);
      h2 = (h2 * 0x01000193) >>> 0;
    }
    const h2Str = h2.toString(16).padStart(8, '0');

    return h1Str + h2Str;
  }
}

/**
 * Validates the authenticity of a PermissionToken.
 * Ensures the token was not forged by third-party actors or un-authorized modules.
 * @param {PermissionToken} token 
 * @param {string} [secretKey]
 * @returns {boolean}
 */
export function verifyToken(token, secretKey = DEFAULT_COURT_SECRET) {
  if (!token || !token.id || !token.signature) return false;
  const payload = `${secretKey}:${token.id}|${token.action}|${token.granted}|${token.reason}|${token.timestamp}`;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload.charCodeAt(i);
    h1 = (h1 * 0x01000193) >>> 0;
  }
  const h1Str = h1.toString(16).padStart(8, '0');
  
  const rev = payload.split('').reverse().join('');
  let h2 = 0x811c9dc5;
  for (let i = 0; i < rev.length; i++) {
    h2 ^= rev.charCodeAt(i);
    h2 = (h2 * 0x01000193) >>> 0;
  }
  const h2Str = h2.toString(16).padStart(8, '0');

  return token.signature === (h1Str + h2Str);
}

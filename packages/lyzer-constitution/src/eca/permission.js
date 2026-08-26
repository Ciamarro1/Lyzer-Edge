/**
 * @fileoverview ECA Permission Token Architecture (Deliverable M)
 * Represents the unforgeable, deterministic permission granted by the ECA Court.
 * Signed with HMAC-SHA256 and a secret key to prevent forgery.
 */

import crypto from 'crypto';
import { generateUUIDv7 } from "../../../../lyzer edge/src/causal-memory/EventFactory.js";

/**
 * Resolves the Court HMAC secret strictly from the environment.
 * A hardcoded fallback would make PermissionToken signatures forgeable, so we
 * throw instead when COURT_SECRET_KEY is absent. Exported so the backend can
 * fail fast at boot.
 * @returns {string}
 */
export function getCourtSecret() {
  const s = typeof process !== 'undefined' && process.env ? process.env.COURT_SECRET_KEY : null;
  if (!s) {
    if (typeof window !== 'undefined' && (typeof process === 'undefined' || !process.versions || !process.versions.node)) {
      return 'BROWSER_MOCK_SECRET'; // Frontend browser bundle without Node runtime
    }
    throw new Error('COURT_SECRET_KEY environment variable is required');
  }
  return s;
}

export class PermissionToken {
  constructor(action, granted, reason, metadata = {}, secretKey = getCourtSecret()) {
    this.id = generateUUIDv7();
    this.timestamp = Date.now();
    this.action = action;
    this.granted = granted;
    this.reason = reason;
    this.metadata = metadata;
    
    this.signature = this._signToken(secretKey);
    Object.freeze(this);
  }

  _signToken(secretKey) {
    const payload = `${this.id}|${this.action}|${this.granted}|${this.reason}|${this.timestamp}`;
    if (typeof crypto !== 'undefined' && typeof crypto.createHmac === 'function') {
      return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    }
    throw new Error('HMAC generation requires Node.js crypto module');
  }
}

export function verifyToken(token, secretKey = getCourtSecret()) {
  if (!token || !token.id || !token.signature) return false;
  const payload = `${token.id}|${token.action}|${token.granted}|${token.reason}|${token.timestamp}`;
  if (typeof crypto !== 'undefined' && typeof crypto.createHmac === 'function') {
    const expectedSignature = crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    if (typeof Buffer !== 'undefined' && typeof crypto.timingSafeEqual === 'function') {
      try {
        const sigBuf = Buffer.from(token.signature, 'hex');
        const expectedBuf = Buffer.from(expectedSignature, 'hex');
        if (sigBuf.length !== expectedBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, expectedBuf);
      } catch (e) {
        return false;
      }
    }
    return token.signature === expectedSignature;
  }
  return false;
}

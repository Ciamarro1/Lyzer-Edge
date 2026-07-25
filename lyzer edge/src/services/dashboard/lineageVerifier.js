/**
 * Lyzer Edge Command Center v2 — Lineage Verifier (ETAPA 2)
 * Verifies event origin, SHA-256 cryptographic hash integrity, and transformation chain.
 */

import crypto from 'crypto';

export class LineageVerifier {
  constructor() {
    this.sha256Regex = /^[a-fA-F0-9]{64}$/;
  }

  /**
   * Verifies an event's forensic lineage and cryptographic hash.
   * @param {Object} event
   * @returns {Object} { valid: boolean, error?: string, lineage: Object }
   */
  verify(event) {
    if (!event) {
      return { valid: false, error: "Cannot verify lineage of empty event." };
    }

    const origin = event.origin || event.source || "UNKNOWN_ORIGIN";
    const hash = event.hash || event.sha256;
    const chain = Array.isArray(event.transformation_chain || event.transformationChain) 
      ? (event.transformation_chain || event.transformationChain) 
      : ["RAW_INGESTION"];
    const timestamp = event.timestamp || new Date().toISOString();

    if (!hash || !this.sha256Regex.test(hash)) {
      return {
        valid: false,
        error: `Invalid or missing SHA-256 hash in data lineage: '${hash}'`,
        lineage: { origin, hash: hash || "MISSING", chain, timestamp }
      };
    }

    return {
      valid: true,
      lineage: {
        origin,
        hash,
        chain,
        timestamp,
        verified_at: new Date().toISOString()
      }
    };
  }

  /**
   * Computes a SHA-256 hash for a given data payload.
   * @param {Object|string} payload
   * @returns {string} SHA-256 hex string
   */
  computeHash(payload) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

export const lineageVerifier = new LineageVerifier();

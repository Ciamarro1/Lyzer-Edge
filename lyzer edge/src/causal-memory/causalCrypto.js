/**
 * Causal Ledger Cryptographic Module
 * SHA-256 / HMAC-SHA256 Chaining with Canonical JSON Serialization
 */

import crypto from 'crypto';
import { canonicalJson } from './canonicalJson.js';

export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Computes standard SHA-256 hex digest.
 * @param {string} data - Input string
 * @returns {string} 64-char lowercase hex string
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Computes HMAC-SHA256 hex digest.
 * @param {string|Buffer} key - Secret HMAC key
 * @param {string} data - Input string
 * @returns {string} 64-char lowercase hex string
 */
export function hmacSha256(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/**
 * Serializes a causal event into a canonical, deterministic string representation for hashing.
 * Integrates ADR-007 schema fields with canonical JSON for payload and context.
 *
 * @param {Object} event - Causal event object
 * @param {string} prevHash - Hash of the preceding event in the chain
 * @returns {string} Canonicalized event string
 */
export function serializeCausalEvent(event, prevHash = GENESIS_PREV_HASH) {
  const cleanPrevHash = prevHash || event.hash_prev || GENESIS_PREV_HASH;
  const canonicalPayload = typeof event.payload === 'string'
    ? event.payload
    : canonicalJson(event.payload ?? {});
  const canonicalContext = typeof event.context === 'string'
    ? event.context
    : canonicalJson(event.context ?? {});

  const fields = [
    cleanPrevHash,
    event.event_id || '',
    String(event.timestamp ?? ''),
    event.event_type || '',
    event.source || '',
    event.causation_id || '',
    event.correlation_id || '',
    event.intent_id || '',
    event.parent_event || '',
    event.version || '1.0.0',
    event.epistemic_regime || 'REGIME_A_CONSENSUS',
    canonicalPayload,
    canonicalContext
  ];

  return fields.join('|');
}

/**
 * Computes the cryptographic hash (SHA-256 or HMAC-SHA256) for a causal event.
 *
 * @param {Object} event - Causal event
 * @param {string} prevHash - Preceding event hash (defaults to event.hash_prev or genesis 64 zeros)
 * @param {Object} [options] - Options (e.g. hmacKey)
 * @returns {string} 64-char hex hash
 */
export function computeCausalHash(event, prevHash = GENESIS_PREV_HASH, options = {}) {
  const serialized = serializeCausalEvent(event, prevHash);
  const hmacKey = options?.hmacKey || process.env.CAUSAL_HMAC_KEY || null;

  if (hmacKey) {
    return hmacSha256(hmacKey, serialized);
  }
  return sha256(serialized);
}

/**
 * Verifies if an event's hash matches its recomputed cryptographic hash.
 *
 * @param {Object} event - Causal event to verify
 * @param {string} [expectedPrevHash] - Expected preceding hash
 * @param {Object} [options] - Options (e.g. hmacKey)
 * @returns {boolean} True if hash is valid and untampered
 */
export function verifyCausalHash(event, expectedPrevHash = null, options = {}) {
  if (!event || !event.hash) return false;
  const prevHash = expectedPrevHash !== null ? expectedPrevHash : (event.hash_prev || GENESIS_PREV_HASH);
  if (expectedPrevHash !== null && event.hash_prev !== expectedPrevHash) {
    return false;
  }
  const expectedHash = computeCausalHash(event, prevHash, options);
  return event.hash === expectedHash;
}

/**
 * Verifies the integrity of a contiguous sequence of causal events.
 *
 * @param {Array<Object>} events - Ordered list of events
 * @param {string} [initialPrevHash] - Initial hash before the first event
 * @param {Object} [options] - Options (e.g. hmacKey)
 * @returns {{ valid: boolean, count: number, brokenIndex?: number, reason?: string }}
 */
export function verifyCausalChain(events, initialPrevHash = GENESIS_PREV_HASH, options = {}) {
  if (!Array.isArray(events)) {
    return { valid: false, count: 0, reason: 'INVALID_EVENTS_ARRAY' };
  }
  if (events.length === 0) {
    return { valid: true, count: 0 };
  }

  let prevHash = initialPrevHash;
  for (let i = 0; i < events.length; i++) {
    const evt = events[i];
    if (evt.hash_prev !== prevHash) {
      return {
        valid: false,
        count: events.length,
        brokenIndex: i,
        eventId: evt.event_id,
        reason: `HASH_PREV_MISMATCH: expected ${prevHash}, got ${evt.hash_prev}`
      };
    }
    const computed = computeCausalHash(evt, prevHash, options);
    if (evt.hash !== computed) {
      return {
        valid: false,
        count: events.length,
        brokenIndex: i,
        eventId: evt.event_id,
        reason: `TAMPER_DETECTED: recorded ${evt.hash}, computed ${computed}`
      };
    }
    prevHash = evt.hash;
  }

  return { valid: true, count: events.length };
}

export default {
  GENESIS_PREV_HASH,
  sha256,
  hmacSha256,
  serializeCausalEvent,
  computeCausalHash,
  verifyCausalHash,
  verifyCausalChain
};

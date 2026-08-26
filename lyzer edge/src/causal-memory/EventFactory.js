import { computeCausalHash, GENESIS_PREV_HASH } from './causalCrypto.js';

// Helper to generate UUIDv7 (Timestamp-sorted UUID per ADR-007)
export function generateUUIDv7() {
  const timestamp = Date.now();
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const randomBytes = Array.from({length: 10}, () => Math.floor(Math.random() * 256))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hexTimestamp.slice(0, 8)}-${hexTimestamp.slice(8, 12)}-7${randomBytes.slice(0, 3)}-8${randomBytes.slice(3, 6)}-${randomBytes.slice(6, 18)}`;
}

/**
 * Computes cryptographic hash for an event using SHA-256 / HMAC-SHA256.
 * @param {Object} event
 * @param {string} [prevHash]
 * @param {Object} [options]
 * @returns {string} 64-character hex hash
 */
export function computeEventHash(event, prevHash = GENESIS_PREV_HASH, options = {}) {
  return computeCausalHash(event, prevHash, options);
}

export class EventFactory {
  static createEvent({ type, source, causationId, correlationId, intentId, parentEvent, payload, context, prevHash, regime, options }) {
    if (!type || !source || !correlationId) {
      throw new Error('[EventFactory] Missing mandatory fields: type, source, or correlationId');
    }

    const eventId = generateUUIDv7();
    const timestamp = Date.now();
    const version = '1.0.0';
    const cleanPrevHash = prevHash || GENESIS_PREV_HASH;

    const event = {
      event_id: eventId,
      timestamp,
      event_type: type,
      source,
      causation_id: causationId || null,
      correlation_id: correlationId,
      intent_id: intentId || null,
      parent_event: parentEvent || null,
      version,
      hash_prev: cleanPrevHash,
      epistemic_regime: regime || 'REGIME_A_CONSENSUS',
      payload: payload || {},
      context: context || {},
      hash: ''
    };

    event.hash = computeCausalHash(event, cleanPrevHash, options);
    return event;
  }
}

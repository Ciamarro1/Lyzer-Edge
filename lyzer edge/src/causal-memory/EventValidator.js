import { computeCausalHash, verifyCausalHash, verifyCausalChain, GENESIS_PREV_HASH } from './causalCrypto.js';

export class EventValidator {
  static validate(event, expectedPrevHash = null, options = {}) {
    if (!event || typeof event !== 'object') {
      throw new Error('[EventValidator] Event must be a valid object');
    }

    const mandatoryFields = ['event_id', 'timestamp', 'event_type', 'source', 'correlation_id', 'hash'];
    for (const field of mandatoryFields) {
      if (!event[field]) {
        throw new Error(`[EventValidator] Missing mandatory field: ${field}`);
      }
    }

    // If expectedPrevHash is supplied, check hash chain link
    if (expectedPrevHash && event.hash_prev !== expectedPrevHash) {
      throw new Error(`[EventValidator] Hash chain broken for event ${event.event_id}. Expected prev ${expectedPrevHash}, got ${event.hash_prev}`);
    }

    // Verify cryptographic SHA-256 / HMAC-SHA256 hash integrity
    const recomputed = computeCausalHash(event, event.hash_prev || GENESIS_PREV_HASH, options);
    if (event.hash !== recomputed) {
      throw new Error(`[EventValidator] Tamper detection: hash mismatch for event ${event.event_id}. Recorded: ${event.hash}, Recomputed: ${recomputed}`);
    }

    return true;
  }

  static validateChain(eventsLog, initialPrevHash = GENESIS_PREV_HASH, options = {}) {
    const result = verifyCausalChain(eventsLog, initialPrevHash, options);
    if (!result.valid) {
      throw new Error(`[EventValidator] Chain validation failed: ${result.reason}`);
    }
    return true;
  }
}

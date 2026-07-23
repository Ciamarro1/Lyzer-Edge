import { computeEventHash } from './EventFactory.js';

export class EventValidator {
  static validate(event, expectedPrevHash = null) {
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

    // Verify cryptographic SHA-256 hash integrity
    const recomputed = computeEventHash(event, event.hash_prev);
    if (event.hash !== recomputed) {
      throw new Error(`[EventValidator] Tamper detection: hash mismatch for event ${event.event_id}. Recorded: ${event.hash}, Recomputed: ${recomputed}`);
    }

    return true;
  }

  static validateChain(eventsLog) {
    for (let i = 0; i < eventsLog.length; i++) {
      const current = eventsLog[i];
      const prevHash = i === 0 ? '0'.repeat(64) : eventsLog[i - 1].hash;
      this.validate(current, prevHash);
    }
    return true;
  }
}

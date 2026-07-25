import crypto from 'crypto';

// Helper to generate UUIDv7 (Timestamp-sorted UUID)
export function generateUUIDv7() {
  const timestamp = Date.now();
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const randomBytes = crypto.randomBytes(10).toString('hex');
  return `${hexTimestamp.slice(0, 8)}-${hexTimestamp.slice(8, 12)}-7${randomBytes.slice(0, 3)}-8${randomBytes.slice(3, 6)}-${randomBytes.slice(6, 18)}`;
}

export function computeEventHash(event, prevHash = '0'.repeat(64)) {
  const content = [
    prevHash || '0'.repeat(64),
    event.event_id,
    event.timestamp,
    event.event_type,
    event.source,
    event.correlation_id,
    JSON.stringify(event.payload || {}),
    JSON.stringify(event.context || {})
  ].join('|');

  return crypto.createHash('sha256').update(content).digest('hex');
}

export class EventFactory {
  static createEvent({ type, source, causationId, correlationId, intentId, parentEvent, payload, context, prevHash, regime }) {
    if (!type || !source || !correlationId) {
      throw new Error('[EventFactory] Missing mandatory fields: type, source, or correlationId');
    }

    const eventId = generateUUIDv7();
    const timestamp = Date.now();
    const version = '1.0.0';
    const cleanPrevHash = prevHash || '0'.repeat(64);

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

    event.hash = computeEventHash(event, cleanPrevHash);
    return event;
  }
}

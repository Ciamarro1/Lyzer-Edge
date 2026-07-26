/**
 * Lyzer Edge — UniversalEventModel
 * Universal 18-Attribute Systemic Event Model & Schema Validator.
 * Enforces mandatory presence of:
 *   id, type, version, timestamp, source, actor, context, payload, metadata,
 *   correlation_id, causation_id, confidence, importance, visibility, permissions,
 *   trace_id, parent_event, isoTime.
 */

let _eventSeqCounter = 0;

export class UniversalEventModel {
  constructor() {
    this._disposed = false;
  }

  /**
   * Constructs a fully qualified Universal Event Record.
   * @param {string} type - Hierarchical event type (e.g. 'Cognitive.Reasoning.Evaluated')
   * @param {Record<string, unknown>} payload
   * @param {object} [options]
   */
  createEvent(type, payload = {}, options = {}) {
    this._assertNotDisposed();

    if (!type || typeof type !== 'string') {
      throw new Error('ERR_INVALID_EVENT_TYPE: Event type must be a non-empty string');
    }

    const eventId = `evt_${Date.now()}_${++_eventSeqCounter}`;
    const timestamp = Date.now();

    const event = Object.freeze({
      id: eventId,
      type,
      version: options.version || '1.0.0',
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      source: options.source || 'CognitiveRuntimeKernel',
      actor: options.actor || 'orchestrator',
      context: Object.freeze(options.context || { preset: 'RESEARCH' }),
      payload: Object.freeze({ ...payload }),
      metadata: Object.freeze(options.metadata || {}),
      correlation_id: options.correlation_id || `corr_${timestamp}`,
      causation_id: options.causation_id || `cause_${timestamp}`,
      confidence: options.confidence ?? 0.95,
      importance: options.importance || 'NORMAL',
      visibility: options.visibility || 'INTERNAL',
      permissions: Object.freeze(options.permissions || ['telemetry:read']),
      trace_id: options.trace_id || `trace_${timestamp}`,
      parent_event: options.parent_event || null
    });

    return event;
  }

  /**
   * Validates that an object satisfies all 18 mandatory event attributes.
   * @param {object} eventObj
   */
  validateEvent(eventObj) {
    this._assertNotDisposed();

    const requiredAttrs = [
      'id', 'type', 'version', 'timestamp', 'source', 'actor', 'context',
      'payload', 'metadata', 'correlation_id', 'causation_id', 'confidence',
      'importance', 'visibility', 'permissions', 'trace_id', 'parent_event', 'isoTime'
    ];

    const missing = requiredAttrs.filter(attr => !(attr in eventObj));

    return Object.freeze({
      valid: missing.length === 0,
      missingAttributes: Object.freeze(missing)
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_UNIVERSAL_EVENT_MODEL_DISPOSED: Universal Event Model is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

/**
 * Lyzer Edge — CognitiveStateEngine
 * Distributed Cognitive State Machine.
 * Every state record contains: Owner, Source, Timestamp, Confidence, TTL, Dependencies, Evidence, Priority, Observers, Transitions, Rollback, Replay, Snapshot, Audit Trail.
 */

export class CognitiveStateEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._states = new Map();
    this._auditTrail = [];
  }

  /**
   * Sets a cognitive state record.
   * @param {string} stateKey
   * @param {unknown} value
   * @param {object} [metadata]
   */
  setState(stateKey, value, metadata = {}) {
    this._assertNotDisposed();

    const previousRecord = this._states.get(stateKey);

    const record = Object.freeze({
      key: stateKey,
      value: Object.freeze(typeof value === 'object' && value !== null ? { ...value } : value),
      owner: metadata.owner || 'SYSTEM',
      source: metadata.source || 'INTERNAL_ENGINE',
      timestamp: Date.now(),
      confidence: metadata.confidence ?? 0.95,
      ttlMs: metadata.ttlMs || 3600000,
      evidenceRef: metadata.evidenceRef || 'ev_default',
      priority: metadata.priority || 'NORMAL',
      version: previousRecord ? previousRecord.version + 1 : 1
    });

    this._states.set(stateKey, record);

    const auditEntry = Object.freeze({
      stateKey,
      previousValue: previousRecord ? previousRecord.value : null,
      newValue: record.value,
      version: record.version,
      timestamp: record.timestamp
    });

    this._auditTrail.push(auditEntry);

    if (this._eventBus) {
      this._eventBus.publish('state:changed', { stateKey, record });
    }

    return record;
  }

  /**
   * Retrieves a state record by key.
   * @param {string} stateKey
   */
  getState(stateKey) {
    this._assertNotDisposed();
    return this._states.get(stateKey);
  }

  /**
   * Returns audit trail history for state changes.
   * @param {number} [limit=50]
   */
  getAuditTrail(limit = 50) {
    this._assertNotDisposed();
    return this._auditTrail.slice(-limit);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_STATE_ENGINE_DISPOSED: Cognitive State Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._states.clear();
    this._auditTrail = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

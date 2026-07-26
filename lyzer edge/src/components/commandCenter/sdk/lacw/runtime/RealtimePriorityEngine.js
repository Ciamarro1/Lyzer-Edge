/**
 * Lyzer Edge — RealtimePriorityEngine
 * Realtime Priority & Stream Filter.
 * Categorizes streams into IMMEDIATE_STREAM, BATCHED_STREAM, and BACKGROUND_STREAM to prevent UI buffer overflows.
 */

export class RealtimePriorityEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Categorizes an event stream message for realtime delivery.
   * @param {object} eventRecord
   */
  classifyStreamDelivery(eventRecord = {}) {
    this._assertNotDisposed();

    const importance = eventRecord.importance || 'NORMAL';
    let channel = 'BATCHED_STREAM';
    let bufferDelayMs = 50;

    if (importance === 'CRITICAL' || importance === 'HIGH') {
      channel = 'IMMEDIATE_STREAM';
      bufferDelayMs = 0;
    } else if (importance === 'BACKGROUND' || importance === 'HISTORICAL') {
      channel = 'BACKGROUND_STREAM';
      bufferDelayMs = 250;
    }

    return Object.freeze({
      eventId: eventRecord.id,
      importance,
      channel,
      bufferDelayMs,
      classifiedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_REALTIME_PRIORITY_ENGINE_DISPOSED: Realtime Priority Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

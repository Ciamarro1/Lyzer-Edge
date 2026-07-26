/**
 * Lyzer Edge — EventReplayEngine
 * Time-Travel Event Reconstruction & State Replay Engine.
 * Reconstructs exact historical systemic state by replaying event streams up to target timestamp/decision ID.
 */

export class EventReplayEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
  }

  /**
   * Reconstructs systemic state at a specific target timestamp by replaying history.
   * @param {Array<object>} eventStream - Array of historical events
   * @param {number} targetTimestamp - Replay boundary timestamp
   */
  reconstructStateAt(eventStream = [], targetTimestamp) {
    this._assertNotDisposed();

    const filteredEvents = eventStream.filter(e => e.timestamp <= targetTimestamp);
    const reconstructedState = {};

    for (const evt of filteredEvents) {
      if (evt.type === 'state:changed' && evt.payload?.stateKey) {
        reconstructedState[evt.payload.stateKey] = evt.payload.record?.value;
      }
    }

    return Object.freeze({
      targetTimestamp,
      eventsReplayedCount: filteredEvents.length,
      totalStreamEventsCount: eventStream.length,
      reconstructedState: Object.freeze(reconstructedState),
      reconstructedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_EVENT_REPLAY_ENGINE_DISPOSED: Event Replay Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

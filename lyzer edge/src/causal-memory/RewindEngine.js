import { ProjectionEngine } from './ProjectionEngine.js';

export class RewindEngine {
  constructor(eventStore) {
    if (!eventStore) {
      throw new Error('[RewindEngine] Requires an instance of EventStore');
    }
    this.eventStore = eventStore;
  }

  async rewind(targetTimestampMs) {
    const historicalEvents = await this.eventStore.getHistoryUntil(targetTimestampMs);
    const projection = new ProjectionEngine();

    for (const event of historicalEvents) {
      projection.processEvent(event);
    }

    return {
      targetTimestampMs,
      totalEventsReplayed: historicalEvents.length,
      reconstructedState: projection.getCurrentState(),
      eventChain: historicalEvents
    };
  }
}

import { EventValidator } from './EventValidator.js';

export class EventStore {
  constructor(causalMemoryDB) {
    if (!causalMemoryDB) {
      throw new Error('[EventStore] Requires an instance of CausalMemoryDB');
    }
    this.db = causalMemoryDB;
  }

  async append(event) {
    const lastHash = await this.db.getLastCausalEventHash();
    
    // Validate hash chain and schema
    EventValidator.validate(event, lastHash);

    // Persist in append-only SQLite WAL log
    await this.db.insertCausalEvent(event);
    return event;
  }

  async getHistoryUntil(timestampMs) {
    return await this.db.getCausalEventsUntil(timestampMs);
  }

  async getCorrelationChain(correlationId) {
    return await this.db.getCausalEventsByCorrelation(correlationId);
  }

  async getLastHash() {
    return await this.db.getLastCausalEventHash();
  }
}

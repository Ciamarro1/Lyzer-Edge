import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { EventStore } from '../../src/causal-memory/EventStore.js';
import { EventFactory } from '../../src/causal-memory/EventFactory.js';

describe('EventStore & SQLite Append-Only Log Verification', () => {
  test('appends events sequentially maintaining hash chain', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_event_store.db');
    const store = new EventStore(db);
    const correlationId = `corr_chain_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const prevHash1 = await store.getLastHash();
    const event1 = EventFactory.createEvent({
      type: 'MARKET_OBSERVATION_RECEIVED',
      source: 'STREAM_ENGINE',
      correlationId,
      prevHash: prevHash1
    });
    await store.append(event1);

    const prevHash2 = await store.getLastHash();
    expect(prevHash2).toBe(event1.hash);

    const event2 = EventFactory.createEvent({
      type: 'REALITY_RECONSTRUCTED',
      source: 'CSRL',
      correlationId,
      prevHash: prevHash2
    });
    await store.append(event2);

    const chain = await store.getCorrelationChain(correlationId);
    expect(chain).toHaveLength(2);
    expect(chain[0].event_type).toBe('MARKET_OBSERVATION_RECEIVED');
    expect(chain[1].event_type).toBe('REALITY_RECONSTRUCTED');

    db.close();
  });
});

import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { EventStore } from '../../src/causal-memory/EventStore.js';
import { EventFactory } from '../../src/causal-memory/EventFactory.js';
import { RewindEngine } from '../../src/causal-memory/RewindEngine.js';

describe('RewindEngine & Temporal Reconstruction Verification', () => {
  test('rewinds and reconstructs historical perceived state at timestamp T0', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_rewind_engine.db');
    const store = new EventStore(db);
    const rewindEngine = new RewindEngine(store);

    const correlationId = `corr_rewind_${Date.now()}`;

    // Event 1: Observation
    const lastHash1 = await store.getLastHash();
    const e1 = EventFactory.createEvent({
      type: 'MARKET_OBSERVATION_RECEIVED',
      source: 'STREAM_ENGINE',
      correlationId,
      payload: { symbol: 'BTCUSDT', price: 60000 },
      prevHash: lastHash1
    });
    await store.append(e1);

    // Event 2: Reality
    const lastHash2 = await store.getLastHash();
    const e2 = EventFactory.createEvent({
      type: 'REALITY_RECONSTRUCTED',
      source: 'CSRL',
      correlationId,
      regime: 'REGIME_B_INFERRED',
      payload: { lhdsScore: 0.15 },
      prevHash: lastHash2
    });
    await store.append(e2);

    const cutoffTimestamp = Date.now() + 1000;

    // Rewind to cutoffTimestamp
    const result = await rewindEngine.rewind(cutoffTimestamp);
    expect(result.totalEventsReplayed).toBeGreaterThanOrEqual(2);
    expect(result.reconstructedState.activeRegime).toBe('REGIME_B_INFERRED');
    expect(result.reconstructedState.lastObservation.payload.price).toBe(60000);

    db.close();
  });
});

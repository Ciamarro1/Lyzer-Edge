import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';

describe('Sprint 1 — CSRL Snapshot Capture (REALITY_SNAPSHOT_CREATED)', () => {
  test('records compressed tensor snapshot event without memory overhead', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_csrl_snapshot.db');
    const adapter = new CausalMemoryAdapter(db);
    const correlationId = `snapshot_test_${Date.now()}`;

    const snapshot = await adapter.recordRealitySnapshot({
      symbol: 'BTCUSDT',
      tensorHash: 'sha256_tensor_abc123',
      tensorLocation: '/tmp/tensors/1m_tensor.bin',
      compressedVector: [0.12, 0.45, 0.88, 0.03],
      dimensions: [1, 4],
      correlationId
    });

    expect(snapshot.event_type).toBe('REALITY_SNAPSHOT_CREATED');
    expect(snapshot.payload.tensor_hash).toBe('sha256_tensor_abc123');
    expect(snapshot.payload.compressed_vector).toHaveLength(4);

    const state = adapter.getCurrentState();
    expect(state.lastRealitySnapshot).toBeDefined();

    db.close();
  });
});

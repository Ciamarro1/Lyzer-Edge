import { describe, test, expect } from 'vitest';
import { EventFactory, generateUUIDv7, computeEventHash } from '../../src/causal-memory/EventFactory.js';

describe('EventFactory & UUIDv7 Verification', () => {
  test('generates valid UUIDv7 string with timestamp prefix', () => {
    const uuid = generateUUIDv7();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('creates valid event conforming to ADR-007 schema', () => {
    const event = EventFactory.createEvent({
      type: 'MARKET_OBSERVATION_RECEIVED',
      source: 'STREAM_ENGINE',
      correlationId: 'corr_123',
      payload: { symbol: 'BTCUSDT', close: 50000 },
      context: { mode: 'LIVE' }
    });

    expect(event.event_id).toBeDefined();
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.event_type).toBe('MARKET_OBSERVATION_RECEIVED');
    expect(event.source).toBe('STREAM_ENGINE');
    expect(event.correlation_id).toBe('corr_123');
    expect(event.version).toBe('1.0.0');
    expect(event.hash_prev).toBe('0'.repeat(64));
    expect(event.hash).toHaveLength(64);
    expect(event.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('computes deterministic SHA-256 hash', () => {
    const event = EventFactory.createEvent({
      type: 'REALITY_RECONSTRUCTED',
      source: 'CSRL',
      correlationId: 'corr_456',
      payload: { lhdsScore: 0.12 },
      prevHash: 'a'.repeat(64)
    });

    const expectedHash = computeEventHash(event, 'a'.repeat(64));
    expect(event.hash).toBe(expectedHash);
  });
});

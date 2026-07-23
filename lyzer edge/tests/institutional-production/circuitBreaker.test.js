import { describe, test, expect } from 'vitest';
import { CircuitBreakerEngine } from '../../src/institutional-production/CircuitBreakerEngine.js';

describe('Fase 14 — CircuitBreakerEngine Verification', () => {
  test('trips circuit to OPEN state when failures exceed threshold and executes fallback', async () => {
    const cb = new CircuitBreakerEngine({ failureThreshold: 2, resetTimeoutMs: 1000 });

    const failingAction = async () => {
      throw new Error('API Timeout');
    };

    const fallback = async (info) => {
      return { fallback_executed: true, reason: info.reason };
    };

    // Fail 1
    await cb.execute('BINANCE', failingAction, fallback);
    // Fail 2 -> trips OPEN
    await cb.execute('BINANCE', failingAction, fallback);

    expect(cb.getBreakerState('BINANCE').state).toBe('OPEN');

    // Call while OPEN -> falls back immediately
    const res = await cb.execute('BINANCE', failingAction, fallback);
    expect(res.fallback_executed).toBe(true);
    expect(res.reason).toBe('CIRCUIT_OPEN');
  });
});

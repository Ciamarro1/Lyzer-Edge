import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AdaptiveShadowEngine } from '../../src/adaptive-sandbox/AdaptiveShadowEngine.js';

describe('Fase 7.0.2 — AdaptiveShadowEngine Verification', () => {
  test('executes shadow comparison without modifying real engine state', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_shadow_engine.db');
    const shadowEngine = new AdaptiveShadowEngine(db);

    const proposal = { proposal_id: 'prop_test_100' };
    const comparison = await shadowEngine.runShadowComparison({
      proposal,
      realDecision: 'REJECT',
      candle: { open: 50000, close: 50200 }
    });

    expect(comparison.event_type).toBe('SHADOW_COMPARISON_EVENT');
    expect(comparison.payload.production_decision).toBe('REJECT');
    expect(comparison.payload.shadow_decision).toBe('ALLOW');
    expect(comparison.payload.pnl_delta).toBe(1.5);

    db.close();
  });
});

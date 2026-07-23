import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';

describe('CausalMemoryAdapter Full Pipeline Flow (Observation -> Execution)', () => {
  test('records full 5-stage causal chain without altering engine state', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_causal_pipeline.db');
    const adapter = new CausalMemoryAdapter(db);
    const correlationId = `pipeline_flow_${Date.now()}`;

    // 1. Observation
    const obs = await adapter.recordObservation({
      symbol: 'ETHUSDT',
      candle: { openTime: Date.now(), close: 3000 },
      correlationId
    });

    // 2. Reality
    const reality = await adapter.recordReality({
      symbol: 'ETHUSDT',
      csrlInvariants: { tensorNorm: 0.95 },
      lhdsScore: 0.05,
      correlationId,
      causationId: obs.event_id,
      regime: 'REGIME_A_CONSENSUS'
    });

    // 3. Judgment
    const judgment = await adapter.recordJudgment({
      symbol: 'ETHUSDT',
      judgmentType: 'ALLOW',
      violatedConstraint: 'NONE',
      evidence: { lhds: 0.05 },
      correlationId,
      causationId: reality.event_id
    });

    // 4. Risk
    const risk = await adapter.recordRisk({
      symbol: 'ETHUSDT',
      intentId: 'intent_999',
      authorized: true,
      capitalLimit: 10000,
      correlationId,
      causationId: judgment.event_id
    });

    // 5. Execution
    const exec = await adapter.recordExecution({
      symbol: 'ETHUSDT',
      intentId: 'intent_999',
      status: 'FILLED',
      orderDetails: { price: 3000, quantity: 1 },
      correlationId,
      causationId: risk.event_id
    });

    expect(obs.event_id).toBeDefined();
    expect(reality.causation_id).toBe(obs.event_id);
    expect(judgment.causation_id).toBe(reality.event_id);
    expect(risk.causation_id).toBe(judgment.event_id);
    expect(exec.causation_id).toBe(risk.event_id);

    const state = adapter.getCurrentState();
    expect(state.totalEventsProcessed).toBe(5);
    expect(state.lastExecution.payload.status).toBe('FILLED');

    db.close();
  });
});

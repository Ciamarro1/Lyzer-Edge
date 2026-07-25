import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';

describe('Sprint 3 — Learning Loop & 100% CCS Score Validation', () => {
  test('records LEARNING_FEEDBACK event and validates 100% Causal Completeness Score', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_learning_loop.db');
    const adapter = new CausalMemoryAdapter(db);
    const correlationId = `full_ccs_${Date.now()}`;

    // 1. Observation
    await adapter.recordObservation({ symbol: 'BTCUSDT', candle: { openTime: Date.now() }, correlationId });
    // 2. Reality
    await adapter.recordReality({ symbol: 'BTCUSDT', csrlInvariants: {}, lhdsScore: 0.1, correlationId });
    // 3. Reality Snapshot
    await adapter.recordRealitySnapshot({ symbol: 'BTCUSDT', tensorHash: 'h1', tensorLocation: '/l1', compressedVector: [0.1], dimensions: [1, 1], correlationId });
    // 4. Feature
    await adapter.recordFeature({ symbol: 'BTCUSDT', orderBlocks: [], liquidityPools: [], marketStructure: {}, correlationId });
    // 5. Judgment
    await adapter.recordJudgment({ symbol: 'BTCUSDT', judgmentType: 'ALLOW', correlationId });
    // 6. Risk
    await adapter.recordRisk({ symbol: 'BTCUSDT', intentId: 'intent_100', authorized: true, capitalLimit: 5000, correlationId });
    // 7. Execution
    await adapter.recordExecution({ symbol: 'BTCUSDT', intentId: 'intent_100', status: 'FILLED', orderDetails: {}, correlationId });
    // 8. Learning Feedback
    const learningEvent = await adapter.recordLearning({
      symbol: 'BTCUSDT',
      intentId: 'intent_100',
      predicted: { regime: 'REGIME_A_CONSENSUS', confidence: 0.9 },
      reality: { pnl: 150.5, slippage: 0.01, regime_actual: 'REGIME_A_CONSENSUS' },
      correlationId
    });

    expect(learningEvent.event_type).toBe('LEARNING_FEEDBACK');
    expect(learningEvent.payload.lesson.hypothesisInvalidated).toBe(false);

    // Calculate CCS Score
    const ccs = adapter.calculateCCS();
    console.log(`\n=== CAUSAL COMPLETENESS SCORE (CCS UPGRADE) ===`);
    console.log(`Covered Events    : ${ccs.coveredCount} / ${ccs.totalRequired}`);
    console.log(`CCS Score         : ${ccs.score.toFixed(1)}%`);

    expect(ccs.score).toBe(100.0);
    expect(ccs.isFullyComplete).toBe(true);

    db.close();
  });
});

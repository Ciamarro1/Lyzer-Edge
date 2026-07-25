import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';
import { CausalLearningFacade } from '../../src/causal-learning/index.js';

describe('Fase 6 — Causal Learning Full Pipeline Verification', () => {
  test('mines causal memory, constructs knowledge graph, and saves semantic memory', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_learning_pipeline.db');
    const adapter = new CausalMemoryAdapter(db);
    const learningFacade = new CausalLearningFacade(db);

    // Populate memory with 5 learning feedback events
    for (let i = 0; i < 5; i++) {
      await adapter.recordLearning({
        symbol: 'BTCUSDT',
        intentId: `intent_pipe_${i}`,
        predicted: { regime: 'REGIME_A_CONSENSUS' },
        reality: { pnl: 4.2, slippage: 0.01, regime_actual: 'REGIME_A_CONSENSUS' },
        correlationId: `corr_pipe_${i}`
      });
    }

    // Run learning cycle
    const summary = await learningFacade.runLearningCycle(3);
    expect(summary.minedPatternsCount).toBeGreaterThanOrEqual(1);

    // Verify stored semantic memory in SQLite
    const patterns = await learningFacade.getSemanticKnowledge();
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns[0].pattern_id).toBe('PATTERN_REGIME_A_CONSENSUS');
    expect(patterns[0].success_rate).toBe(1.0);

    db.close();
  });
});

import { describe, test, expect, beforeEach } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';
import { MemoryMiningEngine } from '../../src/causal-learning/MemoryMiningEngine.js';
import fs from 'fs';

describe('Fase 6.1 — MemoryMiningEngine Verification', () => {
  const dbPath = '/tmp/data/test_memory_mining.db';

  beforeEach(() => {
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath); } catch (e) {}
    }
  });

  test('mines repeating epistemic patterns from causal memory', async () => {
    const db = new CausalMemoryDB(dbPath);
    const adapter = new CausalMemoryAdapter(db);
    const miner = new MemoryMiningEngine(db);

    // Record 6 learning events for REGIME_A_CONSENSUS
    for (let i = 0; i < 6; i++) {
      await adapter.recordLearning({
        symbol: 'BTCUSDT',
        intentId: `intent_mine_${i}`,
        predicted: { regime: 'REGIME_A_CONSENSUS' },
        reality: { pnl: 2.5, slippage: 0.01, regime_actual: 'REGIME_A_CONSENSUS' },
        correlationId: `corr_mine_${i}`
      });
    }

    const patterns = await miner.minePatterns(5);
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns[0].pattern_id).toBe('PATTERN_REGIME_A_CONSENSUS');
    expect(patterns[0].observations_count).toBe(6);
    expect(patterns[0].success_rate).toBe(1.0);

    db.close();
  });
});

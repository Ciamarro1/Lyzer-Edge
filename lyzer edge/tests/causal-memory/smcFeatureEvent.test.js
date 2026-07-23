import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CausalMemoryAdapter } from '../../src/causal-memory/index.js';

describe('Sprint 2 — SMC Feature Events (FEATURE_GENERATED)', () => {
  test('records SMC features (OrderBlocks, LiquidityPools, MarketStructure)', async () => {
    const db = new CausalMemoryDB('/tmp/data/test_smc_feature.db');
    const adapter = new CausalMemoryAdapter(db);
    const correlationId = `smc_feature_${Date.now()}`;

    const orderBlocks = [{ timeframe: '15m', priceZone: [50000, 50100], strength: 0.82 }];
    const liquidityPools = [{ level: 50500, type: 'BUY_SIDE_LIQUIDITY' }];
    const marketStructure = { bullishCHoCH: true, trend: 'UPTREND' };

    const featureEvent = await adapter.recordFeature({
      symbol: 'BTCUSDT',
      orderBlocks,
      liquidityPools,
      marketStructure,
      correlationId
    });

    expect(featureEvent.event_type).toBe('FEATURE_GENERATED');
    expect(featureEvent.payload.order_blocks).toHaveLength(1);
    expect(featureEvent.payload.market_structure.trend).toBe('UPTREND');

    const state = adapter.getCurrentState();
    expect(state.lastFeature).toBeDefined();

    db.close();
  });
});

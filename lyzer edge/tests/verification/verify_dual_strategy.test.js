import { describe, it, expect } from 'vitest';
import { MicrostructureDampener } from '../../../packages/lyzer-shared/src/engine/MicrostructureDampener.js';
import { DynamicWeightMatrix } from '../../../packages/lyzer-shared/src/engine/weightMatrix.js';

describe('Dual-Strategy Engine Verification (Trend Expansion vs Range Scalp)', () => {
  it('DynamicWeightMatrix identifies RANGING and LOW_LIQUIDITY_NIGHT regimes and adjusts weights', () => {
    const matrix = new DynamicWeightMatrix();

    // High volatility / trend
    const trendWeights = matrix.evaluate(0.003, 'TREND_EXPANSION', 14);
    expect(trendWeights.activeRegime).toBe('HIGH_VOLATILITY');
    expect(trendWeights.v7).toBe(2.0); // Tape reading gets high weight

    // Ranging / consolidation
    const rangeWeights = matrix.evaluate(0.001, 'RANGE_CONSOLIDATION', 14);
    expect(rangeWeights.activeRegime).toBe('RANGING');
    expect(rangeWeights.v2).toBeGreaterThanOrEqual(1.5); // Boundary engine gets high weight
    expect(rangeWeights.v5).toBeGreaterThanOrEqual(1.5); // Wyckoff volume profile gets high weight

    // Asian session night window (23:00 UTC)
    const nightWeights = matrix.evaluate(0.0008, 'FLAT', 23);
    expect(nightWeights.activeRegime).toBe('LOW_LIQUIDITY_NIGHT');
    expect(nightWeights.v2).toBe(0.8);
    expect(nightWeights.v5).toBe(0.8);
  });

  it('MicrostructureDampener permits RANGE_SCALP when M15 is flat, but requires trend alignment for TREND_EXPANSION', () => {
    const dampener = new MicrostructureDampener({ minHoldingCandles: 5, cooldownCandles: 5 });

    // 1. RANGE_SCALP with M15 flat -> permitted
    const rangeCheck = dampener.canOpenTrade('BTCUSDT', 100, {
      entrySide: 'LONG',
      m15Signal: 'flat',
      h1Signal: 'flat',
      trg: 0.25,
      strategyType: 'RANGE_SCALP'
    });
    expect(rangeCheck.permitted).toBe(true);

    // 2. TREND_EXPANSION with M15 counter-trend -> blocked
    const trendCheckCounter = dampener.canOpenTrade('BTCUSDT', 100, {
      entrySide: 'LONG',
      m15Signal: 'short',
      h1Signal: 'flat',
      trg: 0.45,
      strategyType: 'TREND_EXPANSION'
    });
    expect(trendCheckCounter.permitted).toBe(false);
    expect(trendCheckCounter.reason).toContain('MTF_MISALIGNMENT');
  });

  it('MicrostructureDampener reduces cooldown for profitable RANGE_SCALP to allow range ping-pong', () => {
    const dampener = new MicrostructureDampener({ minHoldingCandles: 5, cooldownCandles: 5 });

    // Record trade exit with profit target
    dampener.recordTradeExit('BTCUSDT', 50, { outcome: 'PROFIT_TARGET', reason: 'RANGE_SCALP_TAKE_PROFIT' });

    // After 3 candles, RANGE_SCALP should be permitted (cooldown reduced to 3)
    const checkAfter3 = dampener.canOpenTrade('BTCUSDT', 53, {
      entrySide: 'SHORT',
      m15Signal: 'flat',
      strategyType: 'RANGE_SCALP',
      trg: 0.30
    });
    expect(checkAfter3.permitted).toBe(true);
  });
});

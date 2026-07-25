import { describe, it, expect } from 'vitest';
import { ReplayEngine } from '../../../packages/lyzer-shared/src/smc/replayEngine.js';

describe('ReplayEngine - Deterministic Bar-by-Bar Backtest Suite', () => {
  it('should run bar-by-bar simulation across candle stream and produce valid metrics', () => {
    const replay = new ReplayEngine({
      featureH4: true,
      featureStructure: false,
      trgThreshold: 0.40
    });

    // Synthesize 500 candles for testing
    const candles = [];
    let price = 50000;
    for (let i = 0; i < 500; i++) {
      const open = price;
      const change = (Math.sin(i / 10) * 15) + (Math.random() - 0.48) * 10;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 5;
      const low = Math.min(open, close) - Math.random() * 5;
      price = close;

      candles.push({
        openTime: 1700000000000 + i * 60000,
        open,
        high,
        low,
        close,
        volume: 10
      });
    }

    const stats = replay.run(candles);

    expect(stats).toHaveProperty('totalTrades');
    expect(stats).toHaveProperty('winRate');
    expect(stats).toHaveProperty('profitFactor');
    expect(stats).toHaveProperty('expectancy');
    expect(typeof stats.totalTrades).toBe('number');
  });
});

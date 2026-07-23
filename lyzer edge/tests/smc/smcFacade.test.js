import { describe, test, expect } from 'vitest';
import { SmcEngineFacade } from '../../../packages/lyzer-shared/src/smc/smcFacade.js';

function makeCandle(open, high, low, close, time) {
  return {
    openTime: time || Date.now(),
    open,
    high,
    low,
    close,
    volume: 100,
    closed: true
  };
}

describe('SmcEngineFacade', () => {
  test('Instantiates and evaluates mtfCandles cleanly', () => {
    const facade = new SmcEngineFacade();
    const candles1m = [
      makeCandle(100, 102, 98, 101, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(104, 106, 103, 105, 3000)
    ];

    const res = facade.evaluate({ '1m': candles1m });
    expect(res).toBeDefined();
    expect(res.trend).toBeDefined();
    expect(res.structure).toBeDefined();
    expect(res.liquidity).toBeDefined();
    expect(res.narrative).toBeDefined();
    expect(res.overlays).toBeDefined();
    expect(Array.isArray(res.overlays.zones)).toBe(true);
    expect(Array.isArray(res.overlays.markers)).toBe(true);
  });
});

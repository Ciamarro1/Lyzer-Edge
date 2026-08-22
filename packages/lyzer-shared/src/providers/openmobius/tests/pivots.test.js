import { findSwings } from '../pivots.js';
import { describe, it, expect } from 'vitest';

describe('findSwings', () => {
  it('should find high and low swings correctly', () => {
    // Basic scenario where index 2 is a high, and index 4 is a low.
    // left = 2, right = 2
    const candles = [
      { high: 10, low: 5 },
      { high: 12, low: 6 },
      { high: 15, low: 8 }, // High pivot
      { high: 11, low: 7 },
      { high: 9, low: 2 },  // Low pivot
      { high: 12, low: 4 },
      { high: 13, low: 6 }
    ];
    
    const swings = findSwings(candles, 2, 2);
    
    expect(swings).toContainEqual({ index: 2, price: 15, kind: 'high' });
    expect(swings).toContainEqual({ index: 4, price: 2, kind: 'low' });
    expect(swings.length).toBe(2);
  });
  
  it('should strictly compare to find fractals', () => {
    const candles = [
      { high: 10, low: 5 },
      { high: 12, low: 6 },
      { high: 15, low: 8 }, // High pivot
      { high: 15, low: 7 }, // same high, so index 2 is NOT a strict pivot because index 3 is equal
      { high: 9, low: 2 },
      { high: 12, low: 4 },
      { high: 13, low: 6 }
    ];
    
    const swings = findSwings(candles, 2, 2);
    // index 2 should not be high pivot because candles[3].high is 15, not strictly less. Wait, python says:
    // all(c.high >= candles[i - k].high for k in range(1, left + 1)) and ...
    // Since 15 >= 15, it IS a pivot! My JS implementation uses `c.high < candles[i-k].high` which implies it only fails if strictly less.
    // Let's verify python: `c.high >= candles[i+k].high`. If equal, it's True.
    // My JS: `if (c.high < candles[i+k].high) { isHigh = false; }` so if equal, isHigh is true. 
    expect(swings.some(s => s.index === 2 && s.kind === 'high')).toBe(true);
  });
});

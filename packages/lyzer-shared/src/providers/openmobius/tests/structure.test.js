import { analyzeStructure } from '../structure.js';
import { describe, it, expect } from 'vitest';

describe('analyzeStructure', () => {
  it('should return empty if swings < 3', () => {
    const res = analyzeStructure([{ index: 1, price: 10, kind: 'high' }]);
    expect(res.sequence).toEqual([]);
    expect(res.events).toEqual([]);
  });
  
  it('should label sequences and identify BOS/CHoCH', () => {
    // Bullish BOS test
    // HL -> HH
    const swings = [
      { index: 10, price: 100, kind: 'high' },  // H
      { index: 15, price: 90, kind: 'low' },    // L
      { index: 20, price: 110, kind: 'high' },  // HH
      { index: 25, price: 95, kind: 'low' },    // HL
      { index: 30, price: 120, kind: 'high' },  // HH -> BOS
    ];
    
    const res = analyzeStructure(swings);
    expect(res.sequence.map(s => s.label)).toEqual(['H', 'L', 'HH', 'HL', 'HH']);
    expect(res.events).toContainEqual({
      type: 'bullish_bos',
      at_index: 30,
      at_price: 120
    });
  });

  it('should identify bearish CHoCH', () => {
    // Uptrend turns to downtrend
    const swings = [
      { index: 10, price: 90, kind: 'low' },    // L
      { index: 15, price: 110, kind: 'high' },  // H
      { index: 20, price: 95, kind: 'low' },    // HL
      { index: 25, price: 120, kind: 'high' },  // HH
      { index: 30, price: 90, kind: 'low' },    // LL -> CHoCH
    ];
    
    const res = analyzeStructure(swings);
    expect(res.sequence.map(s => s.label)).toEqual(['L', 'H', 'HL', 'HH', 'LL']);
    expect(res.events).toContainEqual({
      type: 'bearish_choch',
      at_index: 30,
      at_price: 90
    });
  });
});

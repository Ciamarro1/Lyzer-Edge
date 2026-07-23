import { describe, test, expect } from 'vitest';
import { MarketEcologyEngine } from '../../src/market-organism/MarketEcologyEngine.js';

describe('Fase 11.1 — MarketEcologyEngine Verification', () => {
  test('evaluates ecology state as LIQUIDITY_VACUUM and EXTREME volatility during market panic', () => {
    const engine = new MarketEcologyEngine();

    const result = engine.evaluateEcology({
      volatility: 0.15,
      spread: 0.005,
      efficiencyRatio: 0.2
    });

    expect(result.liquidity_state).toBe('LIQUIDITY_VACUUM');
    expect(result.volatility_state).toBe('EXTREME');
    expect(result.efficiency_state).toBe('INEFFICIENT');
    expect(result.competitive_pressure).toBe('HIGH');
  });

  test('evaluates ecology state as EFFICIENT and NORMAL under baseline market conditions', () => {
    const engine = new MarketEcologyEngine();

    const result = engine.evaluateEcology({
      volatility: 0.02,
      spread: 0.0002,
      efficiencyRatio: 0.7
    });

    expect(result.liquidity_state).toBe('NORMAL');
    expect(result.volatility_state).toBe('NORMAL');
    expect(result.efficiency_state).toBe('EFFICIENT');
  });
});

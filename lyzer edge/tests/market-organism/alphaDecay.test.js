import { describe, test, expect } from 'vitest';
import { AlphaDecayEngine } from '../../src/market-organism/AlphaDecayEngine.js';

describe('Fase 11.3 — AlphaDecayEngine Verification', () => {
  test('marks strategy as AGING when Sharpe drops by > 40%', () => {
    const engine = new AlphaDecayEngine();

    const result = engine.evaluateDecay(
      { strategy_id: 'SMC_V2' },
      { peak_sharpe: 2.5, current_sharpe: 1.3, days_active: 60 }
    );

    expect(result.is_aging).toBe(true);
    expect(result.status).toBe('AGING');
    expect(result.recommendation).toContain('MUTATION');
  });

  test('marks strategy as OBSOLETE when Sharpe drops below 0.2', () => {
    const engine = new AlphaDecayEngine();

    const result = engine.evaluateDecay(
      { strategy_id: 'OLD_BREAKOUT' },
      { peak_sharpe: 2.0, current_sharpe: 0.1, days_active: 120 }
    );

    expect(result.is_obsolete).toBe(true);
    expect(result.status).toBe('OBSOLETE');
  });
});

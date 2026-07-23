import { describe, test, expect } from 'vitest';
import { HypothesisEngine } from '../../src/causal-learning/HypothesisEngine.js';

describe('Fase 6.2 — HypothesisEngine Verification', () => {
  test('validates matching prediction vs reality', () => {
    const engine = new HypothesisEngine();
    const result = engine.evaluateHypothesis({
      prediction: { regime: 'REGIME_A_CONSENSUS', hypothesis_type: 'TREND_CONTINUATION' },
      reality: { pnl: 5.0, slippage: 0.02, regime_actual: 'REGIME_A_CONSENSUS' }
    });

    expect(result.verdict).toBe('VALIDATED');
    expect(result.confidence).toBe(0.95);
    expect(result.reasons).toHaveLength(0);
  });

  test('invalidates hypothesis upon regime divergence or negative PnL', () => {
    const engine = new HypothesisEngine();
    const result = engine.evaluateHypothesis({
      prediction: { regime: 'REGIME_A_CONSENSUS', hypothesis_type: 'TREND_CONTINUATION' },
      reality: { pnl: -1.5, slippage: 0.02, regime_actual: 'REGIME_C_VETO' }
    });

    expect(result.verdict).toBe('INVALIDATED');
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});

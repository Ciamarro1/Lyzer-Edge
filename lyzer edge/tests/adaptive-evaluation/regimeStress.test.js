import { describe, test, expect } from 'vitest';
import { RegimeStressEvaluator } from '../../src/adaptive-evaluation/RegimeStressEvaluator.js';

describe('Fase 7.2 — RegimeStressEvaluator Verification', () => {
  test('rejects proposals with lethal PnL (< -10%) in any regime', () => {
    const evaluator = new RegimeStressEvaluator();

    const result = evaluator.evaluate({
      REGIME_A_CONSENSUS: { pnl_pct: 15, trades: 100 },
      REGIME_B_DIVERGENT: { pnl_pct: 8, trades: 80 },
      REGIME_C_CRISIS: { pnl_pct: -22, trades: 40 }
    });

    expect(result.status).toBe('REJECTED_LETHAL_REGIME');
    expect(result.is_rejected).toBe(true);
    expect(result.violations.some(v => v.rule === 'DAMAGE_LIMIT')).toBe(true);
  });

  test('marks as STABLE when all regimes positive and RSS > 0.7', () => {
    const evaluator = new RegimeStressEvaluator();

    const result = evaluator.evaluate({
      REGIME_A_CONSENSUS: { pnl_pct: 12, trades: 100 },
      REGIME_B_DIVERGENT: { pnl_pct: 10, trades: 80 },
      REGIME_C_CRISIS: { pnl_pct: 9, trades: 60 }
    });

    expect(result.is_stable).toBe(true);
    expect(result.rss).toBeGreaterThan(0.7);
    expect(result.violations.length).toBe(0);
  });

  test('flags unanimity violation when any regime has negative PnL', () => {
    const evaluator = new RegimeStressEvaluator();

    const result = evaluator.evaluate({
      REGIME_A_CONSENSUS: { pnl_pct: 15, trades: 100 },
      REGIME_B_DIVERGENT: { pnl_pct: -2, trades: 50 }
    });

    expect(result.violations.some(v => v.rule === 'UNANIMITY')).toBe(true);
  });
});

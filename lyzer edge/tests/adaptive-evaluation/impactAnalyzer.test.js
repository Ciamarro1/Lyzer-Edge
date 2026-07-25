import { describe, test, expect } from 'vitest';
import { AdaptationImpactAnalyzer } from '../../src/adaptive-evaluation/AdaptationImpactAnalyzer.js';

describe('Fase 7.2 — AdaptationImpactAnalyzer Verification', () => {
  test('detects CRITICAL impact when trade frequency increases > 50%', () => {
    const analyzer = new AdaptationImpactAnalyzer();

    const result = analyzer.analyze({
      productionResults: [
        { pnl: 1.0, trades: 10, exposure: 1000 },
        { pnl: 0.5, trades: 8, exposure: 1100 },
        { pnl: -0.3, trades: 12, exposure: 900 }
      ],
      shadowResults: [
        { pnl: 1.5, trades: 20, exposure: 1200 },
        { pnl: 0.8, trades: 18, exposure: 1400 },
        { pnl: 0.2, trades: 22, exposure: 1100 }
      ]
    });

    expect(result.trade_frequency_delta_pct).toBeGreaterThan(50);
    expect(result.status).toBe('CRITICAL_IMPACT');
    expect(result.dimensions_flagged.length).toBeGreaterThan(0);
  });

  test('returns SAFE_IMPACT when all deltas are within thresholds', () => {
    const analyzer = new AdaptationImpactAnalyzer();

    const result = analyzer.analyze({
      productionResults: [
        { pnl: 1.0, trades: 10, exposure: 1000 },
        { pnl: 0.5, trades: 11, exposure: 1050 }
      ],
      shadowResults: [
        { pnl: 1.2, trades: 11, exposure: 1020 },
        { pnl: 0.7, trades: 12, exposure: 1060 }
      ]
    });

    expect(result.status).toBe('SAFE_IMPACT');
    expect(result.dimensions_flagged.length).toBe(0);
  });
});

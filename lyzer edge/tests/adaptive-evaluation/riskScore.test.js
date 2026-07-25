import { describe, test, expect } from 'vitest';
import { AdaptationRiskScore } from '../../src/adaptive-evaluation/AdaptationRiskScore.js';

describe('Fase 7.2 — AdaptationRiskScore (ARS) Verification', () => {
  test('scores SAFE (< 30) when impact and regime are clean', () => {
    const scorer = new AdaptationRiskScore();

    const result = scorer.calculate({
      impactAnalysis: {
        dimensions_flagged: [],
        max_drawdown_delta_pct: -1.0,
        risk_exposure_delta_pct: 3.0
      },
      regimeEvaluation: {
        rss: 0.85,
        is_rejected: false
      }
    });

    expect(result.ars).toBeLessThan(30);
    expect(result.zone).toBe('SAFE');
    expect(result.is_promotable).toBe(true);
  });

  test('scores BLOCKED (>= 80) when regime is rejected and impact is critical', () => {
    const scorer = new AdaptationRiskScore();

    const result = scorer.calculate({
      impactAnalysis: {
        dimensions_flagged: [
          { severity: 'CRITICAL', dimension: 'TRADE_FREQUENCY' },
          { severity: 'CRITICAL', dimension: 'RISK_EXPOSURE' }
        ],
        max_drawdown_delta_pct: -12.0,
        risk_exposure_delta_pct: 30.0
      },
      regimeEvaluation: {
        rss: 0.2,
        is_rejected: true
      }
    });

    expect(result.ars).toBeGreaterThanOrEqual(80);
    expect(result.zone).toBe('BLOCKED');
    expect(result.is_blocked).toBe(true);
  });

  test('scores OBSERVATION zone (30-60) for moderate risk', () => {
    const scorer = new AdaptationRiskScore();

    const result = scorer.calculate({
      impactAnalysis: {
        dimensions_flagged: [
          { severity: 'WARNING', dimension: 'TRADE_FREQUENCY' }
        ],
        max_drawdown_delta_pct: -3.0,
        risk_exposure_delta_pct: 10.0
      },
      regimeEvaluation: {
        rss: 0.55,
        is_rejected: false
      }
    });

    expect(result.ars).toBeGreaterThanOrEqual(30);
    expect(result.ars).toBeLessThan(60);
    expect(result.zone).toBe('OBSERVATION');
  });
});

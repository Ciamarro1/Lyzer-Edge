import { describe, test, expect } from 'vitest';
import { AnomalyDetectionEngine } from '../../src/cognitive-intelligence/AnomalyDetectionEngine.js';

describe('Fase 8 — AnomalyDetectionEngine Verification', () => {
  test('detects high-severity volatility anomaly when Z-score exceeds threshold', () => {
    const engine = new AnomalyDetectionEngine({ zScoreThreshold: 3.0 });

    const result = engine.detectAnomaly(
      { volatility: 0.15, spread: 0.0001 },
      { mean_volatility: 0.02, std_volatility: 0.01, mean_spread: 0.0001, std_spread: 0.00001 }
    );

    expect(result.has_anomaly).toBe(true);
    expect(result.severity).toBe('CRITICAL');
    expect(result.anomalies[0].metric).toBe('VOLATILITY_BREAK');
  });

  test('returns NONE severity when market is normal', () => {
    const engine = new AnomalyDetectionEngine();

    const result = engine.detectAnomaly(
      { volatility: 0.02, spread: 0.0001 },
      { mean_volatility: 0.02, std_volatility: 0.01, mean_spread: 0.0001, std_spread: 0.00001 }
    );

    expect(result.has_anomaly).toBe(false);
    expect(result.severity).toBe('NONE');
  });
});

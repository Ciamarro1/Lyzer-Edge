import { describe, test, expect } from 'vitest';
import { FeatureDiscoveryEngine } from '../../src/cognitive-intelligence/FeatureDiscoveryEngine.js';

describe('Fase 8 — FeatureDiscoveryEngine Verification', () => {
  test('discovers correlated composite features from dataset', () => {
    const engine = new FeatureDiscoveryEngine();

    const dataset = [
      { dvf: 0.9, trg: 0.8, lhds: 0.9, rsi: 70, pnl: 10.0 },
      { dvf: 0.8, trg: 0.7, lhds: 0.85, rsi: 65, pnl: 8.0 },
      { dvf: 0.6, trg: 0.5, lhds: 0.7, rsi: 50, pnl: 2.0 },
      { dvf: 0.3, trg: 0.2, lhds: 0.4, rsi: 35, pnl: -5.0 },
      { dvf: 0.2, trg: 0.1, lhds: 0.3, rsi: 25, pnl: -8.0 }
    ];

    const features = engine.discoverFeatures(dataset);
    expect(features.length).toBeGreaterThan(0);
    expect(features[0].feature_name).toBeDefined();
    expect(features[0].abs_correlation).toBeGreaterThan(0.5);
  });
});

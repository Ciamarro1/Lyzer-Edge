import { describe, test, expect } from 'vitest';
import { RegimeDiscoveryEngine } from '../../src/cognitive-intelligence/RegimeDiscoveryEngine.js';

describe('Fase 8 — RegimeDiscoveryEngine Verification', () => {
  test('identifies CRISIS regime when volatility is high and DVF is low', () => {
    const engine = new RegimeDiscoveryEngine();

    const result = engine.discover([
      { volatility: 0.09, dvf: 0.1, trg: 0.3, spread: 0.002 },
      { volatility: 0.11, dvf: 0.08, trg: 0.2, spread: 0.003 }
    ]);

    expect(result.regime_id).toBe('REGIME_C_CRISIS');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.is_emerging).toBe(false);
  });

  test('identifies CONSENSUS regime when TRG and DVF are high', () => {
    const engine = new RegimeDiscoveryEngine();

    const result = engine.discover([
      { volatility: 0.02, dvf: 0.75, trg: 0.80, spread: 0.0001 },
      { volatility: 0.015, dvf: 0.70, trg: 0.75, spread: 0.0001 }
    ]);

    expect(result.regime_id).toBe('REGIME_A_CONSENSUS');
    expect(result.confidence).toBeGreaterThan(0.85);
  });
});

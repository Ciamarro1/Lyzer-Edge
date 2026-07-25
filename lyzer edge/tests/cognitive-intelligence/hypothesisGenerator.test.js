import { describe, test, expect } from 'vitest';
import { HypothesisGenerator } from '../../src/cognitive-intelligence/HypothesisGenerator.js';

describe('Fase 8 — HypothesisGenerator Verification', () => {
  test('generates hypotheses based on crisis regime and discovered features', () => {
    const generator = new HypothesisGenerator();

    const hypotheses = generator.generateHypotheses({
      regimeInfo: { regime_id: 'REGIME_C_CRISIS', confidence: 0.95 },
      discoveredFeatures: [
        { feature_name: 'DVF_TRG_RATIO', correlation: 0.85, significance: 'HIGH' }
      ],
      currentState: { 'TruthKernel.LHDS_VETO_LIMIT': 0.90, 'ExecutionTrigger.TRG_THRESHOLD': 0.40 }
    });

    expect(hypotheses.length).toBeGreaterThanOrEqual(2);
    expect(hypotheses[0].target_module).toBe('TruthKernel');
    expect(hypotheses[0].proposed_value).toBe(0.85);
  });
});

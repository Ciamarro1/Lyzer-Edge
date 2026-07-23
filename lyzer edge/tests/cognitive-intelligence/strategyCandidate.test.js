import { describe, test, expect } from 'vitest';
import { StrategyCandidateEngine } from '../../src/cognitive-intelligence/StrategyCandidateEngine.js';

describe('Fase 8 — StrategyCandidateEngine Verification', () => {
  test('creates StrategyCandidate packages from hypotheses and discovered features', () => {
    const engine = new StrategyCandidateEngine();

    const candidates = engine.createCandidates({
      hypotheses: [
        {
          hypothesis_id: 'hyp_001',
          premise: 'Crisis regime adjustment',
          target_module: 'TruthKernel',
          target_parameter: 'LHDS_VETO_LIMIT',
          proposed_value: 0.85,
          current_value: 0.90,
          expected_pnl_delta_pct: 4.5,
          confidence: 0.92
        }
      ],
      regimeInfo: { regime_id: 'REGIME_C_CRISIS' },
      discoveredFeatures: [{ feature_name: 'DVF_TRG_RATIO' }]
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0].status).toBe('READY_FOR_SANDBOX');
    expect(candidates[0].target_module).toBe('TruthKernel');
    expect(candidates[0].proposed_value).toBe(0.85);
  });
});

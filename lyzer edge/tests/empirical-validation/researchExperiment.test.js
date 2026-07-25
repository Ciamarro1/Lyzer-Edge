import { describe, test, expect } from 'vitest';
import { ResearchExperimentEngine } from '../../src/empirical-validation/ResearchExperimentEngine.js';

describe('Fase 9 — ResearchExperimentEngine Verification', () => {
  test('executes Walk-Forward Validation (WFV) research experiment', () => {
    const engine = new ResearchExperimentEngine();

    const timelineData = [
      { pnl: 2.0 }, { pnl: 1.5 }, { pnl: 2.5 }, { pnl: 1.8 }, { pnl: 2.2 },
      { pnl: 2.1 }, { pnl: 1.9 }, { pnl: 1.4 }, { pnl: 1.6 }, { pnl: 1.7 }
    ];

    const result = engine.runWalkForwardValidation({
      hypothesisId: 'hyp_wfv_001',
      timelineData,
      inSampleRatio: 0.7
    });

    expect(result.status).toBe('PASSED_WALK_FORWARD');
    expect(result.is_passed).toBe(true);
    expect(result.wfe_ratio).toBeGreaterThan(0.5);
  });
});

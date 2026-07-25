import { describe, test, expect } from 'vitest';
import { AdaptiveScoreEngine } from '../../src/adaptive-sandbox/AdaptiveScoreEngine.js';

describe('Fase 7.0.3 — AdaptiveScoreEngine Verification', () => {
  test('submits proposals with ACS > 95% to ECA Court', () => {
    const scoreEngine = new AdaptiveScoreEngine();

    const highScore = scoreEngine.calculateACS({
      historicalStability: 0.98,
      riskRewardGain: 0.96,
      multiRegimeConsistency: 0.95,
      absenceOfConflicts: 1.0,
      recencyScore: 0.95
    });

    expect(highScore.acs_score).toBeGreaterThanOrEqual(95.0);
    expect(highScore.action_status).toBe('SUBMITTED_TO_ECA');
    expect(highScore.is_eligible_for_eca).toBe(true);
  });

  test('auto-rejects proposals with ACS < 80%', () => {
    const scoreEngine = new AdaptiveScoreEngine();

    const lowScore = scoreEngine.calculateACS({
      historicalStability: 0.50,
      riskRewardGain: 0.60,
      multiRegimeConsistency: 0.40,
      absenceOfConflicts: 0.50,
      recencyScore: 0.50
    });

    expect(lowScore.acs_score).toBeLessThan(80.0);
    expect(lowScore.action_status).toBe('REJECTED_LOW_ACS');
    expect(lowScore.is_rejected).toBe(true);
  });
});

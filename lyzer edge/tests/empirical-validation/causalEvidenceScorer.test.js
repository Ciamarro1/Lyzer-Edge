import { describe, test, expect } from 'vitest';
import { CausalEvidenceScorer } from '../../src/empirical-validation/CausalEvidenceScorer.js';

describe('Fase 9 — CausalEvidenceScorer (CES) Verification', () => {
  test('calculates PROVEN status for high sample size and positive CI', () => {
    const scorer = new CausalEvidenceScorer();

    const result = scorer.calculate({
      empiricalSummary: { sample_size: 500, win_rate: 0.8 },
      statisticalReport: {
        min_required_sample_size: 500,
        confidence_interval_95: { is_positive: true }
      },
      regimesTestedCount: 3,
      timeBlocksTestedCount: 4
    });

    expect(result.ces).toBeGreaterThanOrEqual(90);
    expect(result.verdict).toBe('PROVEN');
    expect(result.is_proven).toBe(true);
  });

  test('calculates SPECULATIVE status for low sample size and low win rate', () => {
    const scorer = new CausalEvidenceScorer();

    const result = scorer.calculate({
      empiricalSummary: { sample_size: 50, win_rate: 0.4 },
      statisticalReport: {
        min_required_sample_size: 500,
        confidence_interval_95: { is_positive: false }
      },
      regimesTestedCount: 1,
      timeBlocksTestedCount: 1
    });

    expect(result.ces).toBeLessThan(70);
    expect(result.verdict).toBe('SPECULATIVE');
    expect(result.is_rejected).toBe(true);
  });
});

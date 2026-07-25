import { describe, test, expect } from 'vitest';
import { ConfidenceDecayEngine } from '../../src/causal-reflection/ConfidenceDecayEngine.js';

describe('Fase 6.6 — ConfidenceDecayEngine Verification', () => {
  test('applies exponential half-life decay to pattern confidence score', () => {
    const engine = new ConfidenceDecayEngine(30); // 30-day half life
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const pattern = {
      pattern_id: 'PAT_OLD',
      confidence_score: 1.0,
      updated_at: now - thirtyDaysMs
    };

    const decayedScore = engine.applyDecay(pattern, now);
    // After 1 half-life, confidence should be ~0.50
    expect(decayedScore).toBeCloseTo(0.50, 1);
  });
});

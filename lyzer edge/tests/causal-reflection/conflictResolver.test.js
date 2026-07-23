import { describe, test, expect } from 'vitest';
import { KnowledgeConflictResolver } from '../../src/causal-reflection/KnowledgeConflictResolver.js';

describe('Fase 6.6 — KnowledgeConflictResolver Verification', () => {
  test('arbitrates conflicting patterns based on composite confidence, sample size, and PnL', () => {
    const resolver = new KnowledgeConflictResolver();

    const patternA = {
      pattern_id: 'PAT_HIGH_SAMPLE',
      confidence_score: 0.90,
      observations_count: 800,
      avg_pnl: 3.5,
      updated_at: Date.now()
    };

    const patternB = {
      pattern_id: 'PAT_LOW_SAMPLE',
      confidence_score: 0.85,
      observations_count: 50,
      avg_pnl: 1.0,
      updated_at: Date.now() - 100000
    };

    const result = resolver.resolveConflict(patternA, patternB);
    expect(result.winner_pattern_id).toBe('PAT_HIGH_SAMPLE');
    expect(result.loser_pattern_id).toBe('PAT_LOW_SAMPLE');
    expect(result.winning_score).toBeGreaterThan(result.losing_score);
  });
});

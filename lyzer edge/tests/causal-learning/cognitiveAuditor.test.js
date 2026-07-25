import { describe, test, expect } from 'vitest';
import { CognitiveAuditor } from '../../src/causal-learning/CognitiveAuditor.js';

describe('Fase 6.5 — CognitiveAuditor Verification', () => {
  test('approves compliant parameter proposals (N >= 500, PnL > +5%, multi-regime stable)', () => {
    const auditor = new CognitiveAuditor();
    const result = auditor.auditProposal({
      proposal_id: 'prop_valid_100',
      evidence_count: 640,
      expected_pnl_improvement_pct: 12.5,
      multi_regime_stable: true,
      constitutional_violation: false,
      temporal_decay_detected: false
    });

    expect(result.approved).toBe(true);
    expect(result.status).toBe('APPROVED');
    expect(result.rejection_reasons).toHaveLength(0);
  });

  test('rejects proposals with insufficient samples or constitutional violations', () => {
    const auditor = new CognitiveAuditor();
    const result = auditor.auditProposal({
      proposal_id: 'prop_invalid_100',
      evidence_count: 42, // Below 500
      expected_pnl_improvement_pct: 2.0, // <= 5%
      multi_regime_stable: false,
      constitutional_violation: true,
      temporal_decay_detected: true
    });

    expect(result.approved).toBe(false);
    expect(result.status).toBe('REJECTED');
    expect(result.rejection_reasons.length).toBe(5);
  });
});

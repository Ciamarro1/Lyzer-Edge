import { describe, test, expect } from 'vitest';
import { EvolutionExecutor } from '../../src/adaptive-evolution/EvolutionExecutor.js';

describe('Fase 7.3.1 — EvolutionExecutor Verification', () => {
  test('creates EvolutionTransaction with correct state lifecycle: PENDING → ACTIVE → COMPLETED', () => {
    const executor = new EvolutionExecutor();

    const tx = executor.createTransaction({
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      previousValue: 0.90,
      proposedValue: 0.85,
      proposalId: 'prop_001',
      acsScore: 96.5,
      arsScore: 22.0,
      courtSignature: 'ECA_APPROVED_001'
    });

    expect(tx.status).toBe('PENDING');
    expect(tx.previous_state.value).toBe(0.90);
    expect(tx.proposed_state.value).toBe(0.85);

    const executed = executor.execute(tx.tx_id);
    expect(executed.status).toBe('ACTIVE');
    expect(executed.executed_at).toBeDefined();

    const completed = executor.complete(tx.tx_id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completed_at).toBeDefined();
  });

  test('marks transaction as ROLLED_BACK', () => {
    const executor = new EvolutionExecutor();

    const tx = executor.createTransaction({
      module: 'CSRL',
      parameter: 'CONSENSUS_LIMIT',
      previousValue: 0.40,
      proposedValue: 0.35,
      proposalId: 'prop_002'
    });

    executor.execute(tx.tx_id);
    const rolledBack = executor.markRolledBack(tx.tx_id, 'DRAWDOWN_EXCEEDED');
    expect(rolledBack.status).toBe('ROLLED_BACK');
    expect(rolledBack.rollback_reason).toBe('DRAWDOWN_EXCEEDED');
  });
});

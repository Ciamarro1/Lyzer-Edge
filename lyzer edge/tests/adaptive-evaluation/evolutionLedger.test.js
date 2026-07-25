import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { EvolutionLedger } from '../../src/adaptive-evaluation/EvolutionLedger.js';

describe('Fase 7.2 — EvolutionLedger Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_evo_ledger_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('records PROMOTION and retrieves evolution history', async () => {
    const db = createDb();
    const ledger = new EvolutionLedger(db);

    const entry = await ledger.record({
      event_type: 'PROMOTION',
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      from_version: 'v1.0.0',
      to_version: 'v1.1.0',
      from_value: 0.90,
      to_value: 0.85,
      acs_score: 96.5,
      ars_score: 22.0,
      reason: 'COUNTERFACTUAL_IMPROVEMENT',
      proposal_id: 'prop_001',
      decided_by: 'ECA_COURT'
    });

    expect(entry.ledger_id).toBeDefined();
    expect(entry.event_type).toBe('PROMOTION');

    const history = await ledger.getEvolutionHistory('TruthKernel', 'LHDS_VETO_LIMIT');
    expect(history.length).toBe(1);
    expect(history[0].from_value).toBe(0.90);
    expect(history[0].to_value).toBe(0.85);

    db.close();
  });

  test('records ROLLBACK with observed result post-hoc', async () => {
    const db = createDb();
    const ledger = new EvolutionLedger(db);

    const entry = await ledger.record({
      event_type: 'ROLLBACK',
      module: 'CSRL',
      parameter: 'CONSENSUS_LIMIT',
      from_version: 'v1.1.0',
      to_version: 'v1.0.0',
      from_value: 0.35,
      to_value: 0.40,
      reason: 'DRAWDOWN_EXCEEDED_7.5%',
      decided_by: 'ADAPTIVE_PIPELINE_CONTROLLER'
    });

    // Record post-hoc observed result
    await ledger.recordObservedResult(entry.ledger_id, {
      drawdown_during_activation: 7.5,
      pnl_during_activation: -3.2,
      active_duration_ticks: 450
    });

    const history = await ledger.getEvolutionHistory('CSRL', 'CONSENSUS_LIMIT');
    expect(history.length).toBe(1);
    expect(history[0].event_type).toBe('ROLLBACK');
    expect(history[0].observed_result.drawdown_during_activation).toBe(7.5);

    db.close();
  });

  test('getFullLedger returns all entries across modules', async () => {
    const db = createDb();
    const ledger = new EvolutionLedger(db);

    await ledger.record({ event_type: 'PROMOTION', module: 'TruthKernel', parameter: 'LHDS', reason: 'test_1' });
    await ledger.record({ event_type: 'REJECTION', module: 'CSRL', parameter: 'CONSENSUS', reason: 'test_2' });

    const full = await ledger.getFullLedger();
    expect(full.length).toBe(2);

    db.close();
  });
});

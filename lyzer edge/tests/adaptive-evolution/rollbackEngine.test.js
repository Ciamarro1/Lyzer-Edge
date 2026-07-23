import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AutomaticRollbackEngine } from '../../src/adaptive-evolution/AutomaticRollbackEngine.js';
import { EvolutionExecutor } from '../../src/adaptive-evolution/EvolutionExecutor.js';
import { EvolutionLedger } from '../../src/adaptive-evaluation/EvolutionLedger.js';

describe('Fase 7.3.4 — AutomaticRollbackEngine Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_rollback_engine_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('executes rollback and quarantines failed proposal', async () => {
    const db = createDb();
    const engine = new AutomaticRollbackEngine(db);
    const executor = new EvolutionExecutor();
    const ledger = new EvolutionLedger(db);

    const tx = executor.createTransaction({
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      previousValue: 0.90,
      proposedValue: 0.85,
      proposalId: 'prop_fail_001'
    });
    executor.execute(tx.tx_id);

    const monitorVerdict = {
      tx_id: tx.tx_id,
      verdict: 'ROLLBACK_REQUIRED',
      warnings: [
        { trigger: 'DRAWDOWN', value: 7.5, threshold: 5.0, severity: 'CRITICAL' }
      ]
    };

    const result = await engine.rollback({
      transaction: tx,
      monitorVerdict,
      evolutionExecutor: executor,
      evolutionLedger: ledger,
      currentTick: 500
    });

    expect(result.restored_value).toBe(0.90);
    expect(result.rolled_back_value).toBe(0.85);
    expect(result.quarantined_proposal).toBe('prop_fail_001');
    expect(result.quarantine_until_tick).toBe(1500);

    // Verify quarantine
    expect(engine.isQuarantined('prop_fail_001', 600)).toBe(true);
    expect(engine.isQuarantined('prop_fail_001', 2000)).toBe(false);

    // Verify executor state
    expect(executor.getTransaction(tx.tx_id).status).toBe('ROLLED_BACK');

    // Verify ledger entry
    const history = await ledger.getEvolutionHistory('TruthKernel', 'LHDS_VETO_LIMIT');
    expect(history.length).toBe(1);
    expect(history[0].event_type).toBe('ROLLBACK');

    db.close();
  });
});

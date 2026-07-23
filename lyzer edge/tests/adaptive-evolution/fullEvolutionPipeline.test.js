import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { AdaptiveEvolutionFacade } from '../../src/adaptive-evolution/index.js';
import { EvolutionLedger } from '../../src/adaptive-evaluation/EvolutionLedger.js';

describe('Fase 7.3 — Full Evolution Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_evo_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('executes complete lifecycle: Transaction → Snapshot → Monitor → COMPLETED', () => {
    const db = createDb();
    const facade = new AdaptiveEvolutionFacade(db);

    // 1. Create pre-promotion snapshot
    facade.createSnapshot('v1.0.0', {
      'TruthKernel.LHDS_VETO_LIMIT': 0.90,
      'CSRL.CONSENSUS_LIMIT': 0.40
    }, 'BASELINE');

    // 2. Create transaction
    const tx = facade.createTransaction({
      module: 'TruthKernel',
      parameter: 'LHDS_VETO_LIMIT',
      previousValue: 0.90,
      proposedValue: 0.85,
      proposalId: 'prop_lifecycle',
      acsScore: 97.0,
      arsScore: 18.0
    });

    // 3. Execute
    facade.executeTransaction(tx.tx_id);
    expect(facade.getActiveTransactions().length).toBe(1);

    // 4. Create post-promotion snapshot
    facade.createSnapshot('v1.1.0', {
      'TruthKernel.LHDS_VETO_LIMIT': 0.85,
      'CSRL.CONSENSUS_LIMIT': 0.40
    }, 'PROMOTION_LHDS_0.85');

    // 5. Verify diff
    const d = facade.diff('v1.0.0', 'v1.1.0');
    expect(d.changes_count).toBe(1);
    expect(d.unchanged_count).toBe(1);

    // 6. Start monitoring and feed healthy trades
    facade.startMonitoring(tx.tx_id, { sharpe: 1.0, win_rate: 0.55, veto_rate: 0.1 });

    let lastVerdict;
    for (let i = 0; i < 250; i++) {
      lastVerdict = facade.recordTrade(tx.tx_id, { pnl: 0.08, is_win: Math.random() > 0.35, was_vetoed: false });
    }

    expect(lastVerdict.observation_complete).toBe(true);

    // 7. Complete transaction
    facade.completeTransaction(tx.tx_id);
    expect(facade.getActiveTransactions().length).toBe(0);

    db.close();
  });

  test('executes full rollback when degradation is detected during monitoring', async () => {
    const db = createDb();
    const facade = new AdaptiveEvolutionFacade(db);
    const ledger = new EvolutionLedger(db);

    // Create and execute transaction
    const tx = facade.createTransaction({
      module: 'CSRL',
      parameter: 'CONSENSUS_LIMIT',
      previousValue: 0.40,
      proposedValue: 0.30,
      proposalId: 'prop_degradation'
    });
    facade.executeTransaction(tx.tx_id);

    // Monitor with degradation
    facade.startMonitoring(tx.tx_id, { sharpe: 1.0, win_rate: 0.55, veto_rate: 0.1 });

    // Good start
    facade.recordTrade(tx.tx_id, { pnl: 2.0, is_win: true, was_vetoed: false });

    // Sudden crash
    const verdict = facade.recordTrade(tx.tx_id, { pnl: -10.0, is_win: false, was_vetoed: false });
    expect(verdict.verdict).toBe('ROLLBACK_REQUIRED');

    // Execute rollback
    const rollbackResult = await facade.rollback({
      transaction: tx,
      monitorVerdict: verdict,
      evolutionLedger: ledger,
      currentTick: 1000
    });

    expect(rollbackResult.restored_value).toBe(0.40);
    expect(rollbackResult.quarantined_proposal).toBe('prop_degradation');

    // Verify quarantine
    expect(facade.isQuarantined('prop_degradation', 1200)).toBe(true);

    // Verify rollback history
    expect(facade.getRollbackHistory().length).toBe(1);

    db.close();
  });
});

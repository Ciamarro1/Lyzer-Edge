/**
 * @fileoverview AutomaticRollbackEngine — Phase 7.3.4 (ADR-023)
 *
 * Autonomous rollback engine that restores the previous parameter state
 * when the AdaptiveRuntimeMonitor emits ROLLBACK_REQUIRED.
 *
 * Responsibilities:
 *   1. Restore previous parameter value via ParameterVersionStore
 *   2. Mark EvolutionTransaction as ROLLED_BACK
 *   3. Record the rollback in EvolutionLedger
 *   4. Quarantine the failed proposal (1,000 tick cooldown)
 */
export class AutomaticRollbackEngine {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.quarantine = new Map(); // proposalId → { until_tick, reason }
    this.quarantineDuration = 1000; // ticks
    this.rollbackHistory = [];
  }

  /**
   * Executes a rollback for a failed evolution transaction.
   *
   * @param {Object} options
   * @param {Object} options.transaction - The EvolutionTransaction to roll back
   * @param {Object} options.monitorVerdict - The AdaptiveRuntimeMonitor verdict
   * @param {Object} options.evolutionExecutor - EvolutionExecutor instance
   * @param {Object} [options.evolutionLedger] - EvolutionLedger instance (optional)
   * @param {number} [options.currentTick] - Current tick count for quarantine
   * @returns {Object} Rollback result
   */
  async rollback({ transaction, monitorVerdict, evolutionExecutor, evolutionLedger, currentTick = 0 }) {
    if (!transaction || !monitorVerdict) {
      throw new Error('transaction and monitorVerdict are required for rollback');
    }

    const rollbackId = `rb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 1. Restore previous version in parameter_versions
    if (transaction.previous_state) {
      try {
        await this.db.rollbackParameterVersion(
          monitorVerdict.tx_id || transaction.tx_id,
          `AUTO_ROLLBACK: ${monitorVerdict.warnings.map(w => w.trigger).join(', ')}`
        );
      } catch {
        // Version may not exist in DB if only in-memory; continue
      }
    }

    // 2. Mark transaction as ROLLED_BACK
    if (evolutionExecutor) {
      try {
        evolutionExecutor.markRolledBack(transaction.tx_id, monitorVerdict.warnings.map(w => w.trigger).join(', '));
      } catch {
        // Transaction may not be in executor state; continue
      }
    }

    // 3. Record in Evolution Ledger
    if (evolutionLedger) {
      try {
        await evolutionLedger.record({
          event_type: 'ROLLBACK',
          module: transaction.module,
          parameter: transaction.parameter,
          from_version: null,
          to_version: null,
          from_value: transaction.proposed_state?.value,
          to_value: transaction.previous_state?.value,
          reason: `AUTO_ROLLBACK: ${monitorVerdict.warnings.map(w => `${w.trigger}=${w.value}`).join(', ')}`,
          proposal_id: transaction.proposal_id,
          decided_by: 'AUTOMATIC_ROLLBACK_ENGINE'
        });
      } catch {
        // Ledger write failure is non-fatal; log and continue
      }
    }

    // 4. Quarantine the failed proposal
    if (transaction.proposal_id) {
      this.quarantine.set(transaction.proposal_id, {
        until_tick: currentTick + this.quarantineDuration,
        reason: monitorVerdict.warnings.map(w => w.trigger).join(', '),
        quarantined_at: Date.now()
      });
    }

    const result = {
      rollback_id: rollbackId,
      tx_id: transaction.tx_id,
      module: transaction.module,
      parameter: transaction.parameter,
      restored_value: transaction.previous_state?.value,
      rolled_back_value: transaction.proposed_state?.value,
      triggers: monitorVerdict.warnings,
      quarantined_proposal: transaction.proposal_id || null,
      quarantine_until_tick: transaction.proposal_id ? currentTick + this.quarantineDuration : null,
      rolled_back_at: Date.now()
    };

    this.rollbackHistory.push(result);
    return result;
  }

  /**
   * Checks if a proposal is currently in quarantine.
   */
  isQuarantined(proposalId, currentTick = 0) {
    const q = this.quarantine.get(proposalId);
    if (!q) return false;
    return currentTick < q.until_tick;
  }

  getRollbackHistory() {
    return [...this.rollbackHistory];
  }
}

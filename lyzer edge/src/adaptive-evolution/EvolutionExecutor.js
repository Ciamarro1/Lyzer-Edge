/**
 * @fileoverview EvolutionExecutor — Phase 7.3.1 (ADR-021)
 *
 * Creates atomic, reversible EvolutionTransaction objects.
 * Never mutates parameters directly — encapsulates every change
 * in a traceable transaction with snapshot of previous state.
 *
 * Transaction States: PENDING → EXECUTING → ACTIVE → COMPLETED | ROLLED_BACK
 */
export class EvolutionExecutor {
  constructor() {
    this.transactions = new Map();
  }

  /**
   * Creates a new EvolutionTransaction.
   *
   * @param {Object} options
   * @param {string} options.module - Target module
   * @param {string} options.parameter - Target parameter
   * @param {*}      options.previousValue - Current production value
   * @param {*}      options.proposedValue - Proposed new value
   * @param {string} options.proposalId - Originating proposal ID
   * @param {number} [options.acsScore] - ACS at approval time
   * @param {number} [options.arsScore] - ARS at approval time
   * @param {string} [options.courtSignature] - ECA Court decision ID
   * @returns {Object} EvolutionTransaction
   */
  createTransaction({ module, parameter, previousValue, proposedValue, proposalId, acsScore, arsScore, courtSignature }) {
    if (!module || !parameter || previousValue === undefined || proposedValue === undefined) {
      throw new Error('module, parameter, previousValue, and proposedValue are required');
    }

    const txId = `evtx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const transaction = {
      tx_id: txId,
      module,
      parameter,
      previous_state: { value: previousValue },
      proposed_state: { value: proposedValue },
      proposal_id: proposalId || null,
      acs_score: acsScore || null,
      ars_score: arsScore || null,
      court_signature: courtSignature || 'ECA_COURT_APPROVED',
      status: 'PENDING',
      created_at: Date.now(),
      executed_at: null,
      completed_at: null,
      rolled_back_at: null
    };

    this.transactions.set(txId, transaction);
    return transaction;
  }

  /**
   * Transitions a transaction to EXECUTING → ACTIVE.
   */
  execute(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);
    if (tx.status !== 'PENDING') throw new Error(`Transaction ${txId} is ${tx.status}, expected PENDING`);

    tx.status = 'ACTIVE';
    tx.executed_at = Date.now();
    return tx;
  }

  /**
   * Marks a transaction as COMPLETED after successful observation period.
   */
  complete(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);
    if (tx.status !== 'ACTIVE') throw new Error(`Transaction ${txId} is ${tx.status}, expected ACTIVE`);

    tx.status = 'COMPLETED';
    tx.completed_at = Date.now();
    return tx;
  }

  /**
   * Marks a transaction as ROLLED_BACK.
   */
  markRolledBack(txId, reason) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);

    tx.status = 'ROLLED_BACK';
    tx.rolled_back_at = Date.now();
    tx.rollback_reason = reason || 'DEGRADATION_DETECTED';
    return tx;
  }

  getTransaction(txId) {
    return this.transactions.get(txId) || null;
  }

  getActiveTransactions() {
    return [...this.transactions.values()].filter(tx => tx.status === 'ACTIVE');
  }
}

/**
 * @fileoverview EvolutionLedger — Phase 7.2 (ADR-019)
 *
 * The "genetic history" of the Lyzer Edge system.
 * Records every adaptation decision (promotion, rollback, rejection, observation)
 * as an immutable, append-only ledger entry.
 *
 * Enables the system to answer:
 *   "What was the evolutionary path that brought me to this state?"
 */
export class EvolutionLedger {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
  }

  /**
   * Records a new evolution event in the ledger.
   *
   * @param {Object} entry
   * @param {string} entry.event_type - PROMOTION | ROLLBACK | REJECTION | OBSERVATION
   * @param {string} entry.module - Target module (e.g., 'TruthKernel', 'CSRL')
   * @param {string} entry.parameter - Target parameter (e.g., 'LHDS_VETO_LIMIT')
   * @param {string} [entry.from_version] - Previous version tag
   * @param {string} [entry.to_version] - New version tag
   * @param {*}      [entry.from_value] - Previous parameter value
   * @param {*}      [entry.to_value] - New parameter value
   * @param {number} [entry.acs_score] - Adaptive Confidence Score at decision time
   * @param {number} [entry.ars_score] - Adaptive Risk Score at decision time
   * @param {Object} [entry.regime_stability] - RegimeStressEvaluator result
   * @param {Object} [entry.impact_analysis] - AdaptationImpactAnalyzer result
   * @param {string} entry.reason - Human/machine-readable reason for the decision
   * @param {string} [entry.proposal_id] - Originating proposal ID
   * @param {string} [entry.decided_by] - Decision authority (e.g., 'ECA_COURT', 'SANDBOX_ONLY')
   * @returns {Object} The created ledger entry
   */
  async record(entry) {
    if (!entry.event_type || !entry.module || !entry.parameter || !entry.reason) {
      throw new Error('event_type, module, parameter, and reason are required for Evolution Ledger entry');
    }

    const ledgerId = `evo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const record = {
      ledger_id: ledgerId,
      event_type: entry.event_type,
      module: entry.module,
      parameter: entry.parameter,
      from_version: entry.from_version || null,
      to_version: entry.to_version || null,
      from_value: entry.from_value !== undefined ? entry.from_value : null,
      to_value: entry.to_value !== undefined ? entry.to_value : null,
      acs_score: entry.acs_score || null,
      ars_score: entry.ars_score || null,
      regime_stability: entry.regime_stability || null,
      impact_analysis: entry.impact_analysis || null,
      reason: entry.reason,
      proposal_id: entry.proposal_id || null,
      decided_by: entry.decided_by || 'ECA_COURT',
      observed_result: null,
      created_at: Date.now()
    };

    await this.db.insertEvolutionLedgerEntry(record);
    return record;
  }

  /**
   * Records the observed result after a promotion has been active.
   *
   * @param {string} ledgerId - The ledger entry to update
   * @param {Object} observedResult - Post-promotion metrics
   */
  async recordObservedResult(ledgerId, observedResult) {
    await this.db.updateEvolutionLedgerResult(ledgerId, observedResult);
  }

  /**
   * Retrieves the full evolution history for a module/parameter pair.
   */
  async getEvolutionHistory(module, parameter) {
    return await this.db.getEvolutionLedgerEntries(module, parameter);
  }

  /**
   * Retrieves the complete evolution ledger.
   */
  async getFullLedger() {
    return await this.db.getAllEvolutionLedgerEntries();
  }
}

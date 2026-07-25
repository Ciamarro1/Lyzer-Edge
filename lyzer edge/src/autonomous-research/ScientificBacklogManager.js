import { ExpectedValueInfoEngine } from './ExpectedValueInfoEngine.js';

/**
 * @fileoverview ScientificBacklogManager — Phase 15 (ADR-032)
 *
 * Manages the scientific experiment backlog, prioritizing proposals by EVI score
 * and enforcing compute resource budgets (CPU time units & thread limits).
 */
export class ScientificBacklogManager {
  constructor(config = {}) {
    this.eviEngine = new ExpectedValueInfoEngine();
    this.maxComputeBudgetUnits = config.maxComputeBudgetUnits || 100.0;
    this.backlog = [];
  }

  /**
   * Adds an experiment proposal to the backlog and re-ranks by EVI.
   *
   * @param {Object} proposal - Experiment proposal object
   * @returns {Object} Added backlog item with EVI evaluation
   */
  addProposal(proposal = {}) {
    const eviResult = this.eviEngine.evaluateEVI(proposal);

    const backlogItem = {
      ...proposal,
      id: proposal.id || `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      evi_eval: eviResult,
      status: 'QUEUED',
      added_at: Date.now()
    };

    this.backlog.push(backlogItem);
    this._sortBacklog();

    return backlogItem;
  }

  _sortBacklog() {
    // Sort descending by EVI score
    this.backlog.sort((a, b) => b.evi_eval.evi_score - a.evi_eval.evi_score);
  }

  /**
   * Selects the top EVI proposals within the compute budget.
   *
   * @param {number} [budgetUnits] - Max compute budget units to allocate
   * @returns {Array<Object>} Selected experiment proposals
   */
  allocateNextBatch(budgetUnits = this.maxComputeBudgetUnits) {
    let currentCost = 0;
    const selectedBatch = [];

    for (const item of this.backlog) {
      if (item.status !== 'QUEUED') continue;

      const itemCost = item.evi_eval.metrics.compute_cost_units;
      if (currentCost + itemCost <= budgetUnits && item.evi_eval.is_worth_executing) {
        item.status = 'IN_RESEARCH_EXECUTION';
        selectedBatch.push(item);
        currentCost += itemCost;
      }
    }

    return selectedBatch;
  }

  getBacklogStatus() {
    return {
      total_queued: this.backlog.filter(i => i.status === 'QUEUED').length,
      total_in_execution: this.backlog.filter(i => i.status === 'IN_RESEARCH_EXECUTION').length,
      backlog: [...this.backlog]
    };
  }
}

/**
 * Lyzer Edge — FinOpsCostManagementEngine
 * FinOps & Systemic Cost Management Engine.
 * Measures financial impact and compute cost breakdown per Agent, Workflow, Experiment, Decision, and User.
 */

export class FinOpsCostManagementEngine {
  constructor(monthlyBudgetUsd = 1000) {
    this._disposed = false;
    this._monthlyBudgetUsd = monthlyBudgetUsd;
    this._costEntries = [];
  }

  /**
   * Records a cost transaction entry.
   * @param {string} entityId - Agent, Workflow or Decision ID
   * @param {string} category - 'AI_MODEL' | 'COMPUTE' | 'STORAGE' | 'NETWORK'
   * @param {number} costUsd
   */
  recordCost(entityId, category, costUsd) {
    this._assertNotDisposed();

    const record = Object.freeze({
      entityId,
      category,
      costUsd: Math.round(costUsd * 10000) / 10000,
      timestamp: Date.now()
    });

    this._costEntries.push(record);
    return record;
  }

  /**
   * Computes FinOps budget summary and consumption percentage.
   */
  getFinOpsSummary() {
    this._assertNotDisposed();

    const totalSpentUsd = this._costEntries.reduce((acc, c) => acc + c.costUsd, 0);
    const roundedSpent = Math.round(totalSpentUsd * 100) / 100;
    const remainingBudgetUsd = Math.max(0, Math.round((this._monthlyBudgetUsd - roundedSpent) * 100) / 100);

    return Object.freeze({
      monthlyBudgetUsd: this._monthlyBudgetUsd,
      totalSpentUsd: roundedSpent,
      remainingBudgetUsd,
      budgetConsumedPct: Math.round((roundedSpent / this._monthlyBudgetUsd) * 100),
      entryCount: this._costEntries.length,
      evaluatedAt: new Date().toISOString()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_FINOPS_COST_MANAGEMENT_DISPOSED: FinOps Cost Management Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._costEntries = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

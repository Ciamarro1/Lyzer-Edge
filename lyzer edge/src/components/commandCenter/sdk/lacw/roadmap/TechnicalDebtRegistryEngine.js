/**
 * Lyzer Edge — TechnicalDebtRegistryEngine
 * Technical Debt Registry & Refactoring Roadmap Engine.
 * Tracks debt items, anti-fragility inflation alerts, and refactoring priorities.
 */

let _debtIdCounter = 0;

export class TechnicalDebtRegistryEngine {
  constructor() {
    this._disposed = false;
    this._debtItems = new Map();
  }

  /**
   * Registers a technical debt item.
   * @param {string} title
   * @param {string} impactSeverity - 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
   * @param {Record<string, unknown>} [details]
   */
  registerDebtItem(title, impactSeverity = 'LOW', details = {}) {
    this._assertNotDisposed();

    const debtId = `debt_${Date.now()}_${++_debtIdCounter}`;

    const record = Object.freeze({
      debtId,
      title,
      impactSeverity,
      component: details.component || 'General',
      status: 'OPEN',
      plannedRefactorPhase: details.plannedRefactorPhase || 'PHASE_10',
      registeredAt: new Date().toISOString()
    });

    this._debtItems.set(debtId, record);
    return record;
  }

  /**
   * Resolves a debt item after refactoring.
   * @param {string} debtId
   */
  resolveDebtItem(debtId) {
    this._assertNotDisposed();

    const item = this._debtItems.get(debtId);
    if (!item) throw new Error(`ERR_DEBT_ITEM_NOT_FOUND: Debt item '${debtId}' not found.`);

    const resolved = Object.freeze({ ...item, status: 'RESOLVED', resolvedAt: new Date().toISOString() });
    this._debtItems.set(debtId, resolved);
    return resolved;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_TECHNICAL_DEBT_REGISTRY_DISPOSED: Technical Debt Registry Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._debtItems.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

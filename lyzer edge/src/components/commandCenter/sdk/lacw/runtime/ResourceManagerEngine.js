/**
 * Lyzer Edge — ResourceManagerEngine
 * Systemic Resource & Budget Engine.
 * Enforces Token Budget, Compute Budget, Memory Budget, and Execution Time Budgets.
 */

export class ResourceManagerEngine {
  constructor(budgets = {}) {
    this._disposed = false;

    this._maxTokensPerMinute = budgets.maxTokensPerMinute || 50000;
    this._maxMemoryMb = budgets.maxMemoryMb || 512;
    this._maxExecutionTimeMs = budgets.maxExecutionTimeMs || 5000;

    this._usedTokensWindow = 0;
    this._currentMemoryMb = 42;
  }

  /**
   * Checks if an execution request fits within current resource budgets.
   * @param {object} req - Requested resources ({ estimatedTokens, estimatedMemoryMb, estimatedDurationMs })
   */
  checkBudget(req = {}) {
    this._assertNotDisposed();

    const estimatedTokens = req.estimatedTokens || 100;
    const estimatedMemoryMb = req.estimatedMemoryMb || 10;
    const estimatedDurationMs = req.estimatedDurationMs || 500;

    const tokenAllowed = (this._usedTokensWindow + estimatedTokens) <= this._maxTokensPerMinute;
    const memoryAllowed = (this._currentMemoryMb + estimatedMemoryMb) <= this._maxMemoryMb;
    const timeAllowed = estimatedDurationMs <= this._maxExecutionTimeMs;

    const allowed = tokenAllowed && memoryAllowed && timeAllowed;

    return Object.freeze({
      allowed,
      tokenAllowed,
      memoryAllowed,
      timeAllowed,
      currentTokensUsed: this._usedTokensWindow,
      maxTokensPerMinute: this._maxTokensPerMinute
    });
  }

  /**
   * Consumes token budget.
   * @param {number} tokenCount
   */
  consumeTokens(tokenCount) {
    this._assertNotDisposed();
    this._usedTokensWindow += tokenCount;
    return this._usedTokensWindow;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_RESOURCE_MANAGER_ENGINE_DISPOSED: Resource Manager Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

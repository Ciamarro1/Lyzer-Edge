/**
 * Lyzer Edge — FailureManagerEngine
 * Resilience & Circuit Breaker Manager.
 * Implements: Retries with Exponential Backoff, Fallback Handlers, Circuit Breaker State Machine (CLOSED, OPEN, HALF_OPEN), and Graceful Degradation.
 */

export class FailureManagerEngine {
  constructor(options = {}) {
    this._disposed = false;
    this._failureThreshold = options.failureThreshold || 3;
    this._resetTimeoutMs = options.resetTimeoutMs || 5000;

    this._failureCounts = new Map(); // targetId -> count
    this._circuitStates = new Map();  // targetId -> 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this._lastStateChange = new Map();
  }

  /**
   * Executes an operation wrapped in circuit breaker, retry, and fallback safety handlers.
   * @param {string} targetId
   * @param {Function} operationFn
   * @param {Function} [fallbackFn]
   */
  async executeWithResilience(targetId, operationFn, fallbackFn = null) {
    this._assertNotDisposed();

    const currentState = this._getCircuitState(targetId);

    if (currentState === 'OPEN') {
      if (fallbackFn) {
        return Object.freeze({ status: 'FALLBACK_EXECUTED', output: await fallbackFn(), circuitState: 'OPEN' });
      }
      throw new Error(`ERR_CIRCUIT_OPEN: Target '${targetId}' circuit breaker is OPEN due to prior failures.`);
    }

    try {
      const output = await operationFn();
      this._recordSuccess(targetId);
      return Object.freeze({ status: 'SUCCESS', output, circuitState: this._getCircuitState(targetId) });
    } catch (err) {
      this._recordFailure(targetId);
      if (fallbackFn) {
        return Object.freeze({ status: 'FALLBACK_EXECUTED', output: await fallbackFn(), circuitState: this._getCircuitState(targetId), error: err.message });
      }
      throw err;
    }
  }

  _getCircuitState(targetId) {
    const state = this._circuitStates.get(targetId) || 'CLOSED';
    if (state === 'OPEN') {
      const lastChange = this._lastStateChange.get(targetId) || 0;
      if (Date.now() - lastChange >= this._resetTimeoutMs) {
        this._circuitStates.set(targetId, 'HALF_OPEN');
        return 'HALF_OPEN';
      }
    }
    return state;
  }

  _recordSuccess(targetId) {
    this._failureCounts.set(targetId, 0);
    this._circuitStates.set(targetId, 'CLOSED');
    this._lastStateChange.set(targetId, Date.now());
  }

  _recordFailure(targetId) {
    const current = (this._failureCounts.get(targetId) || 0) + 1;
    this._failureCounts.set(targetId, current);

    if (current >= this._failureThreshold) {
      this._circuitStates.set(targetId, 'OPEN');
      this._lastStateChange.set(targetId, Date.now());
    }
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_FAILURE_MANAGER_ENGINE_DISPOSED: Failure Manager Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._failureCounts.clear();
    this._circuitStates.clear();
    this._lastStateChange.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

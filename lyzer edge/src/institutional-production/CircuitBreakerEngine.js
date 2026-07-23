/**
 * @fileoverview CircuitBreakerEngine — Phase 14 (ADR-031)
 *
 * Circuit Breaker pattern implementation for isolating failing external exchange APIs.
 * States:
 *   - CLOSED (Normal Operation)
 *   - OPEN (Failing / Tripped - Calls fail fast without hitting API)
 *   - HALF_OPEN (Testing recovery)
 */
export class CircuitBreakerEngine {
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 3;
    this.resetTimeoutMs = config.resetTimeoutMs || 5000;
    this.breakers = new Map(); // target -> { state, failures, lastFailureTime }
  }

  /**
   * Executes a protected call through the circuit breaker.
   *
   * @param {string} target - Name of target API / exchange (e.g., 'BINANCE')
   * @param {Function} actionFn - Async function to execute
   * @param {Function} [fallbackFn] - Fallback function if circuit is OPEN
   * @returns {*} Action result or fallback result
   */
  async execute(target, actionFn, fallbackFn) {
    let breaker = this.breakers.get(target);
    if (!breaker) {
      breaker = { state: 'CLOSED', failures: 0, lastFailureTime: null };
      this.breakers.set(target, breaker);
    }

    const now = Date.now();

    // Check if OPEN circuit should transition to HALF_OPEN
    if (breaker.state === 'OPEN') {
      if (now - breaker.lastFailureTime > this.resetTimeoutMs) {
        breaker.state = 'HALF_OPEN';
      } else {
        if (fallbackFn) return await fallbackFn({ reason: 'CIRCUIT_OPEN', target });
        throw new Error(`CircuitBreaker for '${target}' is OPEN`);
      }
    }

    try {
      const result = await actionFn();
      // Success resets failure count and closes circuit
      breaker.failures = 0;
      breaker.state = 'CLOSED';
      return result;
    } catch (err) {
      breaker.failures++;
      breaker.lastFailureTime = now;

      if (breaker.failures >= this.failureThreshold) {
        breaker.state = 'OPEN';
      }

      if (fallbackFn) {
        return await fallbackFn({ reason: 'CALL_FAILED', error: err.message, target });
      }

      throw err;
    }
  }

  getBreakerState(target) {
    return this.breakers.get(target) || { state: 'CLOSED', failures: 0 };
  }
}

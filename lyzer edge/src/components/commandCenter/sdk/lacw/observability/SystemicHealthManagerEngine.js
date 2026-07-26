/**
 * Lyzer Edge — SystemicHealthManagerEngine
 * Systemic Health Consciousness & Health State Engine.
 * Evaluates system health across 6 Health States:
 *   HEALTHY, WARNING, DEGRADED, CRITICAL, RECOVERING, UNKNOWN
 */

export const SYSTEM_HEALTH_STATES = Object.freeze([
  'HEALTHY',
  'WARNING',
  'DEGRADED',
  'CRITICAL',
  'RECOVERING',
  'UNKNOWN'
]);

export class SystemicHealthManagerEngine {
  constructor() {
    this._disposed = false;
    this._componentHealth = new Map();
  }

  /**
   * Updates component health signal.
   * @param {string} componentId - e.g. 'TruthKernel', 'OpenMobius'
   * @param {string} status - One of SYSTEM_HEALTH_STATES
   * @param {Record<string, unknown>} [details]
   */
  updateComponentHealth(componentId, status, details = {}) {
    this._assertNotDisposed();

    if (!SYSTEM_HEALTH_STATES.includes(status)) {
      throw new Error(`ERR_INVALID_HEALTH_STATE: ${status}. Valid: ${SYSTEM_HEALTH_STATES.join(', ')}`);
    }

    const record = Object.freeze({
      componentId,
      status,
      pingMs: details.pingMs || 8.4,
      updatedAt: Date.now()
    });

    this._componentHealth.set(componentId, record);
    return record;
  }

  /**
   * Computes overall systemic health score and state.
   */
  evaluateOverallHealth() {
    this._assertNotDisposed();

    const components = Array.from(this._componentHealth.values());
    if (components.length === 0) {
      return Object.freeze({ overallState: 'HEALTHY', healthScore: 100, degradedComponents: [] });
    }

    const degraded = components.filter(c => c.status === 'DEGRADED' || c.status === 'CRITICAL');
    const overallState = degraded.length > 0 ? 'DEGRADED' : 'HEALTHY';
    const healthScore = Math.max(0, 100 - (degraded.length * 25));

    return Object.freeze({
      overallState,
      healthScore,
      degradedComponents: Object.freeze(degraded.map(d => d.componentId)),
      evaluatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_SYSTEMIC_HEALTH_MANAGER_DISPOSED: Systemic Health Manager Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._componentHealth.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

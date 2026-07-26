/**
 * Lyzer Edge — ContextEngine
 * Global Systemic Context Engine.
 * Answers continuously:
 *   - Who is the user & role?
 *   - What is the current mission?
 *   - Which workspace preset is active?
 *   - Which agents are running?
 *   - What is the systemic priority?
 *   - Is there an active incident, experiment, opportunity, or risk?
 */

export class ContextEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;

    this._contextState = {
      user: { id: 'usr_director', role: 'PRINCIPAL_ARCHITECT' },
      currentMission: 'Continuous Empirical Telemetry & Cognitive Expansion',
      activeWorkspacePreset: 'RESEARCH',
      activeAgents: ['orchestrator', 'openmobius_coproc', 'discovery_lab'],
      priority: 'HIGH_PRECISION',
      hasActiveIncident: false,
      hasActiveExperiment: true,
      hasOpportunity: true,
      hasRiskAlert: false,
      riskLevel: 'LOW_NOMINAL',
      updatedAt: Date.now()
    };
  }

  /**
   * Returns current immutable global context snapshot.
   */
  getContextSnapshot() {
    this._assertNotDisposed();
    return Object.freeze(JSON.parse(JSON.stringify(this._contextState)));
  }

  /**
   * Updates a context property and publishes an event.
   * @param {string} key
   * @param {unknown} value
   */
  updateContext(key, value) {
    this._assertNotDisposed();

    const previousValue = this._contextState[key];
    this._contextState[key] = value;
    this._contextState.updatedAt = Date.now();

    if (this._eventBus) {
      this._eventBus.publish('context:updated', { key, previousValue, newValue: value });
    }

    return this.getContextSnapshot();
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_CONTEXT_ENGINE_DISPOSED: Context Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

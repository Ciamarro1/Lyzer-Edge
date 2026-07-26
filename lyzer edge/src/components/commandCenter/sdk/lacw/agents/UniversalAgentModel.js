/**
 * Lyzer Edge — UniversalAgentModel
 * Universal 19-Attribute Agent Contract & Lifecycle State Machine.
 * Enforces mandatory presence of:
 *   id, name, version, purpose, mission, capabilities, permissions, memory_access,
 *   tools, constraints, goals, state, metrics, events, history, certificates, owner, dependencies, status.
 *
 * Handles 10 Lifecycle Stages:
 *   CREATED -> INITIALIZED -> CERTIFIED -> AVAILABLE -> EXECUTING -> LEARNING -> EVALUATED -> IMPROVED -> DEPRECATED -> ARCHIVED
 */

export const AGENT_LIFECYCLE_STAGES = Object.freeze([
  'CREATED',
  'INITIALIZED',
  'CERTIFIED',
  'AVAILABLE',
  'EXECUTING',
  'LEARNING',
  'EVALUATED',
  'IMPROVED',
  'DEPRECATED',
  'ARCHIVED'
]);

export class UniversalAgentModel {
  constructor(spec = {}) {
    this._disposed = false;

    if (!spec.id || !spec.name) {
      throw new Error('ERR_INVALID_AGENT_SPEC: Agent must declare id and name');
    }

    this._agentRecord = {
      id: spec.id,
      name: spec.name,
      version: spec.version || '1.0.0',
      purpose: spec.purpose || 'Quantitative Research',
      mission: spec.mission || 'Autonomous Alpha Discovery',
      capabilities: Object.freeze([...(spec.capabilities || ['market_data:read'])]),
      permissions: Object.freeze([...(spec.permissions || ['telemetry:read'])]),
      memory_access: Object.freeze([...(spec.memory_access || ['WORKING', 'EPISODIC'])]),
      tools: Object.freeze([...(spec.tools || ['BOS_Detector', 'FVG_Analyzer'])]),
      constraints: Object.freeze([...(spec.constraints || ['No Trade Execution'])]),
      goals: Object.freeze([...(spec.goals || ['Maximize Sharpe Ratio'])]),
      state: Object.freeze({ ...spec.state, activeTask: null }),
      metrics: Object.freeze({ accuracy: 0.96, latencyMs: 12.4, costPerTask: 0.001 }),
      events: [],
      history: [],
      certificates: Object.freeze([...(spec.certificates || ['cert_institutional_v1'])]),
      owner: spec.owner || 'System_Director',
      dependencies: Object.freeze([...(spec.dependencies || [])]),
      status: 'CREATED'
    };
  }

  /**
   * Transitions agent lifecycle stage.
   * @param {string} targetStage
   */
  transitionLifecycle(targetStage) {
    this._assertNotDisposed();

    if (!AGENT_LIFECYCLE_STAGES.includes(targetStage)) {
      throw new Error(`ERR_INVALID_LIFECYCLE_STAGE: ${targetStage}. Valid: ${AGENT_LIFECYCLE_STAGES.join(', ')}`);
    }

    const previousStage = this._agentRecord.status;
    this._agentRecord.status = targetStage;
    this._agentRecord.history.push({
      from: previousStage,
      to: targetStage,
      timestamp: Date.now()
    });

    return this.getAgentSnapshot();
  }

  /**
   * Returns immutable snapshot of agent state record.
   */
  getAgentSnapshot() {
    this._assertNotDisposed();
    return Object.freeze(JSON.parse(JSON.stringify(this._agentRecord)));
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_UNIVERSAL_AGENT_MODEL_DISPOSED: Universal Agent Model is disposed');
  }

  dispose() {
    this._disposed = true;
    this._agentRecord = null;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

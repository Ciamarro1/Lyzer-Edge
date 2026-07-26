/**
 * Lyzer Edge — UniversalExecutionEngine
 * Universal Systemic Execution Engine.
 * Executes Agents, Workflows, Capabilities, Plugins, Commands, and Experiments with full execution trace auditing.
 */

let _execIdCounter = 0;

export class UniversalExecutionEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._executions = new Map();
  }

  /**
   * Executes a target unit (Agent, Workflow, Capability, Plugin, Command).
   * @param {string} targetType - e.g. 'WORKFLOW', 'CAPABILITY', 'COMMAND'
   * @param {string} targetId
   * @param {Function} executionFn
   * @param {Record<string, unknown>} [context]
   */
  async execute(targetType, targetId, executionFn, context = {}) {
    this._assertNotDisposed();

    const executionId = `exec_${targetType.toLowerCase()}_${Date.now()}_${++_execIdCounter}`;
    const startTime = performance.now();

    const record = {
      executionId,
      targetType,
      targetId,
      status: 'RUNNING',
      context: { ...context },
      startedAt: new Date().toISOString()
    };

    this._executions.set(executionId, record);

    let output = null;
    let error = null;

    try {
      if (typeof executionFn === 'function') {
        output = await executionFn(context);
      }
      record.status = 'COMPLETED';
    } catch (err) {
      record.status = 'FAILED';
      error = err.message;
    }

    record.durationMs = Math.round((performance.now() - startTime) * 1000) / 1000;
    record.output = output;
    record.error = error;

    const finalRecord = Object.freeze({ ...record });

    if (this._eventBus) {
      this._eventBus.publish('execution:finished', {
        executionId,
        targetType,
        targetId,
        status: record.status,
        durationMs: record.durationMs
      });
    }

    return finalRecord;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_UNIVERSAL_EXECUTION_ENGINE_DISPOSED: Universal Execution Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._executions.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

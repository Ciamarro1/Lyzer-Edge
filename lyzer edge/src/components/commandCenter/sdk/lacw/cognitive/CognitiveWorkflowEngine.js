/**
 * Lyzer Edge — CognitiveWorkflowEngine
 * Declarative, Observable, Interruptible & Parallelizable Workflow Engine.
 */

let _wfIdCounter = 0;

export class CognitiveWorkflowEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._workflows = new Map();
  }

  /**
   * Defines a declarative workflow.
   * @param {string} workflowName
   * @param {Array<{ stepId: string, action: string, handler: Function }>} steps
   */
  defineWorkflow(workflowName, steps = []) {
    this._assertNotDisposed();

    const workflowId = `wf_${workflowName.toLowerCase()}_${Date.now()}_${++_wfIdCounter}`;

    const record = Object.freeze({
      workflowId,
      workflowName,
      steps: Object.freeze(steps.map(s => Object.freeze({ ...s }))),
      status: 'IDLE',
      currentStepIndex: 0,
      createdAt: new Date().toISOString()
    });

    this._workflows.set(workflowId, { ...record });

    if (this._eventBus) {
      this._eventBus.publish('workflow:defined', { workflowId, workflowName });
    }

    return record;
  }

  /**
   * Executes a workflow.
   * @param {string} workflowId
   * @param {Record<string, unknown>} [initialContext]
   */
  async executeWorkflow(workflowId, initialContext = {}) {
    this._assertNotDisposed();

    const wf = this._workflows.get(workflowId);
    if (!wf) throw new Error(`ERR_WORKFLOW_NOT_FOUND: ${workflowId}`);

    wf.status = 'RUNNING';
    let context = { ...initialContext };

    for (let i = 0; i < wf.steps.length; i++) {
      if (wf.status === 'PAUSED' || wf.status === 'CANCELLED') break;

      wf.currentStepIndex = i;
      const step = wf.steps[i];

      if (typeof step.handler === 'function') {
        const stepOutput = await step.handler(context);
        context[step.stepId] = stepOutput;
      }
    }

    if (wf.status === 'RUNNING') {
      wf.status = 'COMPLETED';
    }

    if (this._eventBus) {
      this._eventBus.publish('workflow:completed', { workflowId, status: wf.status });
    }

    return Object.freeze({
      workflowId,
      status: wf.status,
      finalContext: Object.freeze(context)
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_WORKFLOW_ENGINE_DISPOSED: Workflow Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._workflows.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

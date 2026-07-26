/**
 * Lyzer Edge — CognitiveTraceEngine
 * End-to-End Cognitive Distributed Trace Engine.
 * Captures the 11-Step Cognitive Path:
 *   User Intent -> Command -> Capability -> Agent -> Tool -> Memory -> Reasoning -> Decision -> Action -> Result -> Learning
 */

let _traceSeqCounter = 0;

export class CognitiveTraceEngine {
  constructor() {
    this._disposed = false;
    this._traces = new Map();
  }

  /**
   * Starts a new cognitive distributed trace context.
   * @param {string} rootAction - e.g. 'Discover_Alpha_Patterns'
   * @param {string} actor - e.g. 'Principal_Architect'
   */
  startTrace(rootAction, actor = 'System_Director') {
    this._assertNotDisposed();

    const traceId = `trace_${Date.now()}_${++_traceSeqCounter}`;

    const trace = {
      traceId,
      rootAction,
      actors: [actor],
      steps: [],
      startedAt: Date.now(),
      status: 'IN_PROGRESS'
    };

    this._traces.set(traceId, trace);
    return traceId;
  }

  /**
   * Appends a step to an active trace context.
   * @param {string} traceId
   * @param {string} stepName - e.g. 'Agent_Execution', 'Reasoning'
   * @param {Record<string, unknown>} [details]
   */
  appendStep(traceId, stepName, details = {}) {
    this._assertNotDisposed();

    const trace = this._traces.get(traceId);
    if (!trace) throw new Error(`ERR_TRACE_NOT_FOUND: Trace context '${traceId}' not found.`);

    const step = Object.freeze({
      stepName,
      details: Object.freeze({ ...details }),
      timestamp: Date.now()
    });

    trace.steps.push(step);
    return step;
  }

  /**
   * Completes and exports the full trace snapshot.
   * @param {string} traceId
   */
  completeTrace(traceId) {
    this._assertNotDisposed();

    const trace = this._traces.get(traceId);
    if (!trace) throw new Error(`ERR_TRACE_NOT_FOUND: Trace context '${traceId}' not found.`);

    trace.status = 'COMPLETED';
    trace.completedAt = Date.now();
    trace.durationMs = trace.completedAt - trace.startedAt;

    return Object.freeze(JSON.parse(JSON.stringify(trace)));
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_TRACE_ENGINE_DISPOSED: Cognitive Trace Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._traces.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

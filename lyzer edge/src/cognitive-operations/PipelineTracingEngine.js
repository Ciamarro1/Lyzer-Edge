/**
 * @fileoverview PipelineTracingEngine — Phase 12 (ADR-029)
 *
 * End-to-end tracing engine for tracking tick/event journeys across the 9 pipeline stages:
 *   Perception -> Memory -> Learning -> Reflection -> Sandbox -> Governance -> Evolution -> Portfolio -> Execution
 */
export class PipelineTracingEngine {
  constructor() {
    this.traces = new Map();
  }

  /**
   * Starts a new trace for a trace_id / causation_id.
   *
   * @param {string} traceId - Unique trace identifier
   * @param {Object} [metadata] - Originating metadata (e.g. tick_id, symbol)
   * @returns {Object} Active trace object
   */
  startTrace(traceId, metadata = {}) {
    if (!traceId) throw new Error('traceId is required to start a pipeline trace');

    const trace = {
      trace_id: traceId,
      metadata,
      start_time: Date.now(),
      stages: [],
      completed_at: null,
      total_duration_ms: 0,
      status: 'IN_PROGRESS'
    };

    this.traces.set(traceId, trace);
    return trace;
  }

  /**
   * Records the completion of a pipeline stage.
   *
   * @param {string} traceId
   * @param {string} stageName - Stage name (e.g. 'PERCEPTION', 'CAUSAL_MEMORY', 'SANDBOX', 'COURT')
   * @param {Object} [details] - Stage output details
   */
  recordStage(traceId, stageName, details = {}) {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const now = Date.now();
    const stageDuration = trace.stages.length > 0
      ? now - trace.stages[trace.stages.length - 1].timestamp
      : now - trace.start_time;

    trace.stages.push({
      stage: stageName,
      duration_ms: stageDuration,
      timestamp: now,
      details
    });

    return trace;
  }

  /**
   * Completes a trace.
   */
  endTrace(traceId, status = 'COMPLETED') {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const now = Date.now();
    trace.completed_at = now;
    trace.total_duration_ms = now - trace.start_time;
    trace.status = status;

    return trace;
  }

  getTrace(traceId) {
    return this.traces.get(traceId) || null;
  }

  getAllTraces() {
    return [...this.traces.values()];
  }
}

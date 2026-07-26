/**
 * Lyzer Edge — DistributedTracingEngine
 * OpenTelemetry-compatible Trace & Span Model (self-contained, zero external dependencies).
 * Provides structured distributed tracing across all pipeline stages:
 *   tickReceived → signalEvaluated → truthKernelEvaluated → ecaCourtPassed → execution
 *
 * Strictly observational. Zero trade execution signals emitted.
 */

let _traceIdCounter = 0;
let _spanIdCounter = 0;

function generateTraceId() {
  return `trace_${Date.now()}_${++_traceIdCounter}`;
}

function generateSpanId() {
  return `span_${Date.now()}_${++_spanIdCounter}`;
}

export class DistributedTracingEngine {
  constructor() {
    this._disposed = false;
    this._activeTraces = new Map();
    this._completedTraces = [];
    this._maxCompletedTraces = 200;
  }

  /**
   * Creates a new trace representing a complete pipeline execution.
   * @param {string} name - Trace name (e.g. 'tick-pipeline', 'signal-evaluation')
   * @param {Record<string, unknown>} [attributes] - Optional trace-level attributes
   * @returns {{ traceId: string, rootSpan: object, addSpan: Function, finish: Function }}
   */
  createTrace(name, attributes = {}) {
    this._assertNotDisposed();

    const traceId = generateTraceId();
    const startTime = performance.now();

    const rootSpan = {
      spanId: generateSpanId(),
      name,
      parentSpanId: null,
      startTimeMs: startTime,
      endTimeMs: null,
      durationMs: null,
      status: 'IN_PROGRESS',
      attributes: { ...attributes },
      children: []
    };

    const trace = {
      traceId,
      name,
      rootSpan,
      spans: [rootSpan],
      startTime,
      endTime: null,
      status: 'ACTIVE'
    };

    this._activeTraces.set(traceId, trace);

    return {
      traceId,
      rootSpan,

      /**
       * Adds a child span to this trace.
       * @param {string} spanName
       * @param {string} [parentSpanId] - Defaults to root span
       * @param {Record<string, unknown>} [spanAttributes]
       * @returns {{ spanId: string, finish: Function }}
       */
      addSpan: (spanName, parentSpanId = null, spanAttributes = {}) => {
        const span = {
          spanId: generateSpanId(),
          name: spanName,
          parentSpanId: parentSpanId || rootSpan.spanId,
          startTimeMs: performance.now(),
          endTimeMs: null,
          durationMs: null,
          status: 'IN_PROGRESS',
          attributes: { ...spanAttributes },
          children: []
        };

        trace.spans.push(span);

        const parent = trace.spans.find(s => s.spanId === span.parentSpanId);
        if (parent) parent.children.push(span.spanId);

        return {
          spanId: span.spanId,
          finish: (status = 'OK') => {
            span.endTimeMs = performance.now();
            span.durationMs = Math.round((span.endTimeMs - span.startTimeMs) * 1000) / 1000;
            span.status = status;
          }
        };
      },

      /**
       * Finishes the entire trace and moves it to completed storage.
       * @param {string} [status]
       */
      finish: (status = 'OK') => {
        rootSpan.endTimeMs = performance.now();
        rootSpan.durationMs = Math.round((rootSpan.endTimeMs - rootSpan.startTimeMs) * 1000) / 1000;
        rootSpan.status = status;
        trace.endTime = rootSpan.endTimeMs;
        trace.status = status;

        this._activeTraces.delete(traceId);
        this._completedTraces.push(Object.freeze({
          traceId: trace.traceId,
          name: trace.name,
          totalSpans: trace.spans.length,
          totalDurationMs: rootSpan.durationMs,
          status: trace.status,
          spans: trace.spans.map(s => Object.freeze({ ...s })),
          completedAt: Date.now()
        }));

        if (this._completedTraces.length > this._maxCompletedTraces) {
          this._completedTraces.shift();
        }
      }
    };
  }

  /**
   * Returns summary of all active traces.
   */
  getActiveTraces() {
    this._assertNotDisposed();
    return Array.from(this._activeTraces.values()).map(t => ({
      traceId: t.traceId,
      name: t.name,
      spanCount: t.spans.length,
      status: t.status
    }));
  }

  /**
   * Returns completed trace history.
   * @param {number} [lastN=20]
   */
  getCompletedTraces(lastN = 20) {
    this._assertNotDisposed();
    return this._completedTraces.slice(-lastN);
  }

  /**
   * Computes per-pipeline-stage aggregate latency metrics from completed traces.
   */
  computePipelineMetrics() {
    this._assertNotDisposed();

    const spansByName = new Map();

    for (const trace of this._completedTraces) {
      for (const span of trace.spans) {
        if (span.durationMs != null) {
          if (!spansByName.has(span.name)) spansByName.set(span.name, []);
          spansByName.get(span.name).push(span.durationMs);
        }
      }
    }

    const metrics = {};
    for (const [name, durations] of spansByName) {
      durations.sort((a, b) => a - b);
      const n = durations.length;
      metrics[name] = {
        count: n,
        avgMs: Math.round((durations.reduce((s, v) => s + v, 0) / n) * 1000) / 1000,
        p50Ms: durations[Math.floor(n * 0.5)],
        p99Ms: durations[Math.min(n - 1, Math.floor(n * 0.99))],
        maxMs: durations[n - 1]
      };
    }

    return Object.freeze(metrics);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_TRACING_ENGINE_DISPOSED');
  }

  dispose() {
    this._disposed = true;
    this._activeTraces.clear();
    this._completedTraces = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

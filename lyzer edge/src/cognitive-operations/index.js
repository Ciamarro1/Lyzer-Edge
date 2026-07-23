import { CognitiveTelemetryAggregator } from './CognitiveTelemetryAggregator.js';
import { PipelineTracingEngine } from './PipelineTracingEngine.js';
import { PerformanceProfilingMonitor } from './PerformanceProfilingMonitor.js';

export class CognitiveOperationsFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.telemetryAggregator = new CognitiveTelemetryAggregator();
    this.tracingEngine = new PipelineTracingEngine();
    this.profilingMonitor = new PerformanceProfilingMonitor();
  }

  aggregateTelemetry(scores) {
    return this.telemetryAggregator.aggregate(scores);
  }

  startTrace(traceId, metadata) {
    return this.tracingEngine.startTrace(traceId, metadata);
  }

  recordStage(traceId, stageName, details) {
    return this.tracingEngine.recordStage(traceId, stageName, details);
  }

  endTrace(traceId, status) {
    return this.tracingEngine.endTrace(traceId, status);
  }

  capturePerformanceSnapshot() {
    return this.profilingMonitor.captureSnapshot();
  }

  detectBottlenecks(stageLogs) {
    return this.profilingMonitor.detectBottlenecks(stageLogs);
  }

  /**
   * Generates a complete Cognitive Operations Status Report for dashboards and APIs.
   *
   * @param {Object} scores - Map of current 6 scores (CCS, CES, EHS, ARS, CAS, MAS)
   * @returns {Object} Complete Ops Status Report
   */
  generateDashboardStatus(scores = {}) {
    const telemetry = this.telemetryAggregator.aggregate(scores);
    const perfSnapshot = this.profilingMonitor.captureSnapshot();
    const activeTracesCount = this.tracingEngine.getAllTraces().filter(t => t.status === 'IN_PROGRESS').length;

    return {
      title: 'LYZER COGNITIVE OPERATIONS DASHBOARD',
      timestamp: Date.now(),
      telemetry,
      performance: perfSnapshot,
      active_traces_in_flight: activeTracesCount,
      operations_status: telemetry.is_operational ? 'ALL_SYSTEMS_GO' : 'ATTENTION_REQUIRED'
    };
  }
}

export {
  CognitiveTelemetryAggregator,
  PipelineTracingEngine,
  PerformanceProfilingMonitor
};

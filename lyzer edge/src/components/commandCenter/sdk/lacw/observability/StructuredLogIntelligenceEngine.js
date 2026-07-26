/**
 * Lyzer Edge — StructuredLogIntelligenceEngine
 * Structured JSON Logging & Intelligence Pattern Analyzer.
 * Logs structured JSON events and detects anomalous patterns, repeated errors, or performance degradation.
 */

export class StructuredLogIntelligenceEngine {
  constructor() {
    this._disposed = false;
    this._logs = [];
  }

  /**
   * Logs a structured JSON log entry.
   * @param {string} level - 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
   * @param {string} source - e.g. 'TruthKernel', 'OpenMobius'
   * @param {string} message
   * @param {Record<string, unknown>} [context]
   */
  log(level, source, message, context = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      level,
      source,
      message,
      traceId: context.traceId || 'trace_none',
      context: Object.freeze({ ...context })
    });

    this._logs.push(record);
    return record;
  }

  /**
   * Analyzes log history for anomaly patterns or repeated error spikes.
   */
  analyzeLogPatterns() {
    this._assertNotDisposed();

    const errors = this._logs.filter(l => l.level === 'ERROR' || l.level === 'FATAL');
    const anomalyDetected = errors.length > 5;

    return Object.freeze({
      totalLogs: this._logs.length,
      errorCount: errors.length,
      anomalyDetected,
      recommendation: anomalyDetected ? 'Trigger RootCauseAnalysisEngine' : 'System nominal'
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_STRUCTURED_LOG_INTELLIGENCE_DISPOSED: Structured Log Intelligence Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._logs = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

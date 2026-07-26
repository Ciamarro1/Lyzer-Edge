/**
 * Lyzer Edge — UniversalMetricsEngine
 * Universal Metric Aggregator & Cognitive Telemetry Engine.
 * Supports Metric Categories: System, Runtime, Agent, Cognitive (Decision Quality, Knowledge Reliability, Memory Relevance, Agent Evolution, Prediction Accuracy), and Business.
 */

export class UniversalMetricsEngine {
  constructor() {
    this._disposed = false;
    this._metrics = new Map();
  }

  /**
   * Records a metric observation.
   * @param {string} metricId
   * @param {string} name
   * @param {number} value
   * @param {string} category - 'SYSTEM' | 'RUNTIME' | 'AGENT' | 'COGNITIVE' | 'BUSINESS'
   * @param {Record<string, unknown>} [context]
   */
  recordMetric(metricId, name, value, category = 'COGNITIVE', context = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      metricId,
      name,
      value,
      category,
      unit: context.unit || 'SCORE',
      timestamp: Date.now(),
      context: Object.freeze({ ...context }),
      confidence: context.confidence ?? 0.96
    });

    this._metrics.set(metricId, record);
    return record;
  }

  /**
   * Returns aggregated metrics by category.
   * @param {string} [category]
   */
  getMetrics(category = null) {
    this._assertNotDisposed();
    const list = Array.from(this._metrics.values());
    if (!category) return list;
    return list.filter(m => m.category === category);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_UNIVERSAL_METRICS_ENGINE_DISPOSED: Universal Metrics Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._metrics.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

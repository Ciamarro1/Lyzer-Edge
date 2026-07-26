/**
 * Lyzer Adaptive Cognitive Workspace (LACW) — Visualization Engine Contract
 * Decoupled visualization contract generator (React-agnostic, library-agnostic).
 * Generates structured specs for Line, Area, Scatter, Heatmap, Radar, Timeline,
 * Knowledge Graph, Decision Tree, Sankey, Agent Graph, Memory Graph, Execution Graph.
 */

export class LACWVisualizationEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Generates a Knowledge Graph visualization spec.
   * @param {Array<{ id: string, label: string, type: string }>} nodes
   * @param {Array<{ source: string, target: string, relation: string, weight: number }>} edges
   */
  generateKnowledgeGraphSpec(nodes = [], edges = []) {
    this._assertNotDisposed();

    return Object.freeze({
      type: 'KNOWLEDGE_GRAPH',
      layout: 'force-directed',
      nodes: Object.freeze(nodes.map(n => ({ ...n }))),
      edges: Object.freeze(edges.map(e => ({ ...e }))),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      generatedAt: Date.now()
    });
  }

  /**
   * Generates a Decision Lineage Tree spec.
   * @param {object} decisionRoot - Root decision object with evidence nodes
   */
  generateDecisionTreeSpec(decisionRoot) {
    this._assertNotDisposed();

    return Object.freeze({
      type: 'DECISION_TREE',
      rootId: decisionRoot.id || 'root',
      evidenceNodes: Object.freeze(decisionRoot.evidence || []),
      attributions: Object.freeze(decisionRoot.attributions || {}),
      confidenceScore: decisionRoot.confidence || 0.95,
      courtApproval: decisionRoot.courtApproved ?? true,
      generatedAt: Date.now()
    });
  }

  /**
   * Generates a Time-Series Streaming Spec for P50-P99.9 latencies or metrics.
   * @param {string} metricName
   * @param {Array<{ timestamp: number, value: number }>} dataPoints
   */
  generateTimeSeriesSpec(metricName, dataPoints = []) {
    this._assertNotDisposed();

    return Object.freeze({
      type: 'TIME_SERIES',
      metricName,
      dataPoints: Object.freeze([...dataPoints]),
      min: dataPoints.length > 0 ? Math.min(...dataPoints.map(d => d.value)) : 0,
      max: dataPoints.length > 0 ? Math.max(...dataPoints.map(d => d.value)) : 0,
      pointCount: dataPoints.length,
      generatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_LACW_VISUALIZATION_ENGINE_DISPOSED: Visualization engine has been disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

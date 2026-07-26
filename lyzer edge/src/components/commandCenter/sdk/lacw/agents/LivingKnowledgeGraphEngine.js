/**
 * Lyzer Edge — LivingKnowledgeGraphEngine
 * Living Knowledge Graph Manager.
 * Supports 11 Semantic Relationships:
 *   CreatedBy, UsedBy, DependsOn, Caused, Influenced, Supports, Contradicts, DerivedFrom, SimilarTo, Improves, Replaces
 */

export const SEMANTIC_RELATION_TYPES = Object.freeze([
  'CreatedBy',
  'UsedBy',
  'DependsOn',
  'Caused',
  'Influenced',
  'Supports',
  'Contradicts',
  'DerivedFrom',
  'SimilarTo',
  'Improves',
  'Replaces'
]);

export class LivingKnowledgeGraphEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._nodes = new Map();
    this._edges = [];
  }

  /**
   * Adds a node to the knowledge graph.
   * @param {string} nodeId
   * @param {string} label
   * @param {string} type - e.g. 'AGENT', 'MEMORY', 'DECISION', 'DOCUMENT', 'EXPERIMENT'
   * @param {Record<string, unknown>} [properties]
   */
  addNode(nodeId, label, type, properties = {}) {
    this._assertNotDisposed();

    const node = Object.freeze({
      nodeId,
      label,
      type,
      properties: Object.freeze({ ...properties }),
      addedAt: Date.now()
    });

    this._nodes.set(nodeId, node);
    return node;
  }

  /**
   * Adds a semantic directed edge between two nodes.
   * @param {string} sourceId
   * @param {string} targetId
   * @param {string} relationType - One of SEMANTIC_RELATION_TYPES
   * @param {number} [weight=1.0]
   */
  addEdge(sourceId, targetId, relationType, weight = 1.0) {
    this._assertNotDisposed();

    if (!SEMANTIC_RELATION_TYPES.includes(relationType)) {
      throw new Error(`ERR_INVALID_RELATION_TYPE: ${relationType}. Valid: ${SEMANTIC_RELATION_TYPES.join(', ')}`);
    }

    const edge = Object.freeze({
      edgeId: `edge_${sourceId}_${targetId}_${relationType}`,
      sourceId,
      targetId,
      relationType,
      weight,
      addedAt: Date.now()
    });

    this._edges.push(edge);

    if (this._eventBus) {
      this._eventBus.publish('knowledge:edge:added', { sourceId, targetId, relationType });
    }

    return edge;
  }

  /**
   * Exports full graph representation.
   */
  exportGraph() {
    this._assertNotDisposed();
    return Object.freeze({
      nodes: Object.freeze(Array.from(this._nodes.values())),
      edges: Object.freeze([...this._edges]),
      nodeCount: this._nodes.size,
      edgeCount: this._edges.length
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_LIVING_KNOWLEDGE_GRAPH_ENGINE_DISPOSED: Living Knowledge Graph Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._nodes.clear();
    this._edges = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

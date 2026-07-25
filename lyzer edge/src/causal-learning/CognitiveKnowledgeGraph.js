export class CognitiveKnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, type, attributes = {}) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, type, attributes, timestamp: Date.now() });
    }
    return this.nodes.get(id);
  }

  addEdge(sourceId, targetId, relationType, metadata = {}) {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      throw new Error(`Source node ${sourceId} or target node ${targetId} does not exist in graph`);
    }

    const edge = {
      source: sourceId,
      target: targetId,
      relation: relationType, // 'CAUSED_BY', 'EVIDENCED_BY', 'PREVENTED_BY', 'CORRELATED_WITH'
      metadata,
      timestamp: Date.now()
    };

    this.edges.push(edge);
    return edge;
  }

  getEdgesForNode(nodeId) {
    return this.edges.filter(e => e.source === nodeId || e.target === nodeId);
  }

  exportGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges]
    };
  }
}

/**
 * @fileoverview CausalKnowledgeGraph — Phase 14 (ADR-031)
 *
 * Unified Knowledge Graph linking all cognitive entities across phases:
 *   Regime -> Features -> Hypotheses -> Experiments -> Evidence -> Strategy Genome -> Portfolio -> Execution -> PnL
 *
 * Enables instant graph traversal, lineage queries, and auditability:
 *   - "Which hypothesis originated strategy X?"
 *   - "What evidence supports parameter Y?"
 *   - "Which mutations descend from strategy Z?"
 */
export class CausalKnowledgeGraph {
  constructor() {
    this.nodes = new Map(); // id -> node
    this.edges = [];        // { from, to, relation, timestamp }
  }

  /**
   * Adds a node to the Knowledge Graph.
   *
   * @param {string} id - Unique entity ID
   * @param {string} type - Node type (REGIME, FEATURE, HYPOTHESIS, EXPERIMENT, EVIDENCE, GENOME, PORTFOLIO, EXECUTION)
   * @param {Object} [attributes] - Additional attributes
   */
  addNode(id, type, attributes = {}) {
    if (!id || !type) throw new Error('id and type are required for KnowledgeGraph node');

    const node = { id, type, attributes, created_at: Date.now() };
    this.nodes.set(id, node);
    return node;
  }

  /**
   * Connects two nodes with a directed causal relationship edge.
   *
   * @param {string} fromId - Origin node ID
   * @param {string} toId - Target node ID
   * @param {string} relation - Relationship name (e.g. 'ORIGINATED_FROM', 'EVIDENCED_BY', 'MUTATED_INTO', 'ALLOCATED_TO')
   */
  addEdge(fromId, toId, relation) {
    if (!this.nodes.has(fromId)) throw new Error(`Node '${fromId}' not found in KnowledgeGraph`);
    if (!this.nodes.has(toId)) throw new Error(`Node '${toId}' not found in KnowledgeGraph`);

    const edge = {
      from: fromId,
      to: toId,
      relation: relation || 'CONNECTED_TO',
      timestamp: Date.now()
    };

    this.edges.push(edge);
    return edge;
  }

  /**
   * Traces backwards or forwards to find ancestors/descendants of a node.
   *
   * @param {string} startId - Starting node ID
   * @param {string} [direction] - 'ANCESTORS' | 'DESCENDANTS'
   * @returns {Array<Object>} Path of connected nodes and relationships
   */
  traceLineage(startId, direction = 'ANCESTORS') {
    const visited = new Set();
    const result = [];

    const traverse = (currentId) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const matchingEdges = direction === 'ANCESTORS'
        ? this.edges.filter(e => e.to === currentId)
        : this.edges.filter(e => e.from === currentId);

      for (const edge of matchingEdges) {
        const nextId = direction === 'ANCESTORS' ? edge.from : edge.to;
        const nextNode = this.nodes.get(nextId);
        if (nextNode) {
          result.push({
            from: edge.from,
            to: edge.to,
            relation: edge.relation,
            node: nextNode
          });
          traverse(nextId);
        }
      }
    };

    traverse(startId);
    return result;
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  getGraphSummary() {
    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.length,
      node_types: [...new Set([...this.nodes.values()].map(n => n.type))]
    };
  }
}

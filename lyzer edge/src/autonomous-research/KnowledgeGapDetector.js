/**
 * @fileoverview KnowledgeGapDetector — Phase 15 (ADR-032)
 *
 * Queries the Causal Knowledge Graph (Phase 14) to spot under-explored market regimes,
 * low-evidence hypotheses, and parameters with high statistical uncertainty.
 */
export class KnowledgeGapDetector {
  constructor(causalKnowledgeGraph) {
    this.graph = causalKnowledgeGraph;
  }

  /**
   * Scans the Causal Knowledge Graph for knowledge gaps.
   *
   * @returns {Object} Knowledge Gap Detection Report
   */
  detectGaps() {
    if (!this.graph) {
      return {
        gaps_found: 0,
        gaps: [],
        scanned_at: Date.now()
      };
    }

    const summary = this.graph.getGraphSummary();
    const allNodes = [...this.graph.nodes.values()];
    const gaps = [];

    // 1. Hypotheses with low evidence edges
    const hypotheses = allNodes.filter(n => n.type === 'HYPOTHESIS');
    for (const hyp of hypotheses) {
      const lineage = this.graph.traceLineage(hyp.id, 'DESCENDANTS');
      const evidenceNodes = lineage.filter(l => l.node.type === 'EVIDENCE' || l.node.type === 'EXPERIMENT');

      if (evidenceNodes.length === 0) {
        gaps.push({
          gap_id: `gap_hyp_${hyp.id}`,
          target_node_id: hyp.id,
          gap_type: 'UNTESTED_HYPOTHESIS',
          uncertainty_level: 'HIGH',
          description: `Hypothesis '${hyp.attributes.title || hyp.id}' has 0 empirical evidence nodes`
        });
      }
    }

    // 2. Regimes without dedicated hypotheses
    const regimes = allNodes.filter(n => n.type === 'REGIME');
    for (const reg of regimes) {
      const lineage = this.graph.traceLineage(reg.id, 'DESCENDANTS');
      const hypNodes = lineage.filter(l => l.node.type === 'HYPOTHESIS');

      if (hypNodes.length === 0) {
        gaps.push({
          gap_id: `gap_reg_${reg.id}`,
          target_node_id: reg.id,
          gap_type: 'UNDER_EXPLORED_REGIME',
          uncertainty_level: 'HIGH',
          description: `Regime '${reg.attributes.name || reg.id}' has no associated strategy hypotheses`
        });
      }
    }

    return {
      total_graph_nodes: summary.total_nodes,
      gaps_found: gaps.length,
      gaps,
      scanned_at: Date.now()
    };
  }
}

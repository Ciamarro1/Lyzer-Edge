import { describe, test, expect } from 'vitest';
import { CausalKnowledgeGraph } from '../../src/institutional-production/CausalKnowledgeGraph.js';

describe('Fase 14 — CausalKnowledgeGraph Verification', () => {
  test('constructs knowledge graph and traces backward lineage from Execution to Hypothesis', () => {
    const graph = new CausalKnowledgeGraph();

    // 1. Add nodes across phases
    graph.addNode('regime_crisis', 'REGIME', { name: 'REGIME_C_CRISIS' });
    graph.addNode('hyp_001', 'HYPOTHESIS', { premise: 'Tighten LHDS in crisis' });
    graph.addNode('exp_001', 'EXPERIMENT', { wfe_ratio: 0.82 });
    graph.addNode('genome_smc_v1', 'GENOME', { name: 'SMC Breakout V1' });
    graph.addNode('exec_order_99', 'EXECUTION', { symbol: 'BTC-USD', price: 50000 });

    // 2. Add causal edges
    graph.addEdge('regime_crisis', 'hyp_001', 'TRIGGERED_HYPOTHESIS');
    graph.addEdge('hyp_001', 'exp_001', 'TESTED_IN_EXPERIMENT');
    graph.addEdge('exp_001', 'genome_smc_v1', 'EVOLVED_INTO_GENOME');
    graph.addEdge('genome_smc_v1', 'exec_order_99', 'EXECUTED_TRADE');

    const summary = graph.getGraphSummary();
    expect(summary.total_nodes).toBe(5);
    expect(summary.total_edges).toBe(4);

    // Trace lineage backward from execution
    const lineage = graph.traceLineage('exec_order_99', 'ANCESTORS');
    expect(lineage.length).toBe(4);
    expect(lineage.some(l => l.from === 'regime_crisis')).toBe(true);
  });
});

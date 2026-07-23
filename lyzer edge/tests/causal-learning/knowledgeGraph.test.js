import { describe, test, expect } from 'vitest';
import { CognitiveKnowledgeGraph } from '../../src/causal-learning/CognitiveKnowledgeGraph.js';

describe('Fase 6.4 — CognitiveKnowledgeGraph Verification', () => {
  test('constructs directed causal graph with nodes and edges', () => {
    const graph = new CognitiveKnowledgeGraph();

    const regimeNode = graph.addNode('REGIME_C_VOLATILE', 'RegimeNode', { lhds: 0.92 });
    const featureNode = graph.addNode('LIQUIDITY_SWEEP_15M', 'FeatureNode', { timeframe: '15m' });
    const vetoNode = graph.addNode('VETO_REASON_LHDS', 'DecisionNode', { severity: 'CRITICAL' });

    graph.addEdge(regimeNode.id, featureNode.id, 'CAUSED_BY', { weight: 0.9 });
    graph.addEdge(featureNode.id, vetoNode.id, 'EVIDENCED_BY', { weight: 0.95 });

    const exported = graph.exportGraph();
    expect(exported.nodes).toHaveLength(3);
    expect(exported.edges).toHaveLength(2);
    expect(exported.edges[0].relation).toBe('CAUSED_BY');
  });
});

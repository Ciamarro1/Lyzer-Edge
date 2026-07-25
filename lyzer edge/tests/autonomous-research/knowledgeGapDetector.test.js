import { describe, test, expect } from 'vitest';
import { CausalKnowledgeGraph } from '../../src/institutional-production/CausalKnowledgeGraph.js';
import { KnowledgeGapDetector } from '../../src/autonomous-research/KnowledgeGapDetector.js';

describe('Fase 15 — KnowledgeGapDetector Verification', () => {
  test('detects UNTESTED_HYPOTHESIS and UNDER_EXPLORED_REGIME gaps in Knowledge Graph', () => {
    const graph = new CausalKnowledgeGraph();

    graph.addNode('hyp_untested', 'HYPOTHESIS', { title: 'Untested Momentum Hyp' });
    graph.addNode('regime_unexplored', 'REGIME', { name: 'REGIME_PANIC' });

    const detector = new KnowledgeGapDetector(graph);
    const report = detector.detectGaps();

    expect(report.gaps_found).toBe(2);
    expect(report.gaps.some(g => g.gap_type === 'UNTESTED_HYPOTHESIS')).toBe(true);
    expect(report.gaps.some(g => g.gap_type === 'UNDER_EXPLORED_REGIME')).toBe(true);
  });
});

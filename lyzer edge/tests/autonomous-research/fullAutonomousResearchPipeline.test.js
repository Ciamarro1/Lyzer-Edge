import { describe, test, expect } from 'vitest';
import { CausalKnowledgeGraph } from '../../src/institutional-production/CausalKnowledgeGraph.js';
import { AutonomousResearchFacade } from '../../src/autonomous-research/index.js';

describe('Fase 15 — Full Autonomous Research Lab Pipeline Verification', () => {
  test('executes complete autonomous research cycle from gap detection to EVI evaluation and paper publication', () => {
    const graph = new CausalKnowledgeGraph();

    // Populate graph with untested hypothesis
    graph.addNode('hyp_untested_101', 'HYPOTHESIS', { title: 'Orderflow Imbalance Strategy' });

    const facade = new AutonomousResearchFacade(graph);

    const cycleResult = facade.runResearchCycle({ computeBudgetUnits: 50.0 });

    expect(cycleResult.cycle_id).toBeDefined();
    expect(cycleResult.knowledge_gaps_found).toBeGreaterThan(0);
    expect(cycleResult.allocated_experiments_count).toBeGreaterThan(0);
    expect(cycleResult.published_papers_count).toBeGreaterThan(0);
    expect(cycleResult.published_papers[0].verdict).toBe('PROVEN_KNOWLEDGE');

    expect(facade.getPublications().length).toBe(1);
  });
});

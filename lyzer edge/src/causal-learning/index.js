import { MemoryMiningEngine } from './MemoryMiningEngine.js';
import { HypothesisEngine } from './HypothesisEngine.js';
import { CognitiveKnowledgeGraph } from './CognitiveKnowledgeGraph.js';
import { CognitiveAuditor } from './CognitiveAuditor.js';

export class CausalLearningFacade {
  constructor(causalMemoryDB) {
    this.db = causalMemoryDB;
    this.miner = new MemoryMiningEngine(causalMemoryDB);
    this.hypothesisEngine = new HypothesisEngine();
    this.graph = new CognitiveKnowledgeGraph();
    this.auditor = new CognitiveAuditor();
  }

  async runLearningCycle(minObservations = 5) {
    const minedPatterns = await this.miner.minePatterns(minObservations);

    for (const pattern of minedPatterns) {
      // 1. Add pattern to Knowledge Graph
      const regimeNode = this.graph.addNode(pattern.pattern_id, 'RegimePatternNode', pattern);
      const outcomeNode = this.graph.addNode(`OUTCOME_${pattern.pattern_id}`, 'OutcomeNode', {
        success_rate: pattern.success_rate,
        avg_pnl: pattern.avg_pnl
      });

      this.graph.addEdge(regimeNode.id, outcomeNode.id, 'CAUSED_BY', { confidence: pattern.confidence_score });

      // 2. Save/update semantic_memory in SQLite
      await this.db.insertSemanticPattern({
        pattern_id: pattern.pattern_id,
        pattern_type: pattern.pattern_type,
        conditions: pattern.conditions,
        observations_count: pattern.observations_count,
        success_rate: pattern.success_rate,
        avg_pnl: pattern.avg_pnl,
        confidence_score: pattern.confidence_score,
        graph_edges: this.graph.getEdgesForNode(regimeNode.id)
      });
    }

    return {
      minedPatternsCount: minedPatterns.length,
      graphSummary: this.graph.exportGraph()
    };
  }

  evaluateHypothesis(prediction, reality, context) {
    return this.hypothesisEngine.evaluateHypothesis({ prediction, reality, context });
  }

  auditProposal(proposal) {
    return this.auditor.auditProposal(proposal);
  }

  async getSemanticKnowledge() {
    return await this.db.getSemanticPatterns();
  }
}

export { MemoryMiningEngine, HypothesisEngine, CognitiveKnowledgeGraph, CognitiveAuditor };

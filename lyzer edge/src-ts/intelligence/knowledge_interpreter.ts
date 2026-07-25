import { ActiveKnowledge } from '../knowledge/replication_protocol';

export interface ActionableInsight {
  knowledgeId: string;
  proposedDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  expectedAlpha: number;
}

/**
 * Knowledge Interpreter
 * 
 * Domain: Intelligence Layer
 * Purpose: Translate historical active knowledge into a raw, theoretically actionable insight 
 * BEFORE context and reality are applied.
 */
export class KnowledgeInterpreter {
  
  /**
   * Converts the mathematical/causal rule of a Knowledge Artifact into a baseline insight.
   */
  public interpret(knowledge: ActiveKnowledge): ActionableInsight {
    // Stub: Translate the specific hypothesis causal logic into a direction
    
    return {
      knowledgeId: knowledge.id,
      proposedDirection: 'LONG', // Stub default
      expectedAlpha: 0.05
    };
  }
}

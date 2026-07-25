import { ActionableInsight } from './knowledge_interpreter';
import { ContextualizedInsight } from './context_evaluator';

export interface ArbitratedSignal {
  knowledgeId: string;
  finalDirection: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidenceScore: number; // 0 to 1
  isRealityOverride: boolean;
}

/**
 * Confidence Arbiter
 * 
 * Domain: Intelligence Layer
 * Purpose: Resolve conflicts between Knowledge (History) and Context (Reality),
 * or between multiple competing Knowledge Artifacts.
 */
export class ConfidenceArbiter {
  
  /**
   * Weighs the historical insight against the current context reality.
   * If Reality Override is triggered, it neutralizes the signal or flips it to protect capital.
   */
  public arbitrate(insight: ActionableInsight, context: ContextualizedInsight): ArbitratedSignal {
    if (context.realityOverrideTriggered) {
      // Governance Law: Reality > Knowledge
      return {
        knowledgeId: insight.knowledgeId,
        finalDirection: 'NEUTRAL', // Capital preservation defaults to Neutral on override
        confidenceScore: 0.0,
        isRealityOverride: true
      };
    }

    return {
      knowledgeId: insight.knowledgeId,
      finalDirection: insight.proposedDirection,
      confidenceScore: context.contextScore * insight.expectedAlpha, // Stub formula
      isRealityOverride: false
    };
  }
}

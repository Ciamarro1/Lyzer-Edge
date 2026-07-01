export interface MarketContext {
  regime: 'BULL' | 'BEAR' | 'CRASH' | 'RANGING';
  volatilityIndex: number;
  macroAnomalies: boolean;
  timestamp: number;
}

export interface ContextualizedInsight {
  baseInsightId: string; // Refers to the ActionableInsight or Knowledge ID
  contextScore: number; // 0 to 1. How well does the current market match the knowledge's ideal regime?
  realityOverrideTriggered: boolean;
}

/**
 * Context Evaluator
 * 
 * Domain: Intelligence Layer
 * Purpose: Compare current reality against historical knowledge parameters.
 * Governance Rule: Reality > Knowledge. If reality has fundamentally broken 
 * the knowledge's assumptions, it triggers an Override.
 */
export class ContextEvaluator {
  
  /**
   * Evaluates the current market reality against a baseline insight.
   */
  public evaluateContext(knowledgeId: string, currentMarket: MarketContext): ContextualizedInsight {
    // Stub: Evaluate regime mismatch
    const isExtremeMismatch = currentMarket.macroAnomalies; // Example logic
    
    return {
      baseInsightId: knowledgeId,
      contextScore: isExtremeMismatch ? 0.1 : 0.9,
      realityOverrideTriggered: isExtremeMismatch
    };
  }
}

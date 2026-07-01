import { AwakenedThesis, ContextSnapshot } from './reasoning_engine';

/**
 * Belief Weigher (Lobe 2)
 * 
 * Domain: Intelligence Layer (The Cortex)
 * Purpose: Assigns an epistemic confidence score to an awakened thesis,
 * explicitly correlating it with Negative Knowledge to avoid repeating deaths.
 */

export interface WeighedBelief {
  thesis: AwakenedThesis;
  epistemicConfidence: number; // 0.0 to 1.0
  negativeKnowledgeScore: number; // Penalty based on past failures in this regime
}

export class BeliefWeigher {

  /**
   * Weighs the thesis against Epistemology's Negative Knowledge.
   */
  public weighBelief(thesis: AwakenedThesis, context: ContextSnapshot, negativeKnowledgeBase: any): WeighedBelief {
    let baseConfidence = 0.8; // Assume historically validated thesis starts high

    // Stub: Query Negative Knowledge.
    // If the Epistemic layer knows that theses relying on this feature
    // die 95% of the time in the current `context.macroRegime`, we slash confidence.
    let negativeScore = 0.0;
    
    if (context.macroRegime === 'BEAR' && thesis.direction === 'BUY') {
      // Historical data from Death Registry suggests buying here is lethal
      negativeScore = 0.5;
      baseConfidence -= negativeScore; 
    }

    return {
      thesis,
      epistemicConfidence: Math.max(0, baseConfidence),
      negativeKnowledgeScore: negativeScore
    };
  }
}

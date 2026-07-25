import { ResolvedBelief } from './conflict_resolver';
import { ContextSnapshot } from './reasoning_engine';

/**
 * The output of the Intelligence Layer.
 * Sent to the Capital Layer.
 * STRICT CONSTITUTIONAL RULE: No Sizing / Allocation parameters here.
 * Intelligence decides what it believes. Capital decides what survives.
 */
export interface DecisionCandidate {
  asset: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  supporting_theses: string[];
  conflicting_theses: string[];
  context_snapshot: ContextSnapshot;
  negative_knowledge_score: number;
  reasoning_trace: string;
  timestamp: number;
}

/**
 * Decision Engine (Lobe 4)
 * 
 * Domain: Intelligence Layer (The Cortex)
 * Purpose: Takes the arbitrated belief from the Conflict Resolver and
 * packages it into a formal, constitutional DecisionCandidate.
 */
export class DecisionEngine {

  /**
   * Forges the final intelligence product.
   */
  public generateCandidate(
    resolved: ResolvedBelief, 
    context: ContextSnapshot
  ): DecisionCandidate | null {
    
    if (resolved.resolutionStatus === 'NO_DECISION' || !resolved.winner) {
      // The Cortex is paralyzed or empty. Emit nothing.
      return null;
    }

    const winner = resolved.winner;
    
    return {
      asset: winner.thesis.trigger.asset,
      direction: winner.thesis.direction,
      confidence: winner.epistemicConfidence,
      supporting_theses: [winner.thesis.thesisId],
      conflicting_theses: resolved.losers.map(l => l.thesis.thesisId),
      context_snapshot: context,
      negative_knowledge_score: winner.negativeKnowledgeScore,
      reasoning_trace: `Arbitrated via Belief Weigher. Base confidence penalized by NK Score: ${winner.negativeKnowledgeScore}. Trigger: ${winner.thesis.trigger.type}.`,
      timestamp: Date.now()
    };
  }
}

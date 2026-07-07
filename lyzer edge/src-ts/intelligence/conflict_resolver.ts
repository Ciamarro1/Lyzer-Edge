import { WeighedBelief } from './belief_weigher';

/**
 * Conflict Resolver (Lobe 3)
 * 
 * Domain: Intelligence Layer (The Cortex)
 * Purpose: Arbitrates between conflicting beliefs (e.g., BUY vs SELL 
 * triggered simultaneously). Does not default to paralysis unless the 
 * difference in evidence is too small to judge.
 */

export interface ResolvedBelief {
  winner: WeighedBelief | null;
  losers: WeighedBelief[];
  resolutionStatus: 'ARBITRATED' | 'NO_DECISION' | 'UNANIMOUS';
}

export class ConflictResolver {
  
  private readonly PARALYSIS_THRESHOLD = 0.05; // 5% confidence diff

  /**
   * Arbitrates an array of awakened, weighed beliefs.
   */
  public resolve(beliefs: WeighedBelief[]): ResolvedBelief {
    if (beliefs.length === 0) {
      return { winner: null, losers: [], resolutionStatus: 'NO_DECISION' };
    }
    
    if (beliefs.length === 1) {
      return { winner: beliefs[0], losers: [], resolutionStatus: 'UNANIMOUS' };
    }

    // Sort by Epistemic Confidence descending
    beliefs.sort((a, b) => b.epistemicConfidence - a.epistemicConfidence);

    const highest = beliefs[0];
    const secondHighest = beliefs[1];

    // Check if the top two are in conflict (different directions)
    if (highest.thesis.direction !== secondHighest.thesis.direction) {
      const diff = highest.epistemicConfidence - secondHighest.epistemicConfidence;
      
      if (diff <= this.PARALYSIS_THRESHOLD) {
        // Intelligence cannot decide. Paralyze rather than guess.
        return { winner: null, losers: beliefs, resolutionStatus: 'NO_DECISION' };
      }
    }

    // Arbitrated successfully based on Weight of Evidence + Negative Knowledge
    return {
      winner: highest,
      losers: beliefs.slice(1),
      resolutionStatus: 'ARBITRATED'
    };
  }
}

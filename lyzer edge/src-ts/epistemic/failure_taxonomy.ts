/**
 * Failure Taxonomy (Pathologist 1)
 * 
 * Domain: Epistemology Layer
 * Purpose: Defines the morphological categories of death in the Lyzer Ecosystem.
 * A hypothesis doesn't just "fail", it fails for a specific mathematical reason.
 */

export type FailureCategory = 
  | 'TEMPORAL_LEAKAGE' // Killed by Purged Walk-Forward (Embargo gap exposed it)
  | 'FRAGILITY_ASSET'  // Killed by Robustness (Failed when BTC -> ETH)
  | 'FRAGILITY_REGIME' // Killed by Robustness (Failed when Bull -> Bear)
  | 'FRAGILITY_HORIZON'// Killed by Robustness (Failed when T+12 -> T+14)
  | 'FEATURE_DECAY'    // Diagnosed post-mortem (Feature lost relevance)
  | 'UNCLASSIFIED';

export interface DiagnosedFailure {
  hypothesisId: string;
  primaryCategory: FailureCategory;
  confidence: number;
}

export class FailureTaxonomy {
  
  /**
   * Classifies the raw death reason from the Death Registry into a 
   * systematic ontological category.
   */
  public classifyDeath(reason: string, killedBy: string): FailureCategory {
    if (killedBy === 'purged_walkforward') {
      return 'TEMPORAL_LEAKAGE';
    }
    
    if (killedBy === 'robustness_tests') {
      if (reason.includes('single asset')) return 'FRAGILITY_ASSET';
      if (reason.includes('parameter rigidities')) return 'FRAGILITY_HORIZON';
      return 'FRAGILITY_REGIME';
    }

    return 'UNCLASSIFIED';
  }
}

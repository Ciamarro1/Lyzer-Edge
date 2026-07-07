import { TaxonomicClassification } from './failure_taxonomy';

/**
 * Epistemic Registry
 * 
 * Domain: Epistemic Layer
 * Purpose: The central diary of meta-learning. Records the diagnosed root causes 
 * of failures. It does not record "loss of money", it records "loss of truth".
 */
export class EpistemicRegistry {
  private epistemicLog: Map<string, TaxonomicClassification> = new Map();

  /**
   * Commits the diagnosed failure class to the historical record.
   */
  public logEpistemicFailure(classification: TaxonomicClassification): void {
    this.epistemicLog.set(classification.sourceSignalId, classification);
  }

  /**
   * Retrieves the historical failure classes for a given paradigm or knowledge cluster.
   */
  public getFailures(): TaxonomicClassification[] {
    return Array.from(this.epistemicLog.values());
  }
}

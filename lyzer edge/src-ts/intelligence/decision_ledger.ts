import { DecisionCandidate } from './decision_engine';

/**
 * Decision Ledger
 * 
 * Domain: Intelligence Layer
 * Purpose: The Append-Only institutional memory of DECISIONS. 
 * Prevents 'Decision Opacity' by permanently archiving the causal chain.
 */
export class DecisionLedger {
  private ledger: Map<string, DecisionCandidate> = new Map();

  /**
   * Appends a new decision to the ledger. This action is immutable.
   */
  public appendDecision(decision: DecisionCandidate): void {
    // In a real system, this writes to a Write-Once-Read-Many (WORM) database
    this.ledger.set(decision.id, decision);
  }

  /**
   * Retrieves a decision by ID for audit purposes.
   */
  public readDecision(decisionId: string): DecisionCandidate | undefined {
    return this.ledger.get(decisionId);
  }

  /**
   * Returns all decisions.
   */
  public getAllDecisions(): DecisionCandidate[] {
    return Array.from(this.ledger.values());
  }
}

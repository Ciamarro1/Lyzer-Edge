import { DecisionLedger } from './decision_ledger';

/**
 * Decision Audit
 * 
 * Domain: Governance Layer / Intelligence Layer
 * Purpose: Provide read-only capabilities for the Governance layer to inspect 
 * the exact causal chain of any decision made by the Intelligence Layer.
 */
export class DecisionAudit {
  private ledger: DecisionLedger;

  constructor(ledger: DecisionLedger) {
    this.ledger = ledger;
  }

  /**
   * Reconstructs the complete causal chain for a specific decision.
   * Useful for answering "Why did we do this?" months or years later.
   */
  public explainDecision(decisionId: string): string {
    const decision = this.ledger.readDecision(decisionId);

    if (!decision) {
      return `[ERROR] No provenance found for Decision ID: ${decisionId}. This is an illegal state.`;
    }

    return `
    --- DECISION AUDIT RECORD ---
    ID: ${decision.id}
    Action Taken: ${decision.action}
    Knowledge Source ID: ${decision.sourceKnowledgeId}
    Reality Override Triggered: ${decision.isRealityOverride}
    
    [HUMAN REASONING]
    ${decision.humanReasoning}
    
    [MACHINE REASONING]
    ${JSON.stringify(decision.machineReasoning, null, 2)}
    -----------------------------
    `;
  }
}

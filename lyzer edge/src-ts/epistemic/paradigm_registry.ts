import { Conviction } from './belief_audit';

/**
 * Paradigm Registry
 * 
 * Domain: Epistemic Layer
 * Purpose: Prepares and holds the 'Convictions' against specific Paradigms.
 * Governance Rule: The Epistemic Layer lacks Executive Authority. It flags the 
 * Paradigm as 'PENDING_RETIREMENT'. Only the Governance/Quant layer can 
 * officially execute the ban from the Discovery Layer.
 */
export class ParadigmRegistry {
  private convictions: Map<string, Conviction> = new Map();

  /**
   * Registers a judicial conviction against a paradigm.
   */
  public issueConviction(conviction: Conviction): void {
    this.convictions.set(conviction.paradigmId, conviction);
    console.warn(`[EPISTEMIC COURT] Conviction issued against Paradigm ${conviction.paradigmId}. Pending Governance Execution for Retirement.`);
  }

  /**
   * Called by the Governance/Quant layer to officially execute the retirement.
   */
  public executeRetirementByGovernance(paradigmId: string): void {
    const conviction = this.convictions.get(paradigmId);
    if (conviction) {
      // Stub: Emit event to Discovery Layer to permanently ban this paradigm from Hypothesis Forge.
      console.log(`[GOVERNANCE] Executed retirement of Paradigm ${paradigmId}. The ecosystem will no longer explore this conceptual space.`);
    }
  }
}

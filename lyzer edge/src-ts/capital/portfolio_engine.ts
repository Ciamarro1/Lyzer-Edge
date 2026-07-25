import { AllocationProposal } from './allocation_engine';

export type SurvivalState = 'HEALTHY' | 'CAUTION' | 'DEFENSIVE' | 'CRITICAL';
export type SurvivalDecision = 'APPROVED' | 'APPROVED_REDUCED' | 'DEFERRED' | 'REJECTED' | 'FORCED_EXIT';

export interface CorrelationAdjustedAllocation {
  originalProposal: AllocationProposal;
  adjustedExposurePct: number;
  survivalState: SurvivalState;
  finalDecision: SurvivalDecision;
  reasoning: string;
}

/**
 * Portfolio Engine
 * 
 * Domain: Capital Layer (The Survival Guardian)
 * Purpose: Evaluates systemic risk and correlation. Has the power to veto, reduce,
 * or even force liquidation of existing trades.
 * "Capital thinks in risk factors, not tickers."
 */
export class PortfolioEngine {
  
  private currentSurvivalState: SurvivalState = 'HEALTHY';
  
  // Stub: Simulating active risk clusters
  private activeClusters: Record<string, number> = {
    'CRYPTO_BETA': 0.08 // Currently 8% of portfolio exposed to Crypto Beta
  };

  /**
   * Evaluates the proposed allocation against systemic constraints.
   */
  public evaluateSystemicRisk(proposal: AllocationProposal): CorrelationAdjustedAllocation {
    
    // Stub logic to identify cluster
    const cluster = 'CRYPTO_BETA'; // Assume BTC/ETH fall here
    const currentExposure = this.activeClusters[cluster] || 0;
    
    // Governance Constraint (Simulated): Max 10% exposure per cluster
    const MAX_CLUSTER_EXPOSURE = 0.10;
    
    let adjustedExposure = proposal.proposedExposurePct;
    let decision: SurvivalDecision = 'APPROVED';
    let reasoning = 'Passed systemic correlation check.';

    // Survival Supremacy Check
    if (this.currentSurvivalState === 'CRITICAL') {
      return {
        originalProposal: proposal,
        adjustedExposurePct: 0,
        survivalState: this.currentSurvivalState,
        finalDecision: 'REJECTED',
        reasoning: 'SURVIVAL SUPREMACY OVERRIDE: Organism is in CRITICAL state. No new risk allowed.'
      };
    }

    // Correlation Haircut Check
    if (currentExposure + adjustedExposure > MAX_CLUSTER_EXPOSURE) {
      const allowedRoom = MAX_CLUSTER_EXPOSURE - currentExposure;
      if (allowedRoom <= 0) {
        decision = 'REJECTED';
        adjustedExposure = 0;
        reasoning = `CORRELATION VETO: ${cluster} exposure limit reached. Proposal denied despite Intelligence conviction.`;
      } else {
        decision = 'APPROVED_REDUCED';
        adjustedExposure = allowedRoom;
        reasoning = `CORRELATION HAIRCUT: Reduced allocation to fit within ${MAX_CLUSTER_EXPOSURE * 100}% ${cluster} cluster limit.`;
      }
    }

    return {
      originalProposal: proposal,
      adjustedExposurePct: adjustedExposure,
      survivalState: this.currentSurvivalState,
      finalDecision: decision,
      reasoning
    };
  }

  /**
   * The Survival Supremacy Doctrine:
   * Called to audit existing positions. Can unilaterally order liquidation.
   */
  public auditExistingPositions(): any[] {
    if (this.currentSurvivalState === 'CRITICAL') {
      // Simulate emitting FORCED_EXIT for all non-hedged positions
      return [{ action: 'FORCED_EXIT', reason: 'Survival State Critical' }];
    }
    return [];
  }
}

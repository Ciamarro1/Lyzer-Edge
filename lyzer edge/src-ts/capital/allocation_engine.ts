import { RiskAssessment } from './risk_engine';

export interface AllocationProposal {
  riskAssessment: RiskAssessment;
  proposedExposurePct: number; // Percentage of total capital proposed
  isKellyCapped: boolean;
}

/**
 * Allocation Engine
 * 
 * Domain: Capital Layer (The Survival Guardian)
 * Purpose: Transforms a Risk Assessment into an Exposure Proposal.
 * "Kelly is a tool, not a truth."
 */
export class AllocationEngine {

  /**
   * Calculates the maximum safe allocation using fractionated Kelly.
   */
  public calculateAllocation(assessment: RiskAssessment): AllocationProposal {
    // Stub: Half-Kelly formulation
    // Pure Kelly = W - ((1 - W) / R)
    // Assume historical W (Winrate) = 0.55 from Validation Layer
    // Assume historical R (Reward/Risk) = 1.5
    
    const winRate = 0.55; 
    const rewardRisk = 1.5;
    
    let kelly = winRate - ((1 - winRate) / rewardRisk);
    
    if (kelly < 0) kelly = 0; // Negative edge

    // Capital Layer imposes Half-Kelly to respect ruin probability
    let proposedPct = kelly * 0.5;

    // Further constrain by the Ruin Probability assessed by RiskEngine
    let isCapped = false;
    if (assessment.ruinProbability > 0.1) {
      proposedPct *= 0.5; // High ruin probability slashes Kelly again
      isCapped = true;
    }

    // Hard ceiling from maxAcceptableLoss
    if (proposedPct > assessment.maxAcceptableLoss) {
      proposedPct = assessment.maxAcceptableLoss;
      isCapped = true;
    }

    return {
      riskAssessment: assessment,
      proposedExposurePct: proposedPct,
      isKellyCapped: isCapped
    };
  }
}

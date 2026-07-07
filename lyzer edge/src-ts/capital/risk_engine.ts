import { DecisionCandidate } from '../intelligence/decision_engine';

export interface RiskAssessment {
  decisionId: string;
  candidate: DecisionCandidate;
  impliedVolatility: number;
  ruinProbability: number;
  maxAcceptableLoss: number;
}

/**
 * Risk Engine
 * 
 * Domain: Capital Layer (The Survival Guardian)
 * Purpose: Evaluates a DecisionCandidate exclusively through the lens of ruin.
 * "Intelligence may propose. Capital may refuse."
 */
export class RiskEngine {

  /**
   * Assesses the probability of the organism taking irreversible damage.
   */
  public evaluateRisk(candidate: DecisionCandidate): RiskAssessment {
    
    // Stub: Calculate Ruin Probability based on Asset Volatility and Current Regime
    let ruinProb = 0.05; // 5% baseline ruin probability for the asset

    if (candidate.context_snapshot.macroRegime === 'HIGH_VOLATILITY') {
      ruinProb *= 3; 
    }

    // High Epistemic Confidence reduces perceived immediate risk, but never to 0.
    ruinProb *= (1.5 - candidate.confidence);

    return {
      decisionId: `DEC-${candidate.timestamp}`,
      candidate,
      impliedVolatility: 0.12, // 12% daily vol stub
      ruinProbability: Math.min(ruinProb, 0.99),
      maxAcceptableLoss: 0.02 // Willing to lose max 2% of total capital on this idea
    };
  }
}

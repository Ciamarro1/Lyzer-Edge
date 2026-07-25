import { HypothesisCandidate } from '../discovery/hypothesis_forge';
import { WalkForwardResult } from './purged_walkforward';
import { RobustnessReport } from './robustness_tests';

export type VerdictResult = 'VALIDATED' | 'WEAK' | 'REJECTED';

export interface FinalVerdict {
  hypothesisId: string;
  verdict: VerdictResult;
  reasoning: string;
}

/**
 * Validation Verdict (Chamber 5)
 * 
 * Domain: Validation Layer
 * Purpose: The Executioner. Consolidates the attacks from the Kill Floor and 
 * issues the final scientific judgment. "Reality is the final authority."
 */
export class ValidationVerdict {
  
  /**
   * Evaluates the combined survival data and determines if the hypothesis becomes Active Knowledge.
   */
  public issueVerdict(hypothesis: HypothesisCandidate, wfResult: WalkForwardResult, robResult: RobustnessReport): FinalVerdict {
    
    // Reality Check 1: Did it bleed money in the future?
    if (!wfResult.passedPValue) {
      return {
        hypothesisId: hypothesis.hypothesisId,
        verdict: 'REJECTED',
        reasoning: 'Failed Purged Walk-Forward. Expected outcome was mathematically falsified out-of-sample.'
      };
    }

    // Reality Check 2: Is it an artifact of a single specific market condition?
    if (robResult.isFragile) {
      return {
        hypothesisId: hypothesis.hypothesisId,
        verdict: 'REJECTED',
        reasoning: 'Failed Robustness Tests. Hypothesis is dependent on single asset or specific parameter rigidities.'
      };
    }

    // Survival
    return {
      hypothesisId: hypothesis.hypothesisId,
      verdict: 'VALIDATED',
      reasoning: 'Survived Purged Walk-Forward, Embargo, and Multi-Asset Robustness attacks. Ready for Replication.'
    };
  }
}

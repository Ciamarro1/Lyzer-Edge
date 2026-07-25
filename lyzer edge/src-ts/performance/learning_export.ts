import { AnalyzedOutcome } from './outcome_analyzer';

/**
 * Learning Export
 * 
 * Domain: Performance Intelligence Layer
 * Purpose: The Neural Feedback. Takes the post-mortem analysis of a trade
 * and converts it into a Learning Signal that is piped back into the 
 * Observation Layer / Discovery Layer to adjust hypotheses.
 * This closes the Cognitive Loop.
 */
export class LearningExport {
  
  /**
   * Generates a feedback signal to alter the organizational memory or discovery tuning.
   */
  public generateFeedbackSignal(outcome: AnalyzedOutcome): any {
    // Stub: If divergence is massive, emit an anomaly signal
    // to trigger a re-evaluation of the specific Active Knowledge artifact.
    const isSevereFailure = outcome.divergenceScore > 1.5;

    return {
      sourceOrderId: outcome.orderId,
      signalType: isSevereFailure ? 'EPISTEMIC_FAILURE' : 'NOMINAL_UPDATE',
      weightAdjustment: isSevereFailure ? -0.1 : 0.01
    };
  }
}

import { HypothesisCandidate } from '../discovery/hypothesis_forge';

export interface ValidationJob {
  jobId: string;
  hypothesis: HypothesisCandidate;
  status: 'QUEUED' | 'PURGING' | 'ROBUSTNESS_TESTING' | 'COMPLETED';
}

/**
 * Validation Intake (Chamber 1)
 * 
 * Domain: Validation Layer
 * Purpose: The reception area of the Kill Floor. Queues falsifiable hypotheses 
 * for systematic execution.
 */
export class ValidationIntake {
  private queue: ValidationJob[] = [];

  /**
   * Registers a newly forged hypothesis for validation.
   */
  public intakeHypothesis(hypothesis: HypothesisCandidate): ValidationJob {
    const job: ValidationJob = {
      jobId: `VAL-${Date.now()}-${hypothesis.hypothesisId}`,
      hypothesis,
      status: 'QUEUED'
    };
    
    this.queue.push(job);
    console.log(`[VALIDATION INTAKE] Hypothesis ${hypothesis.hypothesisId} queued for execution. Reality will now be the judge.`);
    
    return job;
  }
}

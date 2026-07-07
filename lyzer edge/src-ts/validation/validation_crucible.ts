import { Hypothesis } from '../discovery/hypothesis_forge';
import { DestructionSuite, FalsificationResult } from './destruction_suite';

export type ValidationOutcome = 'DESTROYED' | 'REQUIRES_REPLICATION';

export interface ValidationRecord {
  hypothesisId: string;
  outcome: ValidationOutcome;
  falsificationResults: FalsificationResult[];
  timestamp: number;
}

/**
 * Validation Crucible
 * 
 * Domain: Validation Layer
 * Purpose: Receive structured hypotheses and attempt to destroy them.
 * Output: ValidationRecord (Either DESTROYED or REQUIRES_REPLICATION).
 * 
 * Governance Constraints:
 * - Does not "VALIDATE" as TRUE.
 * - Forwards survivors to Replication Layer.
 * - Archiving failures in Hypothesis Graveyard (preventing survivorship bias).
 */
export class ValidationCrucible {
  private suite: DestructionSuite;

  constructor() {
    this.suite = new DestructionSuite();
  }

  /**
   * Drops the hypothesis into the crucible for testing.
   */
  public testHypothesis(hypothesis: Hypothesis): ValidationRecord {
    // 1. Run the destructive battery
    const results = this.suite.runDestructiveBattery(hypothesis.id);

    // 2. Evaluate survival
    // If ANY test fails to pass (i.e. falsification succeeds), the hypothesis is destroyed.
    const isDestroyed = results.some(res => res.passed === false);

    const outcome: ValidationOutcome = isDestroyed ? 'DESTROYED' : 'REQUIRES_REPLICATION';

    const record: ValidationRecord = {
      hypothesisId: hypothesis.id,
      outcome,
      falsificationResults: results,
      timestamp: Date.now()
    };

    // 3. Post-processing Governance Hand-off
    if (outcome === 'DESTROYED') {
      this.sendToGraveyard(record);
    } else {
      this.sendToReplicationLayer(record);
    }

    return record;
  }

  private sendToGraveyard(record: ValidationRecord): void {
    // Stub: Log permanently to prevent future re-testing of the same logic
  }

  private sendToReplicationLayer(record: ValidationRecord): void {
    // Stub: Handoff to the next phase: Replication Protocol
  }
}

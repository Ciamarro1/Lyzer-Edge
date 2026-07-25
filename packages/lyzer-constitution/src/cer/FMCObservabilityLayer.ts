import { FMCFailureMode } from './types';

export class FMCObservabilityLayer {
  private queueBacklogSize: number = 0;
  private checksumFailureCount: number = 0;
  private lastRecoveryDurationMs: number = 0;
  private generatedRecords: number = 0;
  private persistedRecords: number = 0;
  
  // New metrics from D-1 and D-2
  private recoveryThroughput: number = 0;
  private incomingThroughput: number = 0;
  private evidenceEntropyScore: number = 1.0;
  private recoveryInsolvencyDurationMs: number = 0;
  
  private MAX_BACKLOG = 100000;
  private MAX_RECOVERY_WINDOW_MS = 300000;
  private INSOLVENCY_TIME_LIMIT_MS = 60000;
  private MIN_ENTROPY_SCORE = 0.3;

  public recordGenerated() { this.generatedRecords++; }
  public recordPersisted() { this.persistedRecords++; }

  public getDurabilityGap(): number {
    return this.generatedRecords - this.persistedRecords;
  }

  public getRecoveryCatchUpRatio(): number {
    if (this.incomingThroughput === 0) return 1.0; // Steady state
    return this.recoveryThroughput / this.incomingThroughput;
  }

  public evaluateFailureModes(): FMCFailureMode[] {
    const activeThreats: FMCFailureMode[] = [];

    if (this.queueBacklogSize > this.MAX_BACKLOG) activeThreats.push('EVIDENCE_LOSS_RISK');
    if (this.checksumFailureCount > 0) activeThreats.push('QUEUE_CORRUPTION');
    if (this.lastRecoveryDurationMs > this.MAX_RECOVERY_WINDOW_MS) activeThreats.push('RECOVERY_STORM');
    if (this.getDurabilityGap() > this.MAX_BACKLOG) activeThreats.push('DURABILITY_GAP_CRITICAL');

    // Emenda D-1: Recovery Catch-Up Ratio < 1 indicates Insolvency
    if (this.getRecoveryCatchUpRatio() < 1.0) {
      this.recoveryInsolvencyDurationMs += 1000; // Simulated 1s tick
      if (this.recoveryInsolvencyDurationMs > this.INSOLVENCY_TIME_LIMIT_MS) {
        activeThreats.push('RECOVERY_INSOLVENCY');
      }
    } else {
      this.recoveryInsolvencyDurationMs = 0; // Recovered equilibrium
    }

    // Emenda D-2: Epistemic Collapse due to low Evidence Entropy
    if (this.evidenceEntropyScore < this.MIN_ENTROPY_SCORE) {
      activeThreats.push('EPISTEMIC_COLLAPSE');
    }

    return activeThreats;
  }
}

import { EpistemicRegistry } from './epistemic_registry';

export interface Conviction {
  paradigmId: string;
  severity: 'WARNING' | 'CRITICAL' | 'TERMINAL';
  reasoning: string;
}

/**
 * Belief Audit
 * 
 * Domain: Epistemic Layer
 * Purpose: The Judge. Evaluates the density of failures in the Epistemic Registry.
 * If a Paradigm accumulates too many systemic failures, it issues a Conviction.
 */
export class BeliefAudit {
  private registry: EpistemicRegistry;

  constructor(registry: EpistemicRegistry) {
    this.registry = registry;
  }

  /**
   * Scans the epistemic history to judge if a core belief is no longer valid.
   */
  public auditBeliefs(paradigmId: string): Conviction | null {
    const failures = this.registry.getFailures(); // In reality, filtered by paradigmId
    
    // Stub: Calculate failure density
    const failureCount = failures.length;

    if (failureCount > 100) {
      return {
        paradigmId,
        severity: 'TERMINAL',
        reasoning: `Paradigm has suffered ${failureCount} failures, primarily REGIME_SHIFT_MISS. It is no longer empirically valid.`
      };
    }

    return null;
  }
}

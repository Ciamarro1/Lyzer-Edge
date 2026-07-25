import { PerformanceRegistry } from './performance_registry';

/**
 * Attribution Audit
 * 
 * Domain: Governance / Performance Layer
 * Purpose: Allows Governance to review the 'Attribution Collapse' protections.
 * Distinguishes if the firm is making money due to Alpha (Intelligence)
 * or Beta (Market Drift) or losing money due to Slippage (Capital Layer inefficiency).
 */
export class AttributionAudit {
  private registry: PerformanceRegistry;

  constructor(registry: PerformanceRegistry) {
    this.registry = registry;
  }

  public auditPerformance(orderId: string): string {
    const outcome = this.registry.getOutcome(orderId);
    if (!outcome) return 'No data.';

    return `
    --- PERFORMANCE AUDIT ---
    Order ID: ${orderId}
    Expected Utility: ${outcome.expectedUtility}
    Realized Utility: ${outcome.realizedUtility}
    Divergence: ${outcome.divergenceScore}
    -------------------------
    `;
  }
}

/**
 * Performance Registry
 * 
 * Domain: Performance Intelligence Layer
 * Purpose: The database of ultimate Truth. Stores the fully resolved 
 * Trade Outcomes (post-execution and post-attribution) to be used for 
 * organizational learning.
 */
export class PerformanceRegistry {
  private outcomes: Map<string, any> = new Map();

  public recordOutcome(orderId: string, outcomeData: any): void {
    this.outcomes.set(orderId, outcomeData);
  }

  public getOutcome(orderId: string): any {
    return this.outcomes.get(orderId);
  }
}

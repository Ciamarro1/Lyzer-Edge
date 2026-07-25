import { eventBus } from '../lib/eventBus.js';
import { OpportunityEntropyEvent } from '../types/governanceContracts.js';

export interface Opportunity {
  id: string;
  symbol: string;
  expectedEdge: number;
  confidence: number;
}

export class CapitalOpportunitySurface {
  private activeOpportunities: Map<string, Opportunity> = new Map();
  private snapshotHistory: Array<{ timestamp: number; triggerEvent: string; entropy: number }> = [];

  constructor() {
    this.setupListeners();
  }

  /**
   * Set up event listeners for the event-driven triggers.
   * Disables any polling; snapshots are strictly event-driven.
   */
  private setupListeners(): void {
    // 1. Regime Change Trigger
    eventBus.on('regime:changed', (data: any) => this.captureSnapshot('REGIME_CHANGE', data));
    eventBus.on('regime:change', (data: any) => this.captureSnapshot('REGIME_CHANGE', data));

    // 2. Allocation Change Trigger
    eventBus.on('allocation:changed', (data: any) => this.captureSnapshot('ALLOCATION_CHANGE', data));
    eventBus.on('allocation:change', (data: any) => this.captureSnapshot('ALLOCATION_CHANGE', data));

    // 3. Opportunity Collapse Trigger
    eventBus.on('opportunity:collapsed', (data: any) => this.captureSnapshot('OPPORTUNITY_COLLAPSE', data));
    eventBus.on('opportunity:collapse', (data: any) => this.captureSnapshot('OPPORTUNITY_COLLAPSE', data));

    // 4. Volatility Shock Trigger
    eventBus.on('volatility:shock', (data: any) => this.captureSnapshot('VOLATILITY_SHOCK', data));
  }

  /**
   * Register a new opportunity or update an existing one.
   * This operates in the research layer and does not influence active order flow.
   */
  public updateOpportunity(opp: Opportunity): void {
    this.activeOpportunities.set(opp.id, opp);
  }

  /**
   * Remove an opportunity from the surface.
   */
  public removeOpportunity(id: string): void {
    this.activeOpportunities.delete(id);
  }

  /**
   * Captures a snapshot of the current opportunity surface and calculates Opportunity Entropy.
   * 
   * Entropy Calculation:
   * H = -Sum(p_i * log2(p_i)) where p_i is the normalized expected edge of opportunity i.
   */
  public captureSnapshot(triggerEvent: string, triggerData?: any): number {
    const opportunities = Array.from(this.activeOpportunities.values());
    let entropy = 0;

    if (opportunities.length > 0) {
      // 1. Get raw edges
      const edges = opportunities.map(o => Math.max(0, o.expectedEdge));
      const totalEdge = edges.reduce((sum, val) => sum + val, 0);

      if (totalEdge > 0) {
        // 2. Normalize and calculate Shannon Entropy
        entropy = edges.reduce((sum, edge) => {
          const p = edge / totalEdge;
          if (p > 0) {
            return sum - p * Math.log2(p);
          }
          return sum;
        }, 0);
      }
    }

    // Round to 4 decimal places for precision
    entropy = Math.round(entropy * 10000) / 10000;

    this.snapshotHistory.push({
      timestamp: Date.now(),
      triggerEvent,
      entropy
    });

    if (this.snapshotHistory.length > 100) {
      this.snapshotHistory.shift();
    }

    const eventPayload: OpportunityEntropyEvent = {
      entropy,
      triggerEvent: triggerEvent as any,
      activeOpportunityCount: opportunities.length,
      timestamp: Date.now()
    };

    // Publish Opportunity Entropy to the FMC
    eventBus.emit('research:opportunity_entropy', eventPayload);

    return entropy;
  }

  public getSnapshotHistory() {
    return this.snapshotHistory;
  }

  public getActiveOpportunitiesCount(): number {
    return this.activeOpportunities.size;
  }
}

export interface ExternalRealitySnapshot {
  timestamp: number;
  benchmarkReturn: number;      // e.g. SPY or BTC Index return
  marketVolatility: number;     // realized volatility regime
  externalRiskScore: number;    // macro risk index [0, 1]
  humanOverrideActive: boolean; // physical bypass status
}

export interface ExternalAnchorProvider {
  /**
   * Retrieves the external reality state for a specific timestamp.
   */
  getExternalSnapshot(timestamp: number): Promise<ExternalRealitySnapshot>;
}

export class ExternalFeedAdapter implements ExternalAnchorProvider {
  private currentContext: Omit<ExternalRealitySnapshot, 'timestamp'> = {
    benchmarkReturn: 0.0,
    marketVolatility: 0.15,
    externalRiskScore: 0.1,
    humanOverrideActive: false
  };

  /**
   * Updates the active external context.
   */
  public updateContext(context: Partial<Omit<ExternalRealitySnapshot, 'timestamp'>>): void {
    this.currentContext = {
      ...this.currentContext,
      ...context
    };
  }

  /**
   * Retrieves the external reality state for a specific timestamp.
   */
  public async getExternalSnapshot(timestamp: number): Promise<ExternalRealitySnapshot> {
    return {
      timestamp,
      ...this.currentContext
    };
  }
}

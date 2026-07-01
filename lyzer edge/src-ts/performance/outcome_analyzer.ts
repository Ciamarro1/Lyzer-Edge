import { AttributionRecord } from '../capital/attribution_engine';

export interface AnalyzedOutcome {
  orderId: string;
  expectedUtility: number; // What the Intelligence Layer predicted
  realizedUtility: number; // What actually happened (Net P&L relative to risk)
  divergenceScore: number; // Measure of prediction error
}

/**
 * Outcome Analyzer
 * 
 * Domain: Performance Intelligence Layer
 * Purpose: Compares the theoretical expectation of the Intelligence Layer
 * with the brutal reality of the Capital Layer's results.
 */
export class OutcomeAnalyzer {
  
  public analyze(attribution: AttributionRecord, expectedUtility: number): AnalyzedOutcome {
    // Stub: Compare expectation vs reality
    const realized = attribution.netPnL > 0 ? 1.0 : -1.0; // Simplified
    const divergence = Math.abs(expectedUtility - realized);

    return {
      orderId: attribution.orderId,
      expectedUtility,
      realizedUtility: realized,
      divergenceScore: divergence
    };
  }
}

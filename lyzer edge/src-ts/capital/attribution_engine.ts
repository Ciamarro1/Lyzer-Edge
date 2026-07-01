import { CapitalLedger } from './capital_ledger';

export interface AttributionRecord {
  orderId: string;
  grossPnL: number;
  slippageCost: number;
  netPnL: number;
}

/**
 * Attribution Engine
 * 
 * Domain: Capital Layer
 * Purpose: Separates the causal quality of the Intelligence from the operational 
 * reality of the Execution. Prevents 'Attribution Collapse'.
 */
export class AttributionEngine {
  private ledger: CapitalLedger;

  constructor(ledger: CapitalLedger) {
    this.ledger = ledger;
  }

  /**
   * Calculates the exact provenance of the return.
   */
  public calculateAttribution(orderId: string, exitPrice: number): AttributionRecord | null {
    const receipt = this.ledger.getReceipt(orderId);
    
    if (!receipt) return null;

    // Stub: Calculate Net P&L. (Gross minus execution costs and slippage)
    const grossPnL = (exitPrice - receipt.averageExecutionPrice) * receipt.filledAmountUsd; // Simplified
    const slippageCost = 0.05 * receipt.filledAmountUsd; // Stub
    const netPnL = grossPnL - slippageCost;

    return {
      orderId,
      grossPnL,
      slippageCost,
      netPnL
    };
  }
}

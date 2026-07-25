/**
 * tradeLogSchema.js
 * Strictly defines the properties logged for each signal/trade
 * for post-mortem attribution profiling.
 */

export const TradeLogSchema = {
  id: "string",                // Unique ID format: `${symbol}_${index}`
  timestamp: "number",         // Simulation candle index
  symbol: "string",            // Asset ticker, e.g., 'BTCUSDT'
  direction: "LONG | SHORT",   // Target trade direction
  entryPrice: "number",        // Asset price at signal generation
  exitPrice: "number",         // Actual or simulated exit price
  pnl: "number",               // Decimal percentage return (e.g. 0.02 for +2%)
  signal: {
    type: "LONG | SHORT",
    confidence: "number",
    reasons: ["string"]
  },
  regime: "string",            // Market regime at entry
  wasRejected: "boolean",      // True if TruthKernel blocked execution
  governanceDecision: "ALLOW | REJECT | CAPACITY_CONSTRAINED",
  reasonCodes: ["string"],     // Array of reasoning tokens from filters
  slippage: "number",          // Execution slip (frictional cost)
  spread: "number",            // Bid-ask spread cost
  timingOffset: "number"       // Timing quality deviation
};
 
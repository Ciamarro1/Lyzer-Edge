/**
 * verify_decomposition.js
 * Verification script for the EV Decomposition Lab (v1).
 * Executes trade-level ablactions, regime stress tests, and execution friction delta analysis.
 */

import { getHistoricalCandles } from './src/db/historicalData.js';
import { EvDecompositionLab } from './src/engine/evDecompositionLab.js';

console.log("========================================================================");
console.log("        LYZER CORE — EV DECOMPOSITION LAB (v1 AUDIT RUN)");
console.log("========================================================================\n");

const data = getHistoricalCandles();
const assets = ["BTCUSDT", "ETHUSDT"];

const baseConfig = {
  confidenceThreshold: 65,
  riskReward: 1.5,
  regimeWeight: 1.2,
  chopPenalty: 0.5,
  governanceStrictness: 0.8,
  limitDiscountFactor: 0.4,
  limitExpiry: 5
};

for (const symbol of assets) {
  console.log(`------------------------------------------------------------------------`);
  console.log(`📊 DECOMPOSITION ANALYSIS FOR: ${symbol}`);
  console.log(`------------------------------------------------------------------------`);

  const symbolCandles = data[symbol];
  const oppSymbol = symbol === 'BTCUSDT' ? 'ETHUSDT' : 'BTCUSDT';
  const oppCandles = data[oppSymbol];

  const lab = new EvDecompositionLab(symbolCandles, oppCandles, baseConfig);
  const report = lab.generateTradeReport();

  const toPct = (val) => (val * 100).toFixed(4) + '%';

  console.log(`1. PURE SIGNAL STAGE (EV_signal):         ${toPct(report.aggregated.EV_signal)}`);
  console.log(`   * Trade Candidates generated:       ${report.details.baseSignalsCount}`);
  console.log(`2. TEMPORAL ALIGNMENT STAGE (EV_timing):  ${toPct(report.aggregated.EV_timing)}`);
  console.log(`   * Trade Candidates synced (MTF):    ${report.details.mtfSignalsCount}`);
  console.log(`3. EXECUTION PHYSICS STAGE (EV_execution):${toPct(report.aggregated.EV_execution)}`);
  console.log(`   * Trade Candidates executed (ERL):  ${report.details.erlSignalsCount}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`4. REGIME STRESS-TEST DEVIATION:`);
  console.log(`   * Shuffled Regime Sensitivity:      ${toPct(report.aggregated.EV_regime_shuffle)}`);
  console.log(`   * Inverted Regime Sensitivity:      ${toPct(report.aggregated.EV_regime_invert)}`);
  console.log(`5. FRICTION IMPLEMENTATION AUDIT:`);
  console.log(`   * ERL Impact vs Static 2bps/1bp:    ${toPct(report.aggregated.delta_vs_historical_friction)}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`🚨 TOTAL ESTIMATED EXPECTED VALUE (EV_total): ${toPct(report.aggregated.EV_total)}`);
  console.log(`========================================================================\n`);
}

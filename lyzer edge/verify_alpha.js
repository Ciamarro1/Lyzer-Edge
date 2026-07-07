import { calcAllStats } from './src/engine/stats.js';
import { calcEdgeScore } from './src/engine/edgescore.js';
import { calcOutlierImpact } from './src/engine/outliers.js';

// Generate 50 sample trades
const trades = [];
let balance = 10000;
const startDate = new Date('2023-01-01T10:00:00Z');

for (let i = 1; i <= 50; i++) {
  // 45% win rate
  const isWin = Math.random() < 0.45;
  const isOutlier = i === 25; // Force one massive win as outlier
  
  let pnl, realizedRR;
  if (isOutlier) {
    pnl = 1500; // massive win
    realizedRR = 15;
  } else if (isWin) {
    pnl = 200 + (Math.random() * 100);
    realizedRR = 2 + (Math.random() * 1);
  } else {
    pnl = -100 - (Math.random() * 20);
    realizedRR = -1;
  }
  
  balance += pnl;
  
  const tradeDate = new Date(startDate.getTime() + (i * 86400000));
  
  trades.push({
    id: i,
    symbol: i % 2 === 0 ? 'BTCUSDT' : 'ETHUSDT',
    direction: Math.random() > 0.5 ? 'long' : 'short',
    entryPrice: 1000,
    stopLoss: 900,
    takeProfit: 1200,
    exitPrice: isWin ? 1200 : 900,
    result: isWin ? 'win' : 'loss',
    pnl: pnl,
    rMultiple: realizedRR,
    plannedRR: 2.0,
    realizedRR: realizedRR,
    riskAmount: 100,
    rewardAmount: pnl,
    entryDate: tradeDate.toISOString(),
    exitDate: new Date(tradeDate.getTime() + 3600000).toISOString(),
    positionSize: 1,
    status: 'closed'
  });
}

console.log("=== ALPHA VERIFICATION REPORT ===");
console.log(`Total Trades: ${trades.length}`);
console.log("---------------------------------");

const stats = calcAllStats(trades);
console.log("1. STATISTICS ENGINE:");
console.log(`- Win Rate: ${stats.winRate.toFixed(2)}%`);
console.log(`- Profit Factor: ${stats.profitFactor.toFixed(2)}`);
console.log(`- Expectancy: $${stats.expectancy.toFixed(2)}`);
console.log(`- Max Drawdown: ${stats.maxDrawdown.maxDrawdown.toFixed(2)}%`);
console.log("---------------------------------");

const edgeScoreData = calcEdgeScore(trades);
console.log("2. EDGE SCORE ENGINE:");
console.log(`- Score: ${edgeScoreData.score} / 100`);
console.log(`- Version: ${edgeScoreData.version}`);
console.log(`- Confidence: ${edgeScoreData.confidence}`);
console.log("- Components:");
console.log(`  * WinRate: ${edgeScoreData.components.winRateScore}`);
console.log(`  * RR: ${edgeScoreData.components.rrScore}`);
console.log(`  * ProfitFactor: ${edgeScoreData.components.profitFactorScore}`);
console.log(`  * Drawdown: ${edgeScoreData.components.drawdownScore}`);
console.log(`  * Consistency: ${edgeScoreData.components.consistencyScore}`);
console.log(`  * SampleConfidence: ${edgeScoreData.components.sampleConfidence}`);
console.log("---------------------------------");

const outlierData = calcOutlierImpact(trades);
console.log("3. OUTLIER ENGINE:");
console.log(`- Profit Factor w/ Outliers: ${outlierData.withOutliers.profitFactor.toFixed(2)}`);
console.log(`- Profit Factor w/o Outliers: ${outlierData.withoutOutliers.profitFactor.toFixed(2)}`);
console.log(`- Impact Delta: ${outlierData.impactSummary.profitFactorDelta.toFixed(2)}`);

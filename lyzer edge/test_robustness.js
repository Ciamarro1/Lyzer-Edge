import { calcAllStats } from './src/engine/stats.js';
import { calculateSystemReliabilityScore } from './src/engine/reliability.js';
import { calculateEdgeSlope } from './src/engine/decay.js';

function generateTrades(count, winRatePct, rr, startId = 1) {
  const trades = [];
  const w = winRatePct / 100;
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() < w;
    const rMultiple = isWin ? rr : -1;
    trades.push({
      id: startId + i,
      result: isWin ? 'win' : 'loss',
      pnl: rMultiple * 100, // Assuming 1R = $100
      rMultiple: rMultiple
    });
  }
  return trades;
}

async function runTests() {
  console.log("=== Lyzer Edge 1.0 Statistical Robustness Test ===\n");

  // Dataset A: 300 trades, 45% WR, RR 3.0
  const datasetA = generateTrades(300, 45, 3.0);
  const statsA = calcAllStats(datasetA);
  const confA = calculateSystemReliabilityScore(datasetA);
  const slopeA = calculateEdgeSlope(datasetA);

  console.log("--- DATASET A (300 trades, 45% WR, RR 3.0) ---");
  console.log(`Expected: High Edge, High Confidence, Positive/Stable Slope`);
  console.log(`- Win Rate: ${statsA.winRate.toFixed(1)}%`);
  console.log(`- Profit Factor: ${statsA.profitFactor.toFixed(2)}`);
  console.log(`- Confidence Score (SQN): ${confA.toFixed(1)} / 100`);
  console.log(`- Edge Slope: ${slopeA.toFixed(4)}\n`);

  // Dataset B: 12 trades, 80% WR, RR 4.0
  const datasetB = generateTrades(12, 80, 4.0);
  const statsB = calcAllStats(datasetB);
  const confB = calculateSystemReliabilityScore(datasetB);
  
  console.log("--- DATASET B (12 trades, 80% WR, RR 4.0) ---");
  console.log(`Expected: High Edge, LOW Confidence`);
  console.log(`- Win Rate: ${statsB.winRate.toFixed(1)}%`);
  console.log(`- Profit Factor: ${statsB.profitFactor.toFixed(2)}`);
  console.log(`- Confidence Score (SQN): ${confB.toFixed(1)} / 100\n`);

  // Dataset C: 200 trades (First 100: PF 2.5, Last 100: PF 0.8)
  const datasetC1 = generateTrades(100, 50, 2.5, 1);
  const datasetC2 = generateTrades(100, 30, 1.86, 101);
  const datasetC = [...datasetC1, ...datasetC2];
  
  const statsC = calcAllStats(datasetC);
  const slopeC = calculateEdgeSlope(datasetC);

  console.log("--- DATASET C (200 trades, PF dropped from 2.5 to 0.8) ---");
  console.log(`Expected: Negative Decay/Slope`);
  console.log(`- Overall PF: ${statsC.profitFactor.toFixed(2)}`);
  console.log(`- Edge Slope: ${slopeC.toFixed(4)}\n`);
}

runTests();

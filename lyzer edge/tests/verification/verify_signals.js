import { getHistoricalCandles } from '../../../packages/lyzer-shared/src/db/historicalData.js';
import { SignalEngine } from '../../src/engine/signalEngine.js';

console.log("=============================================");
console.log("         VERIFICATION SYSTEM STARTING        ");
console.log("=============================================\n");

// 1. Verify Determinism
console.log("1. TESTING CANDLE GENERATOR DETERMINISM...");
const run1 = getHistoricalCandles();
const run2 = getHistoricalCandles();

const json1 = JSON.stringify(run1);
const json2 = JSON.stringify(run2);

if (json1 === json2) {
  console.log("✅ SUCCESS: Candle generation is 100% deterministic and identical across calls.");
} else {
  console.error("❌ FAILURE: Candle generation outputs differed between calls.");
  process.exit(1);
}

// 2. Verify Candle Counts and Trends
console.log("\n2. VERIFYING CANDLE Trajectory & Counts...");
const btcCandles = run1.BTCUSDT;
const ethCandles = run1.ETHUSDT;

console.log(`- BTCUSDT Candles count: ${btcCandles.length} (Expected: 500)`);
console.log(`- ETHUSDT Candles count: ${ethCandles.length} (Expected: 500)`);

if (btcCandles.length !== 500 || ethCandles.length !== 500) {
  console.error("❌ FAILURE: Candle counts are incorrect.");
  process.exit(1);
}

// Check key milestones
console.log("\nBTC Trajectory Milestones:");
console.log(`- Start (i=0):     $${btcCandles[0].close} (Target: $62,000)`);
console.log(`- Trend (i=150):   $${btcCandles[150].close} (Target: $72,000)`);
console.log(`- Consold (i=250): $${btcCandles[250].close} (Target: $72,000)`);
console.log(`- Drop (i=380):    $${btcCandles[380].close} (Target: $63,000)`);
console.log(`- Recover (i=499): $${btcCandles[499].close} (Target: recovering)`);

console.log("\nETH Trajectory Milestones:");
console.log(`- Start (i=0):     $${ethCandles[0].close} (Target: $2,800)`);
console.log(`- Trend (i=150):   $${ethCandles[150].close} (Target: $3,600)`);
console.log(`- Consold (i=250): $${ethCandles[250].close} (Target: $3,600)`);
console.log(`- Drop (i=380):    $${ethCandles[380].close} (Target: $2,900)`);
console.log(`- Recover (i=499): $${ethCandles[499].close} (Target: recovering)`);

// 3. Process with Signal Engine
console.log("\n3. PROCESSING CANDLES THROUGH SIGNAL ENGINE...");
const engine = new SignalEngine();

function analyzeAsset(symbol, candles) {
  const previous = [];
  const signals = { LONG: 0, SHORT: 0, HOLD: 0 };
  const regimes = {};
  const signalInstances = [];

  for (let i = 0; i < candles.length; i++) {
    const report = engine.processCandle(candles[i], previous);
    previous.push(candles[i]);

    const signalMap = { 'go': 'LONG', 'no-go': 'SHORT', 'caution': 'HOLD' };
    const mappedSignal = signalMap[report.signal] || 'HOLD';
    signals[mappedSignal]++;
    regimes[report.regime] = (regimes[report.regime] || 0) + 1;

    if (mappedSignal !== "HOLD") {
      signalInstances.push({
        index: i,
        time: candles[i].time || candles[i].datetime,
        price: candles[i].close,
        volume: candles[i].volume,
        signal: mappedSignal,
        confidence: report.confidence,
        reasons: report.reasons,
        regime: report.regime,
        volatility: report.volatility,
        trendStrength: report.trendStrength
      });
    }
  }

  console.log(`\nResults for ${symbol}:`);
  console.log(`- Total Candles Processed: ${candles.length}`);
  console.log(`- Signals generated:`, signals);
  console.log(`- Market regimes identified:`, regimes);

  if (signalInstances.length > 0) {
    console.log(`- Found ${signalInstances.length} triggers. Sample instances:`);
    signalInstances.slice(0, 3).forEach(inst => {
      console.log(`  * Candle ${inst.index} (${inst.time}): ${inst.signal} at $${inst.price} (Confidence: ${inst.confidence}%)`);
      console.log(`    Reasons:`, inst.reasons.map(r => `      - ${r}`));
    });
  } else {
    console.log(`- No LONG/SHORT triggers generated. Indicators did not fully align.`);
  }
}

analyzeAsset("BTCUSDT", btcCandles);
analyzeAsset("ETHUSDT", ethCandles);

console.log("\n=============================================");
console.log("           VERIFICATION COMPLETE            ");
console.log("=============================================");

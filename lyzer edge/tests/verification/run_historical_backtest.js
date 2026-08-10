import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HistoricalDataSanitizer } from '../../backend/HistoricalDataSanitizer.js';
import { EventSourcedBacktester } from '../../backend/EventSourcedBacktester.js';
import { BinanceDataFetcher } from '../../backend/utils/BinanceDataFetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministic Pseudo-random Generator (to ensure reproducibility of the synthetic event stream)
function seedRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const rand = seedRandom(42);

function generateDirtyDataset() {
  console.log('[DATA] Generating 5000 candles of raw historical data with Intended Chaos (Gaps & Outliers)...');
  const dataset = [];
  let currentPrice = 60000;
  let timestamp = 1600000000000; // Arbitrary start time
  
  for (let i = 0; i < 5000; i++) {
    // 1. Missing Ticks (Hainaut Gap Test) - Skip some minutes entirely
    if (rand() < 0.05) {
      timestamp += 60000 * Math.floor(1 + rand() * 5); // Skip 1 to 5 minutes
    } else {
      timestamp += 60000;
    }

    // 2. Extreme Value Outliers (Richman / Liu Catastrophe Test)
    let jump = (rand() - 0.5) * 0.005; // Normal noise 0.5%
    if (rand() < 0.02) {
      jump = (rand() - 0.5) * 0.8; // 80% FLASH CRASH or PUMP (Should trigger Winsorization)
    }

    currentPrice = currentPrice * (1 + jump);

    dataset.push({
      openTime: timestamp,
      open: currentPrice * 0.999,
      high: currentPrice * 1.002,
      low: currentPrice * 0.998,
      close: currentPrice,
      volume: 10 + rand() * 100
    });
  }
  
  return dataset;
}

async function run() {
  console.log('===============================================================');
  console.log(' LYZER EDGE - QUANT-GRADE DETERMINISTIC BACKTESTER INITIATED ');
  console.log('===============================================================');
  
  const args = process.argv.slice(2);
  const isRealData = args.includes('--real');
  
  let rawData = [];

  if (isRealData) {
    const symbol = 'BTCUSDT';
    const interval = '1m';
    const daysToFetch = 10; // Default to 10 days to keep the test quick (approx 14,400 candles)
    
    console.log(`\n[DATA] Mode: REAL DATA EXTRACTOR`);
    console.log(`[DATA] Target: ${symbol} @ ${interval} | Duration: Last ${daysToFetch} days`);
    
    const outputFilename = path.resolve(__dirname, `../../.data/${symbol}_${interval}_${daysToFetch}d.json`);
    
    // If the file already exists, we can load it instantly instead of re-downloading
    if (fs.existsSync(outputFilename)) {
      console.log(`[DATA] Found cached dataset at ${outputFilename}. Loading into memory...`);
      rawData = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));
    } else {
      const fetcher = new BinanceDataFetcher(symbol, interval);
      const endTimeMs = Date.now();
      const startTimeMs = endTimeMs - (daysToFetch * 24 * 60 * 60 * 1000);
      
      rawData = await fetcher.fetchAndSave(startTimeMs, endTimeMs, outputFilename);
    }
  } else {
    rawData = generateDirtyDataset();
  }

  // Phase 1: Sanitization
  console.log('\n[PHASE 1] Data Sanitization (Extreme Value Theory & Continuous Time)');
  const sanitizer = new HistoricalDataSanitizer({ maxDeltaPct: 0.15, intervalMs: 60000 });
  
  const startSanitization = Date.now();
  const { cleanCandles, tailRiskEvents, gapsFilled } = sanitizer.sanitize(rawData);
  const endSanitization = Date.now();

  console.log(`- Sanitization Time: ${endSanitization - startSanitization}ms`);
  console.log(`- Raw Events Ingested: ${rawData.length}`);
  console.log(`- Temporal Gaps Forward-Filled: ${gapsFilled}`);
  console.log(`- Extreme Tail Risks Winsorized (Capped at 15%): ${tailRiskEvents.length}`);
  console.log(`- Final Clean Event Stream Length: ${cleanCandles.length}`);

  // Phase 2: Event-Sourced Causal Replay
  console.log('\n[PHASE 2] Event-Sourced Causal Replay (The Court Shall Never Learn)');
  const backtester = new EventSourcedBacktester(null); // Mock DB for now
  
  const startReplay = Date.now();
  await backtester.engine.start(); // Initializes engine memory
  const auditTrail = await backtester.run(cleanCandles);
  const endReplay = Date.now();

  console.log(`\n- Replay Time: ${endReplay - startReplay}ms`);
  console.log('===============================================================');
  console.log(' AUDIT TRAIL / BACKTEST RESULTS');
  console.log('===============================================================');
  console.log(JSON.stringify(auditTrail, null, 2));
  console.log(`- Trades Protected by Break-Even: ${auditTrail.breakEvenTrades}`);

  if (auditTrail.tradesExecuted > 0 && parseFloat(auditTrail.totalPnl) > 0) {
    console.log('\n✅ SUCCESS: The backtester survived, Fusion Engine vetoed noise, and ended in profit.');
  } else if (auditTrail.courtGovernance.rejected > 0) {
    console.log('\n⚠️ WARNING: No profitable trades executed, but Court actively protected capital.');
  } else {
    console.log('\n❌ FAILED: Engine collapsed or failed to trade.');
  }
}

run().catch(console.error);

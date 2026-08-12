import fs from 'fs/promises';
import { HistoricalDataSanitizer } from '../HistoricalDataSanitizer.js';
import { EventSourcedBacktester } from '../EventSourcedBacktester.js';
import { db } from '../db.js';

async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1m', limit = 1000) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const response = await fetch(url);
  const data = await response.json();
  
  return data.map(d => ({
    openTime: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));
}

async function runBacktest() {
  console.log("Fetching historical data from Binance...");
  const rawCandles = await fetchBinanceData('BTCUSDT', '1m', 1500); // approx 25 hours
  
  console.log("Sanitizing historical data...");
  const sanitizer = new HistoricalDataSanitizer({ maxDeltaPct: 0.15, intervalMs: 60000 });
  const { cleanCandles, tailRiskEvents, gapsFilled } = sanitizer.sanitize(rawCandles);
  
  console.log(`Sanitization complete. Gaps filled: ${gapsFilled}. Tail risks winsorized: ${tailRiskEvents.length}`);
  
  // Configure environment for TRG, DVF, and LHDS tracking
  process.env.TRG_THRESHOLD = '0.3';
  process.env.CCLIST_DVF_FLOOR = '0.1';
  process.env.LHDS_VETO_LIMIT = '0.8';
  process.env.ARL_MODE = 'SIMULATION';
  
  console.log("Initializing Event Sourced Backtester...");
  const backtester = new EventSourcedBacktester(db);
  
  // Array to hold the HUD data per tick
  const hudHistory = [];
  
  // Intercept the stream engine's 'emit' function to capture 'arl' payloads
  const originalEmit = backtester.engine.emit.bind(backtester.engine);
  backtester.engine.emit = (eventName, payload) => {
      if (eventName === 'arl' && payload && payload.kernel) {
          hudHistory.push({
              time: payload.market?.timestamp || Date.now(),
              symbol: payload.symbol,
              price: payload.market?.price,
              trg: payload.kernel.trg,
              dvf: payload.kernel.dvf,
              lhds: payload.kernel.lhds,
              eef: payload.kernel.eef,
              confidence: payload.kernel.confidence,
              sds: payload.kernel.sds || payload.kernel.scale_divergence_score,
              trade: payload.trade
          });
      }
      originalEmit(eventName, payload);
  };

  console.log("Running backtest...");
  const results = await backtester.run(cleanCandles);
  
  console.log("=== PRELIMINARY BACKTEST RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  console.log(`Saving ${hudHistory.length} HUD records to disk...`);
  await fs.writeFile('backtest_hud_results.json', JSON.stringify(hudHistory, null, 2));
  console.log('Saved to backtest_hud_results.json');
  
  process.exit(0);
}

runBacktest().catch(e => {
    console.error(e);
    process.exit(1);
});

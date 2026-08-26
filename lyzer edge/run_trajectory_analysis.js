import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
process.env.ARL_MODE = 'SIMULATION';
process.env.SHADOW_TRADING_ENABLED = 'false';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';

// Mock console.error to avoid sqlite busy noise
const origErr = console.error;
console.error = function(...args) {
  if (typeof args[0] === 'string' && (args[0].includes('[DB]') || args[0].includes('[CAUSAL_MEMORY]'))) return;
  origErr.apply(console, args);
};

async function loadCandlesFromDb() {
  const db = new sqlite3.Database('historical_causal_memory.db');
  const getCandles = (sym) => new Promise((res, rej) => {
    db.all("SELECT timestamp as openTime, open, high, low, close, volume FROM candles WHERE symbol = ? ORDER BY timestamp ASC", [sym], (err, rows) => {
      if (err) rej(err);
      else res(rows);
    });
  });

  const btc = await getCandles('BTCUSDT');
  const eth = await getCandles('ETHUSDT');
  const sol = await getCandles('SOLUSDT');
  const bnb = await getCandles('BNBUSDT');
  const ada = await getCandles('ADAUSDT');
  const xrp = await getCandles('XRPUSDT');
  db.close();

  return { BTCUSDT: btc, ETHUSDT: eth, SOLUSDT: sol, BNBUSDT: bnb, ADAUSDT: ada, XRPUSDT: xrp };
}

async function runTrajectoryAnalysis() {
  const { StreamEngine } = await import('./backend/streamEngine.js');
  const { ExchangeExecution } = await import('./backend/exchangeExecution.js');

  const candleMap = await loadCandlesFromDb();
  console.log('Candles loaded:');
  for (const [s, c] of Object.entries(candleMap)) {
    console.log(`  ${s}: ${c.length} candles`);
  }

  const allExecutedTrades = [];

  // We want to run StreamEngine for each symbol and track the exact bar-by-bar trajectory for each open trade
  for (const [symbol, candles] of Object.entries(candleMap)) {
    if (candles.length < 500) continue;

    const engine = new StreamEngine({ symbol, mode: 'SIMULATION' });
    engine.execution = new ExchangeExecution('SIMULATION');
    engine.causalMemoryDB = {
      recordTick: async () => {},
      recordState: async () => {},
      recordOrder: async () => {}
    };

    // Warmup
    const warmup = candles.slice(0, 500);
    for (const c of warmup) {
      const tick = { ...c, closed: true };
      engine.updateMtfCandles(tick);
      await engine.processCandle(tick, engine.tickCounter, true);
    }

    // Active tracking
    const activeCandles = candles.slice(500);
    
    // Custom trajectory tracking
    const openTradesTrajectories = new Map(); // posId -> { trade, trajectory: [ { minute, price, mfeR, mfePct, pnlR, pnlPct } ] }

    for (let i = 0; i < activeCandles.length; i++) {
      const candle = activeCandles[i];
      const tick = { ...candle, closed: true };
      engine.tickCounter++;
      engine.updateMtfCandles(tick);

      // Check if position was opened before processCandle or in processCandle
      const posBefore = engine.activePosition ? { ...engine.activePosition } : null;

      await engine.processCandle(tick, engine.tickCounter, false);

      // Track trajectory of current active position
      if (engine.activePosition) {
        const pos = engine.activePosition;
        if (!openTradesTrajectories.has(pos.id)) {
          openTradesTrajectories.set(pos.id, {
            posId: pos.id,
            symbol: pos.symbol,
            direction: pos.direction,
            entryPrice: pos.entryPrice,
            initialStopLoss: pos.initialStopLoss,
            entryIndex: i,
            entryTime: pos.timestamp,
            trajectory: []
          });
        }

        const tracker = openTradesTrajectories.get(pos.id);
        const minute = tracker.trajectory.length + 1;
        const riskDist = Math.abs(pos.entryPrice - pos.initialStopLoss);
        
        let mfePct = 0;
        let mfeR = 0;
        let pnlPct = 0;
        let pnlR = 0;

        if (pos.direction === 'LONG') {
          const high = candle.high;
          const close = candle.close;
          mfePct = (Math.max(pos.peakFavorablePrice || high, high) - pos.entryPrice) / pos.entryPrice;
          mfeR = riskDist > 0 ? (Math.max(pos.peakFavorablePrice || high, high) - pos.entryPrice) / riskDist : 0;
          pnlPct = (close - pos.entryPrice) / pos.entryPrice;
          pnlR = riskDist > 0 ? (close - pos.entryPrice) / riskDist : 0;
        } else {
          const low = candle.low;
          const close = candle.close;
          mfePct = (pos.entryPrice - Math.min(pos.peakFavorablePrice || low, low)) / pos.entryPrice;
          mfeR = riskDist > 0 ? (pos.entryPrice - Math.min(pos.peakFavorablePrice || low, low)) / riskDist : 0;
          pnlPct = (pos.entryPrice - close) / pos.entryPrice;
          pnlR = riskDist > 0 ? (pos.entryPrice - close) / riskDist : 0;
        }

        tracker.trajectory.push({
          minute,
          openTime: candle.openTime,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          mfePct,
          mfeR,
          pnlPct,
          pnlR
        });
      }

      // Check position exit
      engine.checkTickPositionExit(tick);

      // Check if position was closed
      if (posBefore && !engine.activePosition) {
        // Trade closed in this tick
        const lastTrade = engine.tradeHistory[engine.tradeHistory.length - 1];
        if (lastTrade && openTradesTrajectories.has(lastTrade.id)) {
          const tracker = openTradesTrajectories.get(lastTrade.id);
          tracker.finalTrade = lastTrade;
          allExecutedTrades.push(tracker);
        }
      }
    }

    console.log(`Symbol ${symbol}: executed ${engine.tradeHistory.length} trades.`);
  }

  console.log(`\n======================================================`);
  console.log(`TOTAL EXECUTED TRADES RECONSTRUCTED: ${allExecutedTrades.length}`);
  console.log(`======================================================`);

  fs.writeFileSync('trajectory_analysis_raw.json', JSON.stringify(allExecutedTrades, null, 2));
}

runTrajectoryAnalysis().catch(origErr);

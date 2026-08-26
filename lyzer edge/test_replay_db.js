import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
process.env.ARL_MODE = 'SIMULATION';
process.env.SHADOW_TRADING_ENABLED = 'false';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';

async function runReplayOnDbCandles() {
  const { StreamEngine } = await import('./backend/streamEngine.js');
  const { ExchangeExecution } = await import('./backend/exchangeExecution.js');

  const db = new sqlite3.Database('historical_causal_memory.db');
  
  const getCandles = (symbol) => new Promise((resolve, reject) => {
    db.all("SELECT timestamp as openTime, open, high, low, close, volume FROM candles WHERE symbol = ? ORDER BY timestamp ASC", [symbol], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const btcCandles = await getCandles('BTCUSDT');
  console.log(`Loaded ${btcCandles.length} BTCUSDT candles from DB.`);

  const engine = new StreamEngine({ symbol: 'BTCUSDT', mode: 'SIMULATION' });
  engine.execution = new ExchangeExecution('SIMULATION');
  engine.causalMemoryDB = {
    recordTick: async () => {},
    recordState: async () => {},
    recordOrder: async () => {}
  };

  // Warmup
  const warmup = btcCandles.slice(0, 500);
  for (const c of warmup) {
    const tick = { ...c, closed: true };
    engine.updateMtfCandles(tick);
    await engine.processCandle(tick, engine.tickCounter, true);
  }

  engine.ingestor = {
    onTick: (candle) => engine.checkTickPositionExit(candle)
  };

  const active = btcCandles.slice(500);
  for (const c of active) {
    const tick = { ...c, closed: true };
    engine.tickCounter++;
    engine.updateMtfCandles(tick);
    await engine.processCandle(tick, engine.tickCounter, false);
    engine.ingestor.onTick(tick);
  }

  console.log(`BTCUSDT Replay generated ${engine.tradeHistory.length} trades.`);
  db.close();
}

runReplayOnDbCandles().catch(console.error);

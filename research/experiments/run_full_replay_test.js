import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../');

process.env.AUTHORIZATION_STATE = 'AUTHORIZED';
process.env.AUTHORIZED_PROVIDER = 'REC_COMP_INSTITUTIONAL_v1';
process.env.MAX_DAILY_CAPITAL = '150000';
process.env.EXIT_POLICY = 'DYNAMIC_TP';
process.env.TIME_EXIT_MINUTES = '360';
process.env.ATR_SL_MULTIPLIER = '1.0';
process.env.ATR_TP_MULTIPLIER = '2.5';
process.env.FAST_TF = '1h';
process.env.INTERMEDIATE_TF = '1h';
process.env.SLOW_TF = '1h';
process.env.NODE_ENV = 'test';
process.env.COURT_SECRET_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { StreamEngine } from '../../lyzer edge/backend/streamEngine.js';
import { ConstitutionalCourt } from '../../packages/lyzer-constitution/src/eca/court.js';

const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');
const candlesH1 = JSON.parse(readFileSync(h1Path, 'utf8'));
candlesH1.sort((a, b) => a.openTime - b.openTime);

const freshCourt = new ConstitutionalCourt({
  dvfFloor: 0.1,
  stressAccumulation: 0.002,
  lethalIllusionLimit: 0.9,
  stressRelease: 0.1
}, {
  sclThreshold: 3,
  stabilizationWindowMs: 0
});

const engine = new StreamEngine({
  symbol: 'BTCUSDT',
  interval: '1h',
  exitPolicy: 'DYNAMIC_TP',
  timeExitMinutes: 360,
  mode: 'SIMULATION',
  court: freshCourt,
  providerConfigs: {
    v5: {
      lookback: 30,
      volumeZScore: 1.50,
      minPierceATR: 0.50,
      pocProximity: 0.003,
      requireVolume: true,
      requirePierce: true,
      requirePOC: false,
      requireReversal: true
    }
  }
});

engine.startLiveMode = async () => {};
engine.start = async () => {};
engine.startSimulationLoop = () => {};
engine.dualMonitor = { calculateDivergence: async () => 0.05 };

let v5Signals = 0;
let eefTrueCount = 0;
let tradesCount = 0;

for (let i = 0; i < candlesH1.length; i++) {
  const c = candlesH1[i];
  const tickEvent = {
    open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, timestamp: c.openTime, openTime: c.openTime, closed: true
  };
  
  engine.updateMtfCandles(tickEvent);

  if (i >= 100) {
    const v5Res = engine.v5 ? engine.v5.reconstruct(engine.mtfCandles) : null;
    if (v5Res && v5Res.signal !== 'flat') {
      v5Signals++;
    }
    
    await engine.processCandle(tickEvent, i);
  }
}

console.log('='.repeat(90));
console.log(`Replay Finished over ${candlesH1.length.toLocaleString()} candles.`);
console.log(`• V5 Raw Signals Generated: ${v5Signals}`);
console.log(`• Trades Executed Ponta a Ponta: ${engine.tradeHistory.length}`);
console.log(`• Active Position remaining: ${engine.activePosition ? JSON.stringify(engine.activePosition) : 'CLEAN / NONE'}`);
console.log('='.repeat(90));

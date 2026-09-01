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

for (let i = 0; i < 133; i++) {
  const c = candlesH1[i];
  engine.updateMtfCandles({
    open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, timestamp: c.openTime, openTime: c.openTime, closed: true
  });
}

const candle = candlesH1[133];
const tickEvent = {
  open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume, timestamp: candle.openTime, openTime: candle.openTime, closed: true
};
engine.updateMtfCandles(tickEvent);

// Intercept engine components to log their inputs/outputs
const origEval = engine.truthKernel.evaluate.bind(engine.truthKernel);
engine.truthKernel.evaluate = function(p, m) {
  const res = origEval(p, m);
  console.log('[DEBUG TRUTHKERNEL]', res);
  return res;
};

const origCourtReq = engine.court.requestPermission.bind(engine.court);
engine.court.requestPermission = function(action, state, opt) {
  const res = origCourtReq(action, state, opt);
  console.log('[DEBUG COURT REQ]', res);
  return res;
};

await engine.processCandle(tickEvent, 133);
console.log('[FINAL POSITION]', engine.activePosition);

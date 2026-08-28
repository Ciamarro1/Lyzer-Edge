import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetDir = resolve(__dirname, '../datasets');
const candles1h = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_1h_multiyear_2023_2026.json'), 'utf-8'));
const csvPath = resolve(__dirname, '../results/v5_confirmatory/V5_CELL_A_REBUILT_LEDGER.csv');
const rows = readFileSync(csvPath, 'utf-8').trim().split('\n').slice(1).map(l => {
  const parts = l.split(',');
  return {
    tradeId: parseInt(parts[0]),
    timestamp: parseInt(parts[1]),
    dateUtc: parts[2],
    year: parseInt(parts[3]),
    rawEntryPrice: parseFloat(parts[5]),
    trueGrossPnL: parseFloat(parts[14]),
    totalFrictionCost: parseFloat(parts[17]),
    trueNetPnL: parseFloat(parts[18]),
    isNetWin: parts[19] === 'true'
  };
});

// Map timestamp to 1h index
const tsMap = new Map();
candles1h.forEach((c, idx) => tsMap.set(c.openTime, idx));

console.log('='.repeat(80));
console.log('4. REGIME STABILITY AUDIT ACROSS 25 TRADES (GATE F)');
console.log('='.repeat(80));

const regimes = rows.map(t => {
  const idx = tsMap.get(t.timestamp);
  // 1D SMA50 trend (50*24 = 1200 bars 1h)
  const smaPeriod = 1200;
  let trend = 'UNKNOWN';
  if (idx >= smaPeriod) {
    const slice = candles1h.slice(idx - smaPeriod, idx);
    const sma = slice.reduce((s, c) => s + c.close, 0) / smaPeriod;
    trend = candles1h[idx].close > sma ? 'BULL_1D' : 'BEAR_1D';
  } else {
    trend = candles1h[idx].close > candles1h[0].close ? 'BULL_1D' : 'BEAR_1D';
  }

  // 1D Volatility (24h ATR as % of price)
  const slice24 = candles1h.slice(Math.max(0, idx - 24), idx);
  const atr24 = slice24.reduce((s, c) => s + (c.high - c.low), 0) / slice24.length;
  const volPct = (atr24 / candles1h[idx].close) * 100;
  const volRegime = volPct > 0.8 ? 'HIGH_VOL' : 'LOW_VOL';

  return {
    ...t,
    trend,
    volRegime,
    volPct: Number(volPct.toFixed(2))
  };
});

function summarizeRegime(filterFn, label) {
  const subset = regimes.filter(filterFn);
  const n = subset.length;
  if (n === 0) return { label, n: 0, netPnL: 0, pf: 0, wr: 0 };
  const net = subset.reduce((s, t) => s + t.trueNetPnL, 0);
  const wins = subset.filter(t => t.isNetWin);
  const losses = subset.filter(t => !t.isNetWin);
  const wSum = wins.reduce((s, t) => s + t.trueNetPnL, 0);
  const lSum = Math.abs(losses.reduce((s, t) => s + t.trueNetPnL, 0));
  const pf = lSum > 0 ? (wSum / lSum).toFixed(2) : '10.0';
  const wr = ((wins.length / n) * 100).toFixed(1);
  return {
    label,
    n,
    netPnL: Number(net.toFixed(2)),
    netExp: Number((net / n).toFixed(3)),
    pf,
    wr: `${wr}%`
  };
}

const rBull = summarizeRegime(t => t.trend === 'BULL_1D', '1D Bull Trend');
const rBear = summarizeRegime(t => t.trend === 'BEAR_1D', '1D Bear Trend');
const rHighVol = summarizeRegime(t => t.volRegime === 'HIGH_VOL', 'High Volatility (>0.8% ATR/P)');
const rLowVol = summarizeRegime(t => t.volRegime === 'LOW_VOL', 'Low Volatility (<=0.8% ATR/P)');

console.table([rBull, rBear, rHighVol, rLowVol]);

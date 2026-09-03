import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

// Load target assets
const batchDir = path.resolve(rootDir, 'research/datasets/batch039');
const TARGET_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];
const assetData = {};
for (const sym of TARGET_ASSETS) {
  const fpath = path.join(batchDir, `${sym}_1h.json`);
  const raw = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  raw.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  assetData[sym] = raw;
}

// Precompute Indicators
function precomputeAssetIndicators(candles) {
  const n = candles.length;
  const tr = new Float64Array(n);
  const atr12 = new Float64Array(n);
  const atr24 = new Float64Array(n);
  const atr72 = new Float64Array(n);
  const vol24SMA = new Float64Array(n);

  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const cPrev = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
  }

  function computeWilderATR(period, targetArr) {
    let sum = 0;
    for (let i = 0; i < period; i++) sum += tr[i];
    targetArr[period - 1] = sum / period;
    for (let i = period; i < n; i++) {
      targetArr[i] = ((period - 1) * targetArr[i - 1] + tr[i]) / period;
    }
  }

  computeWilderATR(12, atr12);
  computeWilderATR(24, atr24);
  computeWilderATR(72, atr72);

  let volSum = 0;
  for (let i = 0; i < 24; i++) volSum += candles[i].volume;
  vol24SMA[23] = volSum / 24;
  for (let i = 24; i < n; i++) {
    volSum += candles[i].volume - candles[i - 24].volume;
    vol24SMA[i] = volSum / 24;
  }

  const highsK = { 10: new Float64Array(n), 20: new Float64Array(n), 30: new Float64Array(n), 40: new Float64Array(n) };
  const lowsK = { 10: new Float64Array(n), 20: new Float64Array(n), 30: new Float64Array(n), 40: new Float64Array(n) };

  for (const K of [10, 20, 30, 40]) {
    for (let i = K; i < n; i++) {
      let mx = -Infinity;
      let mn = Infinity;
      for (let k = 1; k <= K; k++) {
        const h = candles[i - k].high;
        const l = candles[i - k].low;
        if (h > mx) mx = h;
        if (l < mn) mn = l;
      }
      highsK[K][i] = mx;
      lowsK[K][i] = mn;
    }
  }

  return { tr, atr12, atr24, atr72, vol24SMA, highsK, lowsK };
}

const precomputed = {};
for (const sym of TARGET_ASSETS) {
  precomputed[sym] = precomputeAssetIndicators(assetData[sym]);
}

function simulate(hyp) {
  let pooledTrades = [];
  const theta = hyp.compressionThreshold;
  const K = hyp.breakoutLookback;
  const vMult = hyp.volumeMultiplier;
  const timeoutLimit = 72;
  const slippageBase = 0.0002;
  const totalCostRate = 0.0012;

  for (const sym of TARGET_ASSETS) {
    const candles = assetData[sym];
    const ind = precomputed[sym];
    const n = candles.length;
    let inPosition = false;
    let activeTrade = null;

    for (let t = 72; t < n; t++) {
      if (inPosition) {
        const cBar = candles[t];
        const O = cBar.open, H = cBar.high, L = cBar.low, C = cBar.close;
        activeTrade.holdingHours++;
        let exited = false, grossR = 0, exitType = '';

        if (activeTrade.side === 1) {
          const SL = activeTrade.sl, TP = activeTrade.tp;
          if (O <= SL) {
            grossR = (O - slippageBase * O - activeTrade.entryPrice) / activeTrade.riskR;
            exitType = 'GAP_SL';
            exited = true;
          } else if (O >= TP) {
            grossR = (O - slippageBase * O - activeTrade.entryPrice) / activeTrade.riskR;
            exitType = 'GAP_TP';
            exited = true;
          } else if (L <= SL && H >= TP) {
            grossR = -1.0;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (L <= SL) {
            grossR = -1.0;
            exitType = 'SL';
            exited = true;
          } else if (H >= TP) {
            grossR = 5.0;
            exitType = 'TP';
            exited = true;
          } else if (activeTrade.holdingHours >= timeoutLimit) {
            grossR = (C - slippageBase * C - activeTrade.entryPrice) / activeTrade.riskR;
            exitType = 'TIMEOUT';
            exited = true;
          }
        } else {
          const SL = activeTrade.sl, TP = activeTrade.tp;
          if (O >= SL) {
            grossR = (activeTrade.entryPrice - (O + slippageBase * O)) / activeTrade.riskR;
            exitType = 'GAP_SL';
            exited = true;
          } else if (O <= TP) {
            grossR = (activeTrade.entryPrice - (O + slippageBase * O)) / activeTrade.riskR;
            exitType = 'GAP_TP';
            exited = true;
          } else if (H >= SL && L <= TP) {
            grossR = -1.0;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (H >= SL) {
            grossR = -1.0;
            exitType = 'SL';
            exited = true;
          } else if (L <= TP) {
            grossR = 5.0;
            exitType = 'TP';
            exited = true;
          } else if (activeTrade.holdingHours >= timeoutLimit) {
            grossR = (activeTrade.entryPrice - (C + slippageBase * C)) / activeTrade.riskR;
            exitType = 'TIMEOUT';
            exited = true;
          }
        }

        if (exited) {
          const netR = grossR - activeTrade.costR;
          pooledTrades.push({ netR, exitType, grossR });
          inPosition = false;
          activeTrade = null;
        }
      }

      if (!inPosition && t + 1 < n) {
        const cNow = candles[t].close;
        const atr12 = ind.atr12[t], atr72 = ind.atr72[t], atr24 = ind.atr24[t];
        const volNow = candles[t].volume, volSMA = ind.vol24SMA[t];

        if (atr72 > 1e-8 && volSMA > 1e-8) {
          if (atr12 / atr72 <= theta && volNow >= vMult * volSMA) {
            const isLong = cNow > ind.highsK[K][t] && !(cNow < ind.lowsK[K][t]);
            const isShort = cNow < ind.lowsK[K][t] && !(cNow > ind.highsK[K][t]);
            if (isLong || isShort) {
              const riskR = Math.max(1.5 * atr24, 0.0080 * cNow);
              const costR = (totalCostRate * cNow) / riskR;
              inPosition = true;
              activeTrade = {
                side: isLong ? 1 : -1,
                entryPrice: cNow,
                riskR,
                costR,
                sl: isLong ? cNow - riskR : cNow + riskR,
                tp: isLong ? cNow + 5.0 * riskR : cNow - 5.0 * riskR,
                holdingHours: 0
              };
            }
          }
        }
      }
    }
  }
  return pooledTrades;
}

// PRNG Mulberry32
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Test Candidates
const testConfigs = [
  { id: 'VCB031', compressionThreshold: 0.60, breakoutLookback: 40, volumeMultiplier: 1.75 },
  { id: 'VCB045', compressionThreshold: 0.65, breakoutLookback: 40, volumeMultiplier: 1.25 },
  { id: 'VCB041', compressionThreshold: 0.65, breakoutLookback: 30, volumeMultiplier: 1.25 },
  { id: 'VCB057', compressionThreshold: 0.70, breakoutLookback: 30, volumeMultiplier: 1.25 }
];

console.log('=== COMPARISON OF P-VALUE GENERATION METHODS (B = 10,000) ===\n');

for (const cfg of testConfigs) {
  const trades = simulate(cfg);
  const n = trades.length;
  const netRs = trades.map(t => t.netR);
  const sampleMean = netRs.reduce((a, b) => a + b, 0) / n;
  const variance = netRs.reduce((a, b) => a + Math.pow(b - sampleMean, 2), 0) / (n - 1);
  const se = Math.sqrt(variance / n);
  const tStat = sampleMean / se;

  // 1. Inversion Tail Bootstrap: P*(X* <= 0)
  const B = 10000;
  const rng = mulberry32(12345);
  let inversionCount = 0;
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += netRs[Math.floor(rng() * n)];
    if (sum / n <= 0) inversionCount++;
  }
  const pInversion = (inversionCount + 1) / (B + 1);

  // 2. Centered Null Bootstrap: Y_i = X_i - mean, P*(Y* >= mean)
  const centered = netRs.map(x => x - sampleMean);
  let centeredExceedCount = 0;
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += centered[Math.floor(rng() * n)];
    if (sum / n >= sampleMean) centeredExceedCount++;
  }
  const pCentered = (centeredExceedCount + 1) / (B + 1);

  // 3. Asymptotic Student-t / Normal p-value (one-tailed)
  // Approximation for standard normal upper tail
  function stdNormCDF(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }
  const pAsymptotic = 1 - stdNormCDF(tStat);

  console.log(`Candidate ${cfg.id}: N = ${n}, Mean Net R = ${sampleMean.toFixed(3)}R, SE = ${se.toFixed(3)}, t-stat = ${tStat.toFixed(2)}`);
  console.log(`  1. Inversion Tail P*(X* <= 0):       p = ${pInversion.toFixed(4)}`);
  console.log(`  2. Centered Null P*(Y* >= Mean):    p = ${pCentered.toFixed(4)}`);
  console.log(`  3. Asymptotic Standard Upper Tail:  p = ${pAsymptotic.toFixed(4)}`);
  console.log('');
}

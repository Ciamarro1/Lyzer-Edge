import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import os from 'os';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from './frozenConfig.js';
import { runReconciliationTask } from './workers/reconciliationWorker.js';
import { getDatasetSnapshot } from './datasetSnapshot.js';
import { computeATR } from './causalSignalEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getFileSha256(filePath) {
  if (!existsSync(filePath)) return 'FILE_NOT_FOUND';
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

// ============================================================================
// STATISTICAL REPERTOIRE (WILCOXON, OLS REGRESSION, SPEARMAN, ETC)
// ============================================================================

function normalCDF(z) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values) {
  if (!values || values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentile(values, p) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function getRanks(arr) {
  const indexed = arr.map((v, i) => ({ val: v, idx: i })).sort((a, b) => a.val - b.val);
  const ranks = new Array(arr.length);
  for (let i = 0; i < indexed.length; i++) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].val === indexed[i].val) j++;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks[indexed[k].idx] = avgRank;
    i = j;
  }
  return ranks;
}

function wilcoxonSignedRankTest(differences) {
  const absDiffs = differences.filter(d => d !== 0).map(d => ({ diff: d, abs: Math.abs(d) }));
  absDiffs.sort((a, b) => a.abs - b.abs);
  const ranks = getRanks(absDiffs.map(d => d.abs));
  let wPlus = 0, wMinus = 0;
  for (let i = 0; i < absDiffs.length; i++) {
    if (absDiffs[i].diff > 0) wPlus += ranks[i];
    else wMinus += ranks[i];
  }
  const n = absDiffs.length;
  if (n < 10) return { W: 0, z: 0, p: 1.0, wPlus, wMinus, n, medianDiff: median(differences) };
  const W = Math.min(wPlus, wMinus);
  const meanW = n * (n + 1) / 4;
  const stdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const z = stdW > 0 ? (W - meanW) / stdW : 0;
  const p = 2 * normalCDF(z);
  return { wPlus, wMinus, W, z, p, n, medianDiff: median(differences) };
}

function spearmanRankCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const rankX = getRanks(x);
  const rankY = getRanks(y);
  let dSqSum = 0;
  for (let i = 0; i < n; i++) {
    dSqSum += Math.pow(rankX[i] - rankY[i], 2);
  }
  return 1 - (6 * dSqSum) / (n * (n * n - 1));
}

function calculateEMA(candles, period) {
  if (!candles || candles.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

function invertMatrix(M) {
  const n = M.length;
  const A = M.map(row => Array.from(row));
  const I = Array.from({ length: n }, (_, i) => {
    const r = new Float64Array(n);
    r[i] = 1;
    return r;
  });

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
    const tempI = I[i]; I[i] = I[maxRow]; I[maxRow] = tempI;

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-12) return null;

    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < n; j++) {
          A[k][j] -= factor * A[i][j];
          I[k][j] -= factor * I[i][j];
        }
      }
    }
  }
  return I;
}

function multipleLinearRegression(y, X) {
  const N = X.length;
  const K = X[0].length;
  const XtX = Array.from({ length: K }, () => new Float64Array(K));
  const Xty = new Float64Array(K);

  for (let i = 0; i < N; i++) {
    const row = X[i];
    const yi = y[i];
    for (let j = 0; j < K; j++) {
      Xty[j] += row[j] * yi;
      for (let l = j; l < K; l++) {
        XtX[j][l] += row[j] * row[l];
      }
    }
  }
  for (let j = 0; j < K; j++) {
    for (let l = 0; l < j; l++) {
      XtX[j][l] = XtX[l][j];
    }
  }

  const invXtX = invertMatrix(XtX);
  if (!invXtX) return null;

  const beta = new Float64Array(K);
  for (let j = 0; j < K; j++) {
    for (let l = 0; l < K; l++) {
      beta[j] += invXtX[j][l] * Xty[l];
    }
  }

  let rss = 0;
  for (let i = 0; i < N; i++) {
    let yHat = 0;
    for (let j = 0; j < K; j++) yHat += X[i][j] * beta[j];
    rss += Math.pow(y[i] - yHat, 2);
  }
  const dof = N - K;
  const sigmaSq = rss / dof;

  const se = new Float64Array(K);
  const tStats = new Float64Array(K);
  const pValues = new Float64Array(K);

  for (let j = 0; j < K; j++) {
    const varBeta = sigmaSq * invXtX[j][j];
    se[j] = varBeta > 0 ? Math.sqrt(varBeta) : 0;
    tStats[j] = se[j] > 0 ? beta[j] / se[j] : 0;
    pValues[j] = 2 * (1 - normalCDF(Math.abs(tStats[j])));
  }

  return { beta: Array.from(beta), se: Array.from(se), tStats: Array.from(tStats), pValues: Array.from(pValues), sigmaSq, N, dof };
}

// ============================================================================
// MAIN BATCH 008B AUDIT SUITE
// ============================================================================

async function runBatch008BDipBuyFormalization() {
  const t0 = performance.now();

  console.log('='.repeat(110));
  console.log('🏛️  LYZER EDGE — BATCH 008B: V8.1-DIPBUY FORMALIZATION');
  console.log('   Research Question: Does Bearish Displacement carry statistically significant residual alpha for Long Reversions?');
  console.log('='.repeat(110));
  console.log(`Hardware: \${os.cpus().length} Cores (\${os.cpus()[0]?.model || 'Intel'}) | Total RAM: \${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`);

  const DIPBUY_PRE_REGISTRATION = Object.freeze({
    id: 'V8.1-DIPBUY-BEARISH-REVERSION',
    direction: 'LONG',
    triggerEvent: 'Bearish Displacement',
    triggerCriteria: Object.freeze({
      magnitudeAtr: 2.0,    
      bodyRatio: 0.65,      
      rangeAtr: 1.8,        
      direction: 'bearish'  
    }),
    entryTiming: 'close_t6', 
    holdingBars: 24,         
    extendedHorizon: 66,     
    takerFeePct: 0.0008,     
    epistemicStatus: 'HYPOTHESIS' 
  });

  // --- Gate 0.0 Load Dataset ---
  const { candles, funding, hashes } = getDatasetSnapshot();
  console.log(`Dataset: \${candles.length} Hourly Candles | SHA-256: \${hashes.candles1hSha256.slice(0, 16)}...`);

  // --- Gate 0.5 Track A Forensic Pre-Check ---
  const frozenConfigPath = resolve(__dirname, 'frozenConfig.js');
  const lockboxPath = resolve(__dirname, '../results/v5_confirmatory/V5_SHADOW_LOCKBOX.json');
  const hashConfigBefore = getFileSha256(frozenConfigPath);
  const hashLockboxBefore = getFileSha256(lockboxPath);
  const v5Baseline = await runReconciliationTask();

  const reportPayload = {
    executionTimestamp: new Date().toISOString(),
    datasetSha256: hashes.candles1hSha256,
    gates: {}
  };

  // Precompute features
  console.log('\\n⚡ Extracting features for 32,016 candles...');
  const timeline = [];
  const lookbackBuffer = [];
  const WARMUP = 48;
  const MAX_HORIZON = 72; 

  let sumAtr = 0;
  let countAtr = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    lookbackBuffer.push(c);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();
    if (i < WARMUP || lookbackBuffer.length < 30) {
      timeline.push(null);
      continue;
    }

    const atr = computeATR(lookbackBuffer, 14) || (c.high - c.low);
    sumAtr += atr;
    countAtr++;

    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    const bodyRatio = range > 0 ? body / range : 0;
    const magnitudeAtr = atr > 0 ? body / atr : 0;
    const rangeAtr = atr > 0 ? range / atr : 0;
    const isBearCandle = c.close < c.open;

    const isBearishDisplacement = magnitudeAtr >= 2.0 && bodyRatio >= 0.65 && rangeAtr >= 1.8 && isBearCandle;

    const lookback50 = lookbackBuffer.slice(-50);
    const ema20 = calculateEMA(lookback50, 20);
    const ema50 = calculateEMA(lookback50, 50);
    
    let trend = 0; // 0 = choppy, 1 = bull, -1 = bear
    if (ema20 > ema50 * 1.002) trend = 1;
    else if (ema50 > ema20 * 1.002) trend = -1;

    const hour = new Date(c.openTime).getUTCHours();
    let session = 'ASIAN';
    if (hour >= 8 && hour < 14) session = 'LONDON';
    else if (hour >= 14 && hour < 21) session = 'NEW_YORK';

    timeline.push({
      index: i,
      candle: c,
      atr,
      range,
      body,
      bodyRatio,
      magnitudeAtr,
      rangeAtr,
      isBearCandle,
      isBearishDisplacement,
      trend,
      session
    });
  }

  const meanDatasetAtr = countAtr > 0 ? sumAtr / countAtr : 1;
  const activeEnd = candles.length - MAX_HORIZON - 2;

  // ========================================================================
  // [GATE 1] BEARISH DISPLACEMENT CENSUS
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 1] BEARISH DISPLACEMENT EVENT CENSUS');
  console.log('─'.repeat(110));

  const bearishDispEvents = [];
  for (let i = WARMUP; i < activeEnd; i++) {
    const item = timeline[i];
    if (item && item.isBearishDisplacement) bearishDispEvents.push(item);
  }

  const nDisp = bearishDispEvents.length;
  const totalCandles = activeEnd - WARMUP;
  const pctCandles = (nDisp / totalCandles) * 100;
  
  const magAtrs = bearishDispEvents.map(e => e.magnitudeAtr);
  const magMean = mean(magAtrs);
  const magMed = median(magAtrs);
  const magStd = stdDev(magAtrs);
  const eventsPerYear = nDisp / (totalCandles / (24 * 365));

  console.log(`   * Total Bearish Displacement Events : \${nDisp}`);
  console.log(`   * Percentage of Total Candles       : \${pctCandles.toFixed(2)}%`);
  console.log(`   * Temporal Distribution             : \${eventsPerYear.toFixed(1)} events/year`);
  console.log(`   * Magnitude (Body/ATR)              : Mean = \${magMean.toFixed(2)}, Median = \${magMed.toFixed(2)}, StdDev = \${magStd.toFixed(2)}`);

  reportPayload.gates.gate1Census = {
    totalEvents: nDisp,
    pctCandles: Number(pctCandles.toFixed(2)),
    eventsPerYear: Number(eventsPerYear.toFixed(1)),
    magnitudeMean: Number(magMean.toFixed(2)),
    magnitudeMedian: Number(magMed.toFixed(2)),
    magnitudeStdDev: Number(magStd.toFixed(2))
  };

  // ========================================================================
  // [GATE 2] OLS RESIDUAL REGRESSION
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 2] OLS RESIDUAL REGRESSION');
  console.log('─'.repeat(110));

  const regY = [];
  const regX = [];

  for (let i = WARMUP; i < activeEnd; i++) {
    const item = timeline[i];
    if (!item) continue;
    
    // t+6 entry, 24 bars hold -> exit at i+7+24
    if (i + 7 + 24 >= candles.length) continue;
    
    const entry = candles[i + 7].open;
    const exit24 = candles[i + 7 + 24].close;
    const y = (exit24 - entry) / entry;

    regY.push(y);
    regX.push([
      1.0, 
      item.atr / meanDatasetAtr, 
      item.trend, 
      item.session === 'NEW_YORK' ? 1.0 : 0.0, 
      item.session === 'LONDON' ? 1.0 : 0.0, 
      item.isBearishDisplacement ? 1.0 : 0.0 
    ]);
  }

  const ols = multipleLinearRegression(regY, regX);
  const betaNames = ['Intercept', 'Volatility (ATR)', 'Trend Alignment', 'NY Session', 'London Session', 'Bearish Displacement'];

  console.log(`   -------------------------------------------------------------------------------------`);
  console.log(`   VARIABLE                        COEF (β)        STD ERROR       t-STAT          p-VALUE`);
  console.log(`   -------------------------------------------------------------------------------------`);
  for (let k = 0; k < betaNames.length; k++) {
    const b = ols.beta[k];
    const s = ols.se[k];
    const t = ols.tStats[k];
    const p = ols.pValues[k];
    console.log(`   \${betaNames[k].padEnd(30)}: \${(b * 100).toFixed(4)}%      \${(s * 100).toFixed(4)}%      \${t.toFixed(3).padStart(7)}         \${p.toFixed(5)} \${p < 0.05 ? '🟢' : ''}`);
  }
  
  const betaDisp = ols.beta[5];
  const pDisp = ols.pValues[5];
  const gate2Passed = betaDisp > 0 && pDisp < 0.05;
  console.log(`   * Gate 2 Verdict: \${gate2Passed ? '🟢 PASSED' : '🔴 FAILED'}`);

  reportPayload.gates.gate2OLS = {
    coefficients: betaNames.map((name, idx) => ({ name, betaPct: Number((ols.beta[idx] * 100).toFixed(4)), sePct: Number((ols.se[idx] * 100).toFixed(4)), tStat: Number(ols.tStats[idx].toFixed(3)), pValue: Number(ols.pValues[idx].toFixed(5)) })),
    betaDisplacementPct: Number((betaDisp * 100).toFixed(4)),
    pDisplacement: Number(pDisp.toFixed(5)),
    passed: gate2Passed
  };

  // ========================================================================
  // [GATE 3] DOSE-RESPONSE MONOTONICITY
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 3] DOSE-RESPONSE MONOTONICITY');
  console.log('─'.repeat(110));

  const buckets = [
    { label: 'Bucket 1: Body/ATR < 1.0 (control)', min: 0.0, max: 1.0, rets: [] },
    { label: 'Bucket 2: Body/ATR 1.0 - 1.5 (mild)', min: 1.0, max: 1.5, rets: [] },
    { label: 'Bucket 3: Body/ATR 1.5 - 2.0 (mod)', min: 1.5, max: 2.0, rets: [] },
    { label: 'Bucket 4: Body/ATR 2.0 - 2.5 (strong)', min: 2.0, max: 2.5, rets: [] },
    { label: 'Bucket 5: Body/ATR 2.5 - 3.0 (v.strong)', min: 2.5, max: 3.0, rets: [] },
    { label: 'Bucket 6: Body/ATR >= 3.0 (extreme)', min: 3.0, max: Infinity, rets: [] }
  ];

  for (let i = WARMUP; i < activeEnd; i++) {
    const item = timeline[i];
    if (!item || !item.isBearCandle) continue;
    if (i + 7 + 24 >= candles.length) continue;

    const entry = candles[i + 7].open;
    const exit24 = candles[i + 7 + 24].close;
    const y = (exit24 - entry) / entry;
    
    for (const b of buckets) {
      if (item.magnitudeAtr >= b.min && item.magnitudeAtr < b.max) {
        b.rets.push(y);
        break;
      }
    }
  }

  const bucketTable = [];
  const meanRetsArray = [];
  const bucketRanks = [1, 2, 3, 4, 5, 6];

  for (const b of buckets) {
    const n = b.rets.length;
    const m = mean(b.rets);
    meanRetsArray.push(m);
    bucketTable.push({ label: b.label, n, meanPct: Number((m * 100).toFixed(4)) });
    console.log(`   \${b.label.padEnd(42)}: N=\${String(n).padEnd(5)} | Mean: \${(m * 100).toFixed(4)}%`);
  }

  const spearmanRho = spearmanRankCorrelation(bucketRanks, meanRetsArray);
  const gate3Passed = spearmanRho >= 0.70;
  console.log(`   * Spearman Rho: \${spearmanRho.toFixed(3)} | Verdict: \${gate3Passed ? '🟢 PASSED' : '🔴 FAILED'}`);

  reportPayload.gates.gate3DoseResponse = { buckets: bucketTable, spearmanRho: Number(spearmanRho.toFixed(3)), passed: gate3Passed };

  // ========================================================================
  // [GATE 4] MATCHED-PAIRS WILCOXON
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 4] MATCHED-PAIRS WILCOXON');
  console.log('─'.repeat(110));

  const pairedDifferences = [];
  let matchedCount = 0;

  for (const disp of bearishDispEvents) {
    let bestMatch = null;
    let minDistance = Infinity;

    for (let j = Math.max(WARMUP, disp.index - 250); j <= Math.min(activeEnd, disp.index + 250); j++) {
      if (j === disp.index) continue;
      const other = timeline[j];
      if (!other || other.isBearishDisplacement || !other.isBearCandle) continue;
      if (other.session !== disp.session) continue;
      if (other.trend !== disp.trend) continue;
      if (Math.abs(other.atr - disp.atr) / disp.atr > 0.15) continue;

      const dist = Math.abs(j - disp.index);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = other;
      }
    }

    if (bestMatch && disp.index + 7 + 24 < candles.length && bestMatch.index + 7 + 24 < candles.length) {
      const entryDisp = candles[disp.index + 7].open;
      const exitDisp = candles[disp.index + 7 + 24].close;
      const retDisp = (exitDisp - entryDisp) / entryDisp;

      const entryMatch = candles[bestMatch.index + 7].open;
      const exitMatch = candles[bestMatch.index + 7 + 24].close;
      const retMatch = (exitMatch - entryMatch) / entryMatch;

      pairedDifferences.push(retDisp - retMatch);
      matchedCount++;
    }
  }

  const wilcoxonRes = wilcoxonSignedRankTest(pairedDifferences);
  const gate4Passed = wilcoxonRes.p < 0.05 && wilcoxonRes.medianDiff > 0;
  console.log(`   * Matched Pairs N = \${matchedCount}`);
  console.log(`   * Median Paired Difference : \${(wilcoxonRes.medianDiff * 100).toFixed(4)}%`);
  console.log(`   * Wilcoxon p-value         : \${wilcoxonRes.p.toFixed(5)}`);
  console.log(`   * Verdict                  : \${gate4Passed ? '🟢 PASSED' : '🔴 FAILED'}`);

  reportPayload.gates.gate4MatchedPairs = { n: matchedCount, medianDiffPct: Number((wilcoxonRes.medianDiff * 100).toFixed(4)), pValue: Number(wilcoxonRes.p.toFixed(5)), passed: gate4Passed };

  // ========================================================================
  // [GATE 5] REGIME CONDITIONING
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 5] REGIME CONDITIONING');
  console.log('─'.repeat(110));

  const regimes = [
    { name: 'Bull Trend', val: 1, rets: [] },
    { name: 'Bear Trend', val: -1, rets: [] },
    { name: 'Choppy', val: 0, rets: [] }
  ];

  for (const disp of bearishDispEvents) {
    if (disp.index + 7 + 24 >= candles.length) continue;
    const entry = candles[disp.index + 7].open;
    const exit24 = candles[disp.index + 7 + 24].close;
    const ret = (exit24 - entry) / entry;
    const r = regimes.find(x => x.val === disp.trend);
    if (r) r.rets.push(ret);
  }

  const regimeTable = [];
  for (const r of regimes) {
    const n = r.rets.length;
    const m = mean(r.rets);
    const wr = n > 0 ? (r.rets.filter(x => x > 0).length / n) * 100 : 0;
    const wins = r.rets.filter(x => x > 0).reduce((s, x) => s + x, 0);
    const losses = Math.abs(r.rets.filter(x => x <= 0).reduce((s, x) => s + x, 0));
    const pf = losses > 0 ? wins / losses : (wins > 0 ? 10.0 : 0.0);
    regimeTable.push({ regime: r.name, n, meanPct: Number((m * 100).toFixed(4)), wrPct: Number(wr.toFixed(1)), pf: Number(pf.toFixed(2)) });
    console.log(`   \${r.name.padEnd(15)}: N=\${String(n).padEnd(4)} | Mean: \${(m * 100).toFixed(4)}% | WR: \${wr.toFixed(1)}% | PF: \${pf.toFixed(2)}`);
  }
  reportPayload.gates.gate5Regimes = { regimes: regimeTable };

  // ========================================================================
  // [GATE 6] EXECUTION MECHANICS
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 6] EXECUTION MECHANICS');
  console.log('─'.repeat(110));

  const horizons = [24, 66]; // extended to 66 for t+72 overall
  const mechanicsTable = [];
  const FEE = DIPBUY_PRE_REGISTRATION.takerFeePct;

  for (const h of horizons) {
    const rets = [];
    const mfes = [];
    const maes = [];

    for (const disp of bearishDispEvents) {
      if (disp.index + 7 + h >= candles.length) continue;
      const entry = candles[disp.index + 7].open;
      const exit = candles[disp.index + 7 + h].close;
      const gross = (exit - entry) / entry;
      const net = gross - FEE;
      rets.push({ gross, net });

      let maxFav = 0;
      let maxAdv = 0;
      for (let b = disp.index + 7; b <= disp.index + 7 + h; b++) {
        const cb = candles[b];
        const fav = (cb.high - entry) / entry;
        const adv = (entry - cb.low) / entry;
        if (fav > maxFav) maxFav = fav;
        if (adv > maxAdv) maxAdv = adv;
      }
      mfes.push(maxFav);
      maes.push(maxAdv);
    }

    const n = rets.length;
    const meanG = mean(rets.map(r => r.gross));
    const meanN = mean(rets.map(r => r.net));
    const medN = median(rets.map(r => r.net));
    const wr = n > 0 ? (rets.filter(r => r.net > 0).length / n) * 100 : 0;
    
    const wins = rets.filter(r => r.net > 0).reduce((s, r) => s + r.net, 0);
    const losses = Math.abs(rets.filter(r => r.net <= 0).reduce((s, r) => s + r.net, 0));
    const pf = losses > 0 ? wins / losses : (wins > 0 ? 10.0 : 0.0);

    const mMFE = mean(mfes);
    const mMAE = mean(maes);

    mechanicsTable.push({ horizon: h, n, grossPct: Number((meanG * 100).toFixed(4)), netPct: Number((meanN * 100).toFixed(4)), medianPct: Number((medN * 100).toFixed(4)), wrPct: Number(wr.toFixed(1)), pf: Number(pf.toFixed(2)), mfePct: Number((mMFE * 100).toFixed(4)), maePct: Number((mMAE * 100).toFixed(4)) });
    
    console.log(`   Horizon \${h} bars: N=\${n} | Net Mean: \${(meanN * 100).toFixed(4)}% | WR: \${wr.toFixed(1)}% | PF: \${pf.toFixed(2)} | MFE: \${(mMFE * 100).toFixed(4)}% | MAE: -\${(mMAE * 100).toFixed(4)}%`);
  }
  reportPayload.gates.gate6Mechanics = { horizons: mechanicsTable };

  // ========================================================================
  // [GATE 7] 10-WINDOW WFA
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 7] 10-WINDOW WFA (t+6 entry, 24h hold)');
  console.log('─'.repeat(110));

  const NUM_WINDOWS = 10;
  const totalActiveBars = activeEnd - WARMUP;
  const windowSize = Math.floor(totalActiveBars / NUM_WINDOWS);
  const wfaResults = [];

  for (let w = 0; w < NUM_WINDOWS; w++) {
    const wStart = WARMUP + w * windowSize;
    const wEnd = w === NUM_WINDOWS - 1 ? activeEnd : WARMUP + (w + 1) * windowSize;
    
    const rets = [];
    for (let i = wStart; i < wEnd; i++) {
      const item = timeline[i];
      if (item && item.isBearishDisplacement && i + 7 + 24 < candles.length) {
        const entry = candles[i + 7].open;
        const exit = candles[i + 7 + 24].close;
        rets.push(((exit - entry) / entry) - FEE);
      }
    }

    const n = rets.length;
    const m = mean(rets);
    const wr = n > 0 ? (rets.filter(r => r > 0).length / n) * 100 : 0;
    wfaResults.push({ window: w + 1, n, netPct: Number((m * 100).toFixed(4)), wrPct: Number(wr.toFixed(1)) });
    console.log(`   Window \${w + 1}: N=\${n.toString().padEnd(3)} | Net Mean: \${(m * 100).toFixed(4)}% | WR: \${wr.toFixed(1)}%`);
  }
  reportPayload.gates.gate7WFA = { windows: wfaResults };

  // ========================================================================
  // [GATE 8] FRICTION LADDER
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 8] FRICTION LADDER');
  console.log('─'.repeat(110));

  const frictionTiers = [0.00, 0.05, 0.08, 0.10, 0.15, 0.25];
  const grossAll = [];
  for (const disp of bearishDispEvents) {
    if (disp.index + 7 + 24 < candles.length) {
      const entry = candles[disp.index + 7].open;
      const exit = candles[disp.index + 7 + 24].close;
      grossAll.push((exit - entry) / entry);
    }
  }

  const frictionTable = [];
  for (const tPct of frictionTiers) {
    const fee = tPct / 100;
    const net = grossAll.map(g => g - fee);
    const m = mean(net);
    const wr = (net.filter(r => r > 0).length / net.length) * 100;
    const wins = net.filter(r => r > 0).reduce((s, r) => s + r, 0);
    const losses = Math.abs(net.filter(r => r <= 0).reduce((s, r) => s + r, 0));
    const pf = losses > 0 ? wins / losses : (wins > 0 ? 10.0 : 0.0);
    frictionTable.push({ tierPct: tPct, meanNetPct: Number((m * 100).toFixed(4)), wrPct: Number(wr.toFixed(1)), pf: Number(pf.toFixed(2)) });
    console.log(`   Fee \${tPct.toFixed(2)}%: Net Mean = \${(m * 100).toFixed(4)}% | WR = \${wr.toFixed(1)}% | PF = \${pf.toFixed(2)}`);
  }
  
  const breakeven = mean(grossAll) * 100;
  console.log(`   * Breakeven Fee: \${breakeven.toFixed(4)}%`);
  reportPayload.gates.gate8Friction = { ladder: frictionTable, breakevenPct: Number(breakeven.toFixed(4)) };

  // ========================================================================
  // [GATE 9] MONTE CARLO PERMUTATION 10K
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 9] MONTE CARLO PERMUTATION 10K (Null Universe: All Bearish Candles)');
  console.log('─'.repeat(110));

  const nullUniverse = [];
  for (let i = WARMUP; i < activeEnd; i++) {
    const item = timeline[i];
    if (item && item.isBearCandle && i + 7 + 24 < candles.length) {
      const entry = candles[i + 7].open;
      const exit = candles[i + 7 + 24].close;
      nullUniverse.push(((exit - entry) / entry) - FEE);
    }
  }

  const N_SAMPLE = grossAll.length;
  let countBeat = 0;
  const OBSERVED_NET_MEAN = mean(grossAll) - FEE;
  
  // Calculate PF for observed to compare, wait prompt says "Compute PF... compute empirical p-value"
  // Let's use PF
  const obsWins = grossAll.map(g => g - FEE).filter(r => r > 0).reduce((s, r) => s + r, 0);
  const obsLosses = Math.abs(grossAll.map(g => g - FEE).filter(r => r <= 0).reduce((s, r) => s + r, 0));
  const OBS_PF = obsLosses > 0 ? obsWins / obsLosses : 10.0;

  for (let k = 0; k < 10000; k++) {
    const sample = [];
    for (let j = 0; j < N_SAMPLE; j++) {
      sample.push(nullUniverse[Math.floor(Math.random() * nullUniverse.length)]);
    }
    const wins = sample.filter(r => r > 0).reduce((s, r) => s + r, 0);
    const losses = Math.abs(sample.filter(r => r <= 0).reduce((s, r) => s + r, 0));
    const pf = losses > 0 ? wins / losses : 10.0;
    if (pf >= OBS_PF) countBeat++;
  }

  const pValPerm = countBeat / 10000;
  const gate9Passed = pValPerm < 0.01;
  console.log(`   * Observed PF: \${OBS_PF.toFixed(2)} | Permutation p-value: \${pValPerm.toFixed(5)}`);
  console.log(`   * Verdict: \${gate9Passed ? '🟢 PASSED' : '🔴 FAILED'}`);

  reportPayload.gates.gate9Permutation = { observedPF: Number(OBS_PF.toFixed(2)), pValue: pValPerm, passed: gate9Passed };

  // ========================================================================
  // [GATE 10] TRACK A RE-AUDIT
  // ========================================================================
  console.log('\\n' + '─'.repeat(110));
  console.log('▸ [GATE 10] TRACK A FORENSIC ISOLATION RE-AUDIT');
  console.log('─'.repeat(110));

  const hashConfigAfter = getFileSha256(frozenConfigPath);
  const hashLockboxAfter = getFileSha256(lockboxPath);
  const v5BaselinePost = await runReconciliationTask();

  const isConfigPostIntact = hashConfigBefore === hashConfigAfter;
  const isLockboxPostIntact = hashLockboxBefore === hashLockboxAfter;
  const isReplayPostIntact = v5BaselinePost && v5BaselinePost.gateA_AccountingStatus === 'PASS';

  console.log(`   1. Frozen V5 Config SHA-256 : \${isConfigPostIntact ? '🟢 100% UNTOUCHED' : '🔴 DRIFT'}`);
  console.log(`   2. Shadow Lockbox SHA-256   : \${isLockboxPostIntact ? '🟢 100% UNTOUCHED' : '🔴 DRIFT'}`);
  console.log(`   3. V5 Baseline Replay Match : \${isReplayPostIntact ? '🟢 100% EXACT MATCH' : '🔴 DRIFT'}`);

  reportPayload.gates.gate10TrackA = {
    isConfigIntact: isConfigPostIntact,
    isLockboxIntact: isLockboxPostIntact,
    isReplayIntact: isReplayPostIntact
  };

  const allGatesPassed = gate2Passed && gate3Passed && gate4Passed && gate9Passed; // Just an epistemic marker

  // ========================================================================
  // OUTPUT GENERATION
  // ========================================================================
  const t1 = performance.now();
  const elapsedSec = ((t1 - t0) / 1000).toFixed(1);
  reportPayload.elapsedSec = elapsedSec;

  const resultsDir = resolve(__dirname, '../results/v5_confirmatory');
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  const mdContent = `# 🏛️ LYZER EDGE — BATCH 008B: V8.1-DIPBUY FORMALIZATION REPORT
**Execution Date:** ${reportPayload.executionTimestamp}  
**Elapsed Time:** ${elapsedSec}s  
**Dataset SHA-256:** \`${reportPayload.datasetSha256}\`  
**Epistemic Status:** HYPOTHESIS

## SUMMARY
This batch tests the hypothesis that Bearish Displacement events carry predictive residual alpha for long reversion starting at t+6 and held for 24 hours.

**Verdict:** ${allGatesPassed ? 'Effect CONFIRMED. Proceed to Batch 009 for operationalization.' : 'Effect NOT CONFIRMED. Hypothesis archived.'}

## DETAILED GATE RESULTS
- **Gate 1 (Census):** N=${nDisp} (${pctCandles.toFixed(2)}%)
- **Gate 2 (OLS):** β=${(betaDisp * 100).toFixed(4)}% (p=${pDisp.toFixed(5)}) - ${gate2Passed ? 'PASS' : 'FAIL'}
- **Gate 3 (Dose-Response):** Rho=${spearmanRho.toFixed(3)} - ${gate3Passed ? 'PASS' : 'FAIL'}
- **Gate 4 (Wilcoxon):** p=${wilcoxonRes.p.toFixed(5)}, Median=${(wilcoxonRes.medianDiff * 100).toFixed(4)}% - ${gate4Passed ? 'PASS' : 'FAIL'}
- **Gate 9 (Permutation):** PF=${OBS_PF.toFixed(2)}, p=${pValPerm.toFixed(5)} - ${gate9Passed ? 'PASS' : 'FAIL'}
`;

  writeFileSync(resolve(resultsDir, 'BATCH_008B_DIPBUY_FORMALIZATION_REPORT.md'), mdContent);
  writeFileSync(resolve(resultsDir, 'BATCH_008B_DIPBUY_FORMALIZATION_MANIFEST.json'), JSON.stringify(reportPayload, null, 2));

  console.log('\\n' + '='.repeat(110));
  console.log(`🏁 BATCH 008B COMPLETE — Executed in \${elapsedSec}s`);
  console.log('='.repeat(110));
}

export { runBatch008BDipBuyFormalization };

// Self-execute when run directly
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  runBatch008BDipBuyFormalization().catch(err => {
    console.error('FATAL BATCH 008B ERROR:', err);
    process.exit(1);
  });
}

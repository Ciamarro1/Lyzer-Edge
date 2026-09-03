/**
 * OFI-CONFIRMATION-SETUP-001 — CONFIRMATORY EXECUTION ENGINE
 * Script: run_confirmatory_test.js
 * 
 * Strict Protocol: CUMULATIVE_OFI_FROZEN_SPEC (v2.1)
 * Population: Historical Untouched Replication Set (2020-01-01 to 2022-12-31)
 * Evaluation: Single Deterministic Fail-Closed Pass
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('================================================================');
console.log('⚡ OFI001 — CONFIRMATORY EXECUTION ENGINE');
console.log('Population: Historical Untouched Replication Set [2020-01-01 -> 2022-12-31]');
console.log('Timestamp UTC:', new Date().toISOString());
console.log('================================================================\n');

// 1. Check V8 Engine Invariance
const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
const engineBuf = fs.readFileSync(enginePath);
const engineSHA = crypto.createHash('sha256').update(engineBuf).digest('hex');
const expectedSHA = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';

console.log('1. Verifying V8 Engine Hash:');
console.log('   SHA-256:', engineSHA);
if (engineSHA !== expectedSHA) {
  console.error('❌ CONSTITUTIONAL BREACH: V8 engine hash mismatch! Execution aborted.');
  process.exit(1);
}
console.log('   ✔ V8 Engine 100% Frozen & Untouched.\n');

// PRNG: Mulberry32 for deterministic replication
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Statistical Functions
function mean(arr) {
  if (arr.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function std(arr, ddof = 1) {
  if (arr.length <= ddof) return 0;
  const m = mean(arr);
  let ss = 0;
  for (let i = 0; i < arr.length; i++) ss += Math.pow(arr[i] - m, 2);
  return Math.sqrt(ss / (arr.length - ddof));
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pearsonCorr(x, y) {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, sx = 0, sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const den = Math.sqrt(sx * sy);
  return den === 0 ? 0 : num / den;
}

// Newey-West HAC covariance for 1D mean and for OLS regression
function neweyWestMeanSE(x, maxLag = 5) {
  const n = x.length;
  if (n <= 1) return 0;
  const m = mean(x);
  const e = x.map(v => v - m);
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += e[i] * e[i];
  gamma0 /= n;

  let v = gamma0;
  for (let l = 1; l <= maxLag; l++) {
    const w = 1.0 - l / (maxLag + 1);
    let gammaL = 0;
    for (let i = l; i < n; i++) gammaL += e[i] * e[i - l];
    gammaL /= n;
    v += 2.0 * w * gammaL;
  }
  return Math.sqrt(Math.max(1e-12, v) / n);
}

// Standard OLS with Newey-West standard errors: Y = X * beta + e
function olsNeweyWest(Xmat, y, maxLag = 5) {
  // Xmat: array of arrays [N, K]
  const n = y.length;
  const k = Xmat[0].length;

  // Compute X'X and X'y
  const XtX = Array.from({ length: k }, () => new Float64Array(k));
  const Xty = new Float64Array(k);

  for (let i = 0; i < n; i++) {
    const row = Xmat[i];
    const yi = y[i];
    for (let p = 0; p < k; p++) {
      Xty[p] += row[p] * yi;
      for (let q = 0; q < k; q++) {
        XtX[p][q] += row[p] * row[q];
      }
    }
  }

  // Invert XtX (Gauss-Jordan for small k <= 3)
  const A = XtX.map((row, r) => {
    const res = Array(k * 2).fill(0);
    for (let c = 0; c < k; c++) res[c] = row[c];
    res[k + r] = 1;
    return res;
  });

  for (let c = 0; c < k; c++) {
    let pivot = c;
    for (let r = c + 1; r < k; r++) {
      if (Math.abs(A[r][c]) > Math.abs(A[pivot][c])) pivot = r;
    }
    const temp = A[c]; A[c] = A[pivot]; A[pivot] = temp;
    const diag = A[c][c];
    if (Math.abs(diag) < 1e-15) throw new Error('Singular matrix in OLS');
    for (let j = 0; j < k * 2; j++) A[c][j] /= diag;
    for (let r = 0; r < k; r++) {
      if (r !== c) {
        const factor = A[r][c];
        for (let j = 0; j < k * 2; j++) A[r][j] -= factor * A[c][j];
      }
    }
  }

  const XtX_inv = A.map(row => row.slice(k));

  // beta = (X'X)^-1 * X'y
  const beta = new Float64Array(k);
  for (let p = 0; p < k; p++) {
    for (let q = 0; q < k; q++) {
      beta[p] += XtX_inv[p][q] * Xty[q];
    }
  }

  // Residuals e
  const e = new Float64Array(n);
  let ssRes = 0, ssTot = 0;
  const my = mean(y);
  for (let i = 0; i < n; i++) {
    let yHat = 0;
    for (let p = 0; p < k; p++) yHat += Xmat[i][p] * beta[p];
    e[i] = y[i] - yHat;
    ssRes += e[i] * e[i];
    ssTot += Math.pow(y[i] - my, 2);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Newey-West HAC covariance: V = (X'X)^-1 * S * (X'X)^-1
  // S = S0 + sum_{l=1}^L w_l (Sl + Sl')
  // S_l = sum_{i=l+1}^n (e_i * x_i) * (e_{i-l} * x_{i-l})'
  const S = Array.from({ length: k }, () => new Float64Array(k));

  for (let i = 0; i < n; i++) {
    const ei = e[i];
    const xi = Xmat[i];
    for (let p = 0; p < k; p++) {
      for (let q = 0; q < k; q++) {
        S[p][q] += (ei * xi[p]) * (ei * xi[q]);
      }
    }
  }

  for (let l = 1; l <= maxLag; l++) {
    const w = 1.0 - l / (maxLag + 1);
    for (let i = l; i < n; i++) {
      const ei = e[i], eil = e[i - l];
      const xi = Xmat[i], xil = Xmat[i - l];
      for (let p = 0; p < k; p++) {
        for (let q = 0; q < k; q++) {
          const cross = (ei * xi[p]) * (eil * xil[q]) + (eil * xi[q]) * (ei * xil[p]);
          S[p][q] += w * cross;
        }
      }
    }
  }

  // V = XtX_inv * S * XtX_inv
  const tempMat = Array.from({ length: k }, () => new Float64Array(k));
  for (let p = 0; p < k; p++) {
    for (let q = 0; q < k; q++) {
      for (let m = 0; m < k; m++) tempMat[p][q] += XtX_inv[p][m] * S[m][q];
    }
  }
  const V = Array.from({ length: k }, () => new Float64Array(k));
  for (let p = 0; p < k; p++) {
    for (let q = 0; q < k; q++) {
      for (let m = 0; m < k; m++) V[p][q] += tempMat[p][m] * XtX_inv[m][q];
    }
  }

  const se = Array.from({ length: k }, (_, p) => Math.sqrt(Math.max(1e-12, V[p][p])));
  const tStat = Array.from({ length: k }, (_, p) => beta[p] / se[p]);

  return { beta: Array.from(beta), se, tStat, r2 };
}

// Block Permutation Test implementation
function runBlockPermutation(x, y, blockSize, numPerms = 1000, seed = 424242) {
  const n = x.length;
  const observedIC = pearsonCorr(x, y);

  // Divide x into blocks
  const blocks = [];
  for (let i = 0; i < n; i += blockSize) {
    blocks.push(x.slice(i, Math.min(n, i + blockSize)));
  }
  const numBlocks = blocks.length;

  const rng = mulberry32(seed);
  const nullICs = new Float64Array(numPerms);
  let extremeCount = 0;

  for (let m = 0; m < numPerms; m++) {
    // Fisher-Yates shuffle on block indices
    const indices = Array.from({ length: numBlocks }, (_, idx) => idx);
    for (let i = numBlocks - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = indices[i]; indices[i] = indices[j]; indices[j] = temp;
    }

    // Reconstruct permuted x
    const permX = [];
    for (let b = 0; b < numBlocks; b++) {
      const blk = blocks[indices[b]];
      for (let c = 0; c < blk.length; c++) permX.push(blk[c]);
    }

    const ic = pearsonCorr(permX, y);
    nullICs[m] = ic;
    if (Math.abs(ic) >= Math.abs(observedIC)) {
      extremeCount++;
    }
  }

  const pValue = (1 + extremeCount) / (numPerms + 1);
  return {
    blockSize,
    numBlocks,
    numPerms,
    observedIC,
    pValue,
    nullMean: mean(nullICs),
    nullStd: std(nullICs)
  };
}

// Pipeline evaluation for a single asset
export function evaluateAsset(symbol, candleData) {
  console.log(`\n================================================================`);
  console.log(`🔍 EVALUATING ASSET: ${symbol}`);
  console.log(`================================================================`);
  console.log(`Candles loaded: ${candleData.length.toLocaleString()} rows`);

  // Compute hourly OFI
  const hourlyOFI = new Float64Array(candleData.length);
  for (let i = 0; i < candleData.length; i++) {
    const c = candleData[i];
    const totalVol = c.volume;
    const takerBuy = c.taker_buy_volume;
    const takerSell = Math.max(0, totalVol - takerBuy);
    if (totalVol > 1e-8) {
      hourlyOFI[i] = (takerBuy - takerSell) / (takerBuy + takerSell);
    } else {
      hourlyOFI[i] = 0;
    }
  }

  // Evaluation points: strictly non-overlapping 24h at 00:00 UTC
  // L = 6h, H = 24h
  const L = 6;
  const H = 24;

  const obsPoints = [];
  for (let i = L; i + H < candleData.length; i++) {
    const c = candleData[i];
    const d = new Date(c.timestamp);
    // 00:00 UTC check
    if (d.getUTCHours() === 0) {
      // Ensure step is 24h from previous
      if (obsPoints.length === 0 || (c.timestamp - obsPoints[obsPoints.length - 1].timestamp) >= 24 * 3600000) {
        obsPoints.push({ index: i, timestamp: c.timestamp, dateUTC: d.toISOString().slice(0, 10) });
      }
    }
  }

  const N = obsPoints.length;
  console.log(`Non-overlapping daily evaluation points (N): ${N} days`);

  const featCumOFI = new Float64Array(N);
  const forwardRet24h = new Float64Array(N);
  const pastPriceRet6h = new Float64Array(N);
  const signals = new Int8Array(N);
  const trades = [];

  for (let i = 0; i < N; i++) {
    const idx = obsPoints[i].index;

    // CumOFI(6h) = (1/6) * sum_{k=0}^5 OFI_{idx-k}
    let sumOFI = 0;
    for (let k = 0; k < L; k++) sumOFI += hourlyOFI[idx - k];
    featCumOFI[i] = sumOFI / L;

    // Past price return over 6h: ln(Close_idx / Close_{idx-6})
    const cNow = candleData[idx].close;
    const cPast = candleData[idx - L].close;
    pastPriceRet6h[i] = Math.log(cNow / cPast);

    // Forward return over 24h: ln(Close_{idx+24} / Close_idx)
    const cFwd = candleData[idx + H].close;
    forwardRet24h[i] = Math.log(cFwd / cNow);

    // Directional signal s_t
    let s = 0;
    if (featCumOFI[i] > 0.05) s = 1;
    else if (featCumOFI[i] < -0.05) s = -1;
    signals[i] = s;

    if (s !== 0) {
      const grossRet = s * forwardRet24h[i];
      const netRet10bps = grossRet - 0.0010;
      trades.push({
        date: obsPoints[i].dateUTC,
        signal: s,
        grossRet,
        netRet10bps,
        cumOFI: featCumOFI[i],
        forwardRet: forwardRet24h[i]
      });
    }
  }

  // 1. Primary Metric: Pearson IC
  const primaryIC = pearsonCorr(featCumOFI, forwardRet24h);
  console.log(`\n1. Pearson IC (${symbol} L=6h, H=24h, N=${N}): ${primaryIC >= 0 ? '+' : ''}${primaryIC.toFixed(4)}`);

  // 2. Primary Statistical Test: Block Permutation Test (B=10)
  console.log(`\n2. Running Block Permutation Tests (Primary B=10 & Sensitivity Grid)...`);
  const blockPermPrimary = runBlockPermutation(featCumOFI, forwardRet24h, 10, 1000, 424242);
  const blockPerm5 = runBlockPermutation(featCumOFI, forwardRet24h, 5, 1000, 424242);
  const blockPerm20 = runBlockPermutation(featCumOFI, forwardRet24h, 20, 1000, 424242);
  const blockPerm30 = runBlockPermutation(featCumOFI, forwardRet24h, 30, 1000, 424242);

  console.log(`   ★ Primary Block B=10: p-value = ${blockPermPrimary.pValue.toFixed(4)} (Null Mean: ${blockPermPrimary.nullMean.toFixed(4)}, Null Std: ${blockPermPrimary.nullStd.toFixed(4)})`);
  console.log(`   - Sensitivity B=5:   p-value = ${blockPerm5.pValue.toFixed(4)}`);
  console.log(`   - Sensitivity B=20:  p-value = ${blockPerm20.pValue.toFixed(4)}`);
  console.log(`   - Sensitivity B=30:  p-value = ${blockPerm30.pValue.toFixed(4)}`);

  // 3. Newey-West HAC Regression for IC
  // Regress standardized Y on standardized X
  const meanX = mean(featCumOFI), stdX = std(featCumOFI);
  const meanY = mean(forwardRet24h), stdY = std(forwardRet24h);
  const zX = featCumOFI.map(v => (v - meanX) / stdX);
  const zY = forwardRet24h.map(v => (v - meanY) / stdY);
  const X_ic = zX.map(v => [1.0, v]);
  const olsIC = olsNeweyWest(X_ic, zY, 5);
  const tStatHAC = olsIC.tStat[1];
  console.log(`\n3. Newey-West HAC t-statistic (L=5): ${tStatHAC.toFixed(2)}`);

  // 4. Incremental Information Model (Model 0 vs Model 1)
  console.log(`\n4. Running Incremental Information Models...`);
  // Model 0: Y = alpha0 + beta_price * PastPriceRet + eps
  const X_mod0 = pastPriceRet6h.map(v => [1.0, v]);
  const mod0 = olsNeweyWest(X_mod0, forwardRet24h, 5);

  // Model 1: Y = alpha1 + beta_price * PastPriceRet + beta_OFI * CumOFI + eta
  const X_mod1 = Array.from({ length: N }, (_, i) => [1.0, pastPriceRet6h[i], featCumOFI[i]]);
  const mod1 = olsNeweyWest(X_mod1, forwardRet24h, 5);

  const betaPriceMod0 = mod0.beta[1];
  const betaPriceMod1 = mod1.beta[1];
  const betaOFI = mod1.beta[2];
  const seOFI = mod1.se[2];
  const tOFI = mod1.tStat[2];
  const deltaR2 = mod1.r2 - mod0.r2;

  console.log(`   Model 0 (Price Only): R^2 = ${(mod0.r2 * 100).toFixed(3)}%, beta_price = ${betaPriceMod0.toFixed(4)}`);
  console.log(`   Model 1 (Price + OFI): R^2 = ${(mod1.r2 * 100).toFixed(3)}%, Delta R^2 = ${(deltaR2 * 100).toFixed(3)}%`);
  console.log(`   ★ beta_OFI = ${betaOFI.toFixed(4)}, SE = ${seOFI.toFixed(4)}, t_HAC = ${tOFI.toFixed(2)}`);

  // 5. Economic Trade Performance
  const numTrades = trades.length;
  console.log(`\n5. Economic Trade Execution Evaluation:`);
  console.log(`   Total trades executed (|CumOFI| > 0.05): ${numTrades} (${((numTrades / N) * 100).toFixed(1)}% of days)`);

  const netRets10bps = trades.map(t => t.netRet10bps);
  const grossRets = trades.map(t => t.grossRet);
  const meanNetRet10bps = mean(netRets10bps);
  const seNetRetHAC = neweyWestMeanSE(netRets10bps, 5);
  const medianNetRet = median(netRets10bps);
  const winTrades = trades.filter(t => t.netRet10bps > 0);
  const hitRate = (winTrades.length / numTrades) * 100;

  const totalWins = winTrades.reduce((acc, t) => acc + t.netRet10bps, 0);
  const lossTrades = trades.filter(t => t.netRet10bps <= 0);
  const totalLosses = Math.abs(lossTrades.reduce((acc, t) => acc + t.netRet10bps, 0));
  const profitFactor = totalLosses === 0 ? Infinity : totalWins / totalLosses;

  // Cost sensitivity curve
  const costCurve = [0, 5, 10, 15, 20, 25, 30].map(bps => {
    const fric = bps / 10000;
    const rets = trades.map(t => t.grossRet - fric);
    return {
      frictionBps: bps,
      meanNetBps: Number((mean(rets) * 10000).toFixed(2)),
      hitRate: Number(((rets.filter(r => r > 0).length / numTrades) * 100).toFixed(1))
    };
  });

  const meanNetBps = meanNetRet10bps * 10000;
  const ciLowerBps = (meanNetRet10bps - 1.96 * seNetRetHAC) * 10000;
  const ciUpperBps = (meanNetRet10bps + 1.96 * seNetRetHAC) * 10000;

  console.log(`   ★ Mean Net Return per Trade (10 bps friction): ${meanNetBps >= 0 ? '+' : ''}${meanNetBps.toFixed(2)} bps`);
  console.log(`     95% HAC Confidence Interval: [${ciLowerBps.toFixed(2)} bps, ${ciUpperBps.toFixed(2)} bps]`);
  console.log(`     Median Net Return: ${(medianNetRet * 10000).toFixed(2)} bps`);
  console.log(`     Hit Rate: ${hitRate.toFixed(1)}%`);
  console.log(`     Profit Factor: ${profitFactor.toFixed(2)}`);

  return {
    symbol,
    sampleSizeN: N,
    primaryIC: Number(primaryIC.toFixed(4)),
    tStatHAC: Number(tStatHAC.toFixed(2)),
    blockPermutation: {
      primaryB10: blockPermPrimary,
      sensitivityB5: blockPerm5,
      sensitivityB20: blockPerm20,
      sensitivityB30: blockPerm30
    },
    incrementalModel: {
      model0_R2: Number(mod0.r2.toFixed(5)),
      model1_R2: Number(mod1.r2.toFixed(5)),
      deltaR2: Number(deltaR2.toFixed(5)),
      betaOFI: Number(betaOFI.toFixed(4)),
      seOFI: Number(seOFI.toFixed(4)),
      tStatOFI: Number(tOFI.toFixed(2))
    },
    economics: {
      numTrades,
      tradeFrequencyPct: Number(((numTrades / N) * 100).toFixed(1)),
      meanNetBps: Number(meanNetBps.toFixed(2)),
      ci95LowerBps: Number(ciLowerBps.toFixed(2)),
      ci95UpperBps: Number(ciUpperBps.toFixed(2)),
      medianNetBps: Number((medianNetRet * 10000).toFixed(2)),
      hitRatePct: Number(hitRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      costCurve
    }
  };
}

export function runFullConfirmatorySuite() {
  const dataDir = path.resolve(__dirname, '../untouched_data');
  const btcFile = path.join(dataDir, 'BTCUSDT_historical_untouched_2020_2022.json');
  const ethFile = path.join(dataDir, 'ETHUSDT_historical_untouched_2020_2022.json');

  if (!fs.existsSync(btcFile) || !fs.existsSync(ethFile)) {
    console.error('❌ Confirmatory data files not found in untouched_data directory!');
    process.exit(1);
  }

  const btcCandles = JSON.parse(fs.readFileSync(btcFile, 'utf8'));
  const ethCandles = JSON.parse(fs.readFileSync(ethFile, 'utf8'));

  const btcResults = evaluateAsset('BTCUSDT', btcCandles);
  const ethResults = evaluateAsset('ETHUSDT', ethCandles);

  // Evaluate Strict PASS / FAIL Criteria
  console.log('\n================================================================');
  console.log('🏛️ CONSTITUTIONAL GATE AUDIT & VERDICT');
  console.log('================================================================');

  const criteria = [
    {
      id: 'CRIT-1',
      name: 'Primary Linear Correlation (BTC IC >= +0.020)',
      required: 'IC >= +0.020',
      observed: `IC = ${btcResults.primaryIC >= 0 ? '+' : ''}${btcResults.primaryIC}`,
      pass: btcResults.primaryIC >= 0.020
    },
    {
      id: 'CRIT-2',
      name: 'Non-Parametric Significance (Primary Block B=10 p < 0.05)',
      required: 'p < 0.05',
      observed: `p = ${btcResults.blockPermutation.primaryB10.pValue.toFixed(4)}`,
      pass: btcResults.blockPermutation.primaryB10.pValue < 0.05
    },
    {
      id: 'CRIT-3',
      name: 'Newey-West HAC Significance (t > 1.96)',
      required: 't > 1.96',
      observed: `t = ${btcResults.tStatHAC}`,
      pass: btcResults.tStatHAC > 1.96
    },
    {
      id: 'CRIT-4',
      name: 'Sample Mean Net Return per Trade (>= +5.0 bps after 10 bps friction)',
      required: 'Net Return >= +5.0 bps',
      observed: `Net Return = ${btcResults.economics.meanNetBps >= 0 ? '+' : ''}${btcResults.economics.meanNetBps} bps`,
      pass: btcResults.economics.meanNetBps >= 5.0
    },
    {
      id: 'CRIT-5',
      name: 'Incremental Information over Price Momentum (beta_OFI > 0 and t > 1.96)',
      required: 'beta_OFI > 0, t > 1.96',
      observed: `beta = ${btcResults.incrementalModel.betaOFI}, t = ${btcResults.incrementalModel.tStatOFI}`,
      pass: btcResults.incrementalModel.betaOFI > 0 && btcResults.incrementalModel.tStatOFI > 1.96
    },
    {
      id: 'CRIT-6',
      name: 'Direct Replication Consistency (ETH IC > 0)',
      required: 'ETH IC > 0',
      observed: `ETH IC = ${ethResults.primaryIC >= 0 ? '+' : ''}${ethResults.primaryIC}`,
      pass: ethResults.primaryIC > 0
    }
  ];

  let allPass = true;
  for (const c of criteria) {
    const status = c.pass ? '✅ PASS' : '❌ FAIL';
    if (!c.pass) allPass = false;
    console.log(`[${c.id}] ${c.name.padEnd(65)}: ${status} (Obs: ${c.observed})`);
  }

  const overallVerdict = allPass ? 'PASS (CONFIRMED HISTORICAL REPLICATION)' : 'FAIL (FALSIFIED ON HISTORICAL REPLICATION SET)';
  console.log(`\nFINAL CONSTITUTIONAL VERDICT: ${overallVerdict}`);
  console.log('================================================================\n');

  // Persist Reports and Raw Results
  const resultsDir = path.resolve(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const rawResults = {
    program: 'OFI-CONFIRMATION-SETUP-001',
    executionTimestampUTC: new Date().toISOString(),
    populationType: 'Historical Untouched Replication Set (2020-01-01 to 2022-12-31)',
    engineFrozenSHA256: expectedSHA,
    overallVerdict,
    criteria,
    btcResults,
    ethResults
  };

  fs.writeFileSync(path.join(resultsDir, 'confirmatory_raw_results.json'), JSON.stringify(rawResults, null, 2));

  // Generate Reports
  fs.writeFileSync(path.join(resultsDir, 'BTC_PRIMARY_CONFIRMATION_REPORT.md'), generateAssetReport('BTCUSDT', btcResults, true));
  fs.writeFileSync(path.join(resultsDir, 'ETH_REPLICATION_REPORT.md'), generateAssetReport('ETHUSDT', ethResults, false));
  fs.writeFileSync(path.join(resultsDir, 'CONFIRMATORY_VERDICT.md'), generateVerdictReport(overallVerdict, criteria, btcResults, ethResults));

  console.log('✔ Results and formal reports persisted in research/alpha_confirmation/OFI001/results/');
}

function generateAssetReport(symbol, res, isPrimary) {
  return `# ${symbol} — ${isPrimary ? 'Primary Confirmatory Evaluation' : 'Direct Replication Evaluation'} Report
**Audit Program**: \`OFI-CONFIRMATION-SETUP-001\`  
**Dataset**: Historical Untouched Replication Set (\`2020-01-01\` to \`2022-12-31\`)  
**Sample Size ($N$)**: ${res.sampleSizeN} non-overlapping daily observations  
**Role**: ${isPrimary ? 'Central Hypothesis Test (BTC L6/H24)' : 'Direct Cross-Asset Replication (ETH L6/H24)'}  

---

## 1. Linear Correlation & Primary Permutation Test

| Metric | Observed Value | Pre-Registered Threshold | Status |
|---|:---:|:---:|:---:|
| **Pearson IC** | **${res.primaryIC >= 0 ? '+' : ''}${res.primaryIC}** | $\\ge +0.020$ | ${res.primaryIC >= 0.020 ? '✅ PASS' : '❌ FAIL'} |
| **Primary Block Permutation ($B=10$)** | **$p = ${res.blockPermutation.primaryB10.pValue.toFixed(4)}$** | $< 0.05$ | ${res.blockPermutation.primaryB10.pValue < 0.05 ? '✅ PASS' : '❌ FAIL'} |
| **Newey-West HAC $t$-statistic** | **$t = ${res.tStatHAC}$** | $> 1.96$ | ${res.tStatHAC > 1.96 ? '✅ PASS' : '❌ FAIL'} |

### Diagnostic Sensitivity Grid for Block Length ($B$)
- **Block $B = 5$ days**: $p = ${res.blockPermutation.sensitivityB5.pValue.toFixed(4)}$
- **Block $B = 10$ days (Primary)**: **$p = ${res.blockPermutation.primaryB10.pValue.toFixed(4)}$**
- **Block $B = 20$ days**: $p = ${res.blockPermutation.sensitivityB20.pValue.toFixed(4)}$
- **Block $B = 30$ days**: $p = ${res.blockPermutation.sensitivityB30.pValue.toFixed(4)}$

---

## 2. Incremental Information Model (Model 0 vs Model 1)

$$\\text{Model 0 (Price Momentum Only): } R_{t, t+24h} = \\alpha_0 + \\beta_{\\text{price}} R_{t-6h, t} + \\epsilon_t$$
$$\\text{Model 1 (Price + OFI): } R_{t, t+24h} = \\alpha_1 + \\beta_{\\text{price}} R_{t-6h, t} + \\beta_{\\text{OFI}} \\text{CumOFI}_t(6h) + \\eta_t$$

- **Model 0 $R^2$**: ${(res.incrementalModel.model0_R2 * 100).toFixed(3)}\\%$
- **Model 1 $R^2$**: ${(res.incrementalModel.model1_R2 * 100).toFixed(3)}\\%$
- **Incremental $\\Delta R^2$**: ${(res.incrementalModel.deltaR2 * 100).toFixed(3)}\\%$
- **$\\beta_{\\text{OFI}}$**: **${res.incrementalModel.betaOFI}** (SE: ${res.incrementalModel.seOFI}, $t_{\\text{HAC}} = ${res.incrementalModel.tStatOFI}$)
- **Status**: ${res.incrementalModel.betaOFI > 0 && res.incrementalModel.tStatOFI > 1.96 ? '✅ INCREMENTAL INFORMATION CONFIRMED' : '❌ NO INCREMENTAL INFORMATION'}

---

## 3. Economic Execution & Cost Curve

- **Total Trades (|CumOFI| > 0.05)**: ${res.economics.numTrades} (${res.economics.tradeFrequencyPct}% of sample)
- **Arithmetic Mean Net Return per Trade**: **${res.economics.meanNetBps >= 0 ? '+' : ''}${res.economics.meanNetBps} bps**
- **95% HAC Confidence Interval**: [${res.economics.ci95LowerBps} bps, ${res.economics.ci95UpperBps} bps]
- **Median Net Return**: ${res.economics.medianNetBps} bps
- **Hit Rate**: ${res.economics.hitRatePct}%
- **Profit Factor**: ${res.economics.profitFactor}

### Cost Sensitivity Table
| Friction (bps round-trip) | Mean Net Return per Trade (bps) | Hit Rate (%) |
|:---:|:---:|:---:|
${res.economics.costCurve.map(c => `| ${c.frictionBps} bps | ${c.meanNetBps >= 0 ? '+' : ''}${c.meanNetBps} bps | ${c.hitRate}% |`).join('\n')}
`;
}

function generateVerdictReport(verdict, criteria, btc, eth) {
  return `# OFI-CONFIRMATION-SETUP-001 — Relatório Constitucional de Veredito Final

**Veredito Oficial**: **${verdict}**  
**Data da Execução**: \`${new Date().toISOString()}\`  
**População de Teste**: Historical Untouched Replication Set (\`2020-01-01\` a \`2022-12-31\`)  
**SHA-256 do Motor V8**: \`${expectedSHA}\` (**INTACTO**)  

---

## 1. Tabela Constitucional de Critérios Inegociáveis

| ID | Critério Pré-Registrado | Valor Observado | Limiar Exigido | Veredito |
|---|---|:---:|:---:|:---:|
${criteria.map(c => `| **${c.id}** | ${c.name} | **${c.observed}** | ${c.required} | ${c.pass ? '✅ **PASS**' : '❌ **FAIL**'} |`).join('\n')}

---

## 2. Síntese Epistêmica

O candidato exploratório **BTC L6/H24**, descoberto originalmente na mineração de 2023–2026, foi testado sob a especificação congelada contra a população intocada de 2020–2022 ($N = ${btc.sampleSizeN}$ dias não sobrepostos).

- **Resultado Primário (BTC)**:
  - Pearson $IC = ${btc.primaryIC >= 0 ? '+' : ''}${btc.primaryIC}$ (Newey-West $t = ${btc.tStatHAC}$).
  - Permutação em Blocos ($B=10$): $p = ${btc.blockPermutation.primaryB10.pValue.toFixed(4)}$.
  - Retorno Líquido Médio por Trade (10 bps de custo): ${btc.economics.meanNetBps >= 0 ? '+' : ''}${btc.economics.meanNetBps} bps.
  - Modelo Incremental: $\\beta_{\\text{OFI}} = ${btc.incrementalModel.betaOFI}$ ($t = ${btc.incrementalModel.tStatOFI}$).

- **Replicação Direta (ETH)**:
  - Pearson $IC = ${eth.primaryIC >= 0 ? '+' : ''}${eth.primaryIC}$ ($t = ${eth.tStatHAC}$).
  - Permutação em Blocos ($B=10$): $p = ${eth.blockPermutation.primaryB10.pValue.toFixed(4)}$.

---

## 3. Conclusão Institucional

A decisão sobre o candidato segue a regra de parada constitucional:
**Veredito Final**: \`${verdict}\`.
`;
}

// Run if directly called
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runFullConfirmatorySuite();
}

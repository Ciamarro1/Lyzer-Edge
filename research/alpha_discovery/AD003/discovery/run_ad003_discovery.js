/**
 * AD003 DISCOVERY SIMULATION RUNNER & BASIN TOPOLOGY ENGINE
 * Script: run_ad003_discovery.js
 * 
 * Formal Mandate:
 * 1. Evaluates all 40 hypotheses (TSD001-TSD040) across 6 core assets.
 * 2. Discovery period strictly 2023-01-01 to 2024-12-31 (ZERO access to 2025-2026).
 * 3. 14-day UTC calendar block bootstrap (B=10,000, seed=888888, trade-weighted).
 * 4. Benjamini-Yekutieli (BY, 2001) FDR correction for arbitrary dependence.
 * 5. Minimum sample size N >= 60 observed eligible trades.
 * 6. Deterministic topological basin and medoid discovery via TSD_40_ADJACENCY_GRAPH.json.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

// Mulberry32 deterministic PRNG
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Precompute Indicators: Wilder RMA ATR, Volume SMA, Rolling Extremes
export function precomputeIndicators(candles, maxK = 192) {
  const n = candles.length;
  const tr = new Float64Array(n);
  const atr12 = new Float64Array(n);
  const atr24 = new Float64Array(n);
  const atr72 = new Float64Array(n);
  const vol24SMA = new Float64Array(n);

  if (n === 0) return { tr, atr12, atr24, atr72, vol24SMA };

  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const cPrev = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
  }

  function computeWilderATR(period, targetArr) {
    if (n < period) return;
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

  // 24-period Volume SMA: strictly over [t-24, t-1], NEVER including bar t
  if (n >= 25) {
    let volSum = 0;
    for (let i = 0; i < 24; i++) volSum += candles[i].volume;
    vol24SMA[24] = volSum / 24;
    for (let i = 25; i < n; i++) {
      volSum += candles[i - 1].volume - candles[i - 25].volume;
      vol24SMA[i] = volSum / 24;
    }
  }

  return { tr, atr12, atr24, atr72, vol24SMA };
}

// Compute rolling extremes for a specific K lookback
export function computeRollingExtremes(candles, K) {
  const n = candles.length;
  const highs = new Float64Array(n);
  const lows = new Float64Array(n);

  for (let i = K; i < n; i++) {
    let mx = -Infinity;
    let mn = Infinity;
    for (let k = 1; k <= K; k++) {
      const h = candles[i - k].high;
      const l = candles[i - k].low;
      if (h > mx) mx = h;
      if (l < mn) mn = l;
    }
    highs[i] = mx;
    lows[i] = mn;
  }
  return { highs, lows };
}

// Simulate single asset under AD003 rules
export function simulateAssetAD003(candles, ind, extremes, hyp, symbol) {
  const n = candles.length;
  const theta = hyp.compressionThresholdTheta;
  const vMult = hyp.volumeMultiplier;
  const timeoutLimit = hyp.timeoutBars;

  const exchangeFeeRate = 0.0010; // 10 bps
  const slippageBaseRate = 0.0002; // 2 bps
  const totalCostNormalRate = 0.0012; // 12 bps all-in

  const trades = [];
  let infeasibleCount = 0;
  let inPosition = false;
  let activeTrade = null;

  const warmup = Math.max(72, hyp.breakoutLookbackK + 1);

  for (let t = warmup; t < n; t++) {
    if (inPosition) {
      const cBar = candles[t];
      const O = cBar.open;
      const H = cBar.high;
      const L = cBar.low;
      const C = cBar.close;

      activeTrade.holdingBars++;
      let exited = false;
      let netR = 0;
      let exitType = '';
      let exitPrice = 0;

      if (activeTrade.side === 1) { // LONG
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        if (O <= SL) {
          exitPrice = O - slippageBaseRate * O;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O >= TP) {
          exitPrice = O - slippageBaseRate * O;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          const touchesSL = L <= SL;
          const touchesTP = H >= TP;

          if (touchesSL && touchesTP) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            netR = 5.0 - activeTrade.costRNormal;
            exitPrice = TP;
            exitType = 'TP';
            exited = true;
          }
        }

        if (!exited && activeTrade.holdingBars >= timeoutLimit) {
          exitPrice = C - slippageBaseRate * C;
          const grossR = (exitPrice - activeTrade.entryPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'TIMEOUT';
          exited = true;
        }

      } else { // SHORT
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        if (O >= SL) {
          exitPrice = O + slippageBaseRate * O;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O <= TP) {
          exitPrice = O + slippageBaseRate * O;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          const touchesSL = H >= SL;
          const touchesTP = L <= TP;

          if (touchesSL && touchesTP) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            netR = -1.0 - activeTrade.costRNormal;
            exitPrice = SL;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            netR = 5.0 - activeTrade.costRNormal;
            exitPrice = TP;
            exitType = 'TP';
            exited = true;
          }
        }

        if (!exited && activeTrade.holdingBars >= timeoutLimit) {
          exitPrice = C + slippageBaseRate * C;
          const grossR = (activeTrade.entryPrice - exitPrice) / activeTrade.riskR;
          const feeR = (exchangeFeeRate * activeTrade.entryPrice) / activeTrade.riskR;
          netR = grossR - feeR;
          exitType = 'TIMEOUT';
          exited = true;
        }
      }

      if (exited) {
        trades.push({
          symbol,
          entryTime: activeTrade.entryTime,
          exitTime: candles[t].timestamp,
          side: activeTrade.side,
          holdingBars: activeTrade.holdingBars,
          exitType,
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          riskR: activeTrade.riskR,
          netR
        });
        inPosition = false;
        activeTrade = null;
      }
    }

    // Evaluation strictly at Close of bar t (monitoring strictly from t+1)
    if (!inPosition && t + 1 < n) {
      const cNow = candles[t].close;
      const atr12 = ind.atr12[t];
      const atr72 = ind.atr72[t];
      const atr24 = ind.atr24[t];
      const volNow = candles[t].volume;
      const volSMA = ind.vol24SMA[t];

      if (atr72 > 1e-8 && volSMA > 1e-8) {
        const ratioVol = atr12 / atr72;
        const volExp = volNow >= vMult * volSMA;
        const isLongBreak = cNow > extremes.highs[t];
        const isShortBreak = cNow < extremes.lows[t];

        if (ratioVol <= theta && volExp) {
          let side = 0;
          if (isLongBreak && !isShortBreak) side = 1;
          else if (isShortBreak && !isLongBreak) side = -1;

          if (side !== 0) {
            // FEASIBILITY FILTER (Pilar 2)
            const rRaw = 1.5 * atr24;
            const floor80bps = 0.0080 * cNow;

            if (rRaw < floor80bps) {
              // Excluded by feasibility filter: SKIP
              infeasibleCount++;
            } else {
              // Trade is eligible
              const riskR = rRaw;
              const costRNormal = (totalCostNormalRate * cNow) / riskR;

              let sl = 0, tp = 0;
              if (side === 1) {
                sl = cNow - riskR;
                tp = cNow + 5.0 * riskR;
              } else {
                sl = cNow + riskR;
                tp = cNow - 5.0 * riskR;
              }

              inPosition = true;
              activeTrade = {
                side,
                entryPrice: cNow,
                entryTime: candles[t].timestamp,
                riskR,
                costRNormal,
                sl,
                tp,
                holdingBars: 0
              };
            }
          }
        }
      }
    }
  }

  return { trades, infeasibleCount };
}

// 14-Day Calendar Block Bootstrap with Trade-Weighted Mean Estimator
export function runCalendarBlockBootstrap(trades, options = {}) {
  const B = options.replications || 10000;
  const seed = options.seed || 888888;
  const epochStartMs = 1672531200000; // 2023-01-01T00:00:00.000Z
  const windowMs = 14 * 24 * 3600 * 1000; // 1,209,600,000 ms

  const n = trades.length;
  if (n === 0) {
    return {
      nTrades: 0,
      meanNetR: 0,
      ci95Lower: 0, ci95Upper: 0,
      pBlock: 1.0,
      profitFactor: 0,
      mddR: 0,
      totalNetR: 0
    };
  }

  const netRs = trades.map(t => t.netR);
  const sampleMeanNetR = netRs.reduce((a, b) => a + b, 0) / n;
  const centeredY = netRs.map(x => x - sampleMeanNetR);

  // Group trades into 14-day calendar blocks by exit time
  const windowMap = new Map();
  for (let i = 0; i < n; i++) {
    const tExit = Number(trades[i].exitTime);
    const windowIdx = Math.floor((tExit - epochStartMs) / windowMs);
    if (!windowMap.has(windowIdx)) {
      windowMap.set(windowIdx, { raw: [], centered: [] });
    }
    windowMap.get(windowIdx).raw.push(netRs[i]);
    windowMap.get(windowIdx).centered.push(centeredY[i]);
  }

  const windows = Array.from(windowMap.values());
  const numWindows = windows.length;

  const rng = mulberry32(seed);
  let nullExceedCount = 0;
  const bootMeans = new Float64Array(B);

  for (let b = 0; b < B; b++) {
    let sumCentered = 0;
    let sumRaw = 0;
    let totalTrades = 0;

    for (let w = 0; w < numWindows; w++) {
      const randIdx = Math.floor(rng() * numWindows);
      const win = windows[randIdx];
      const winSize = win.centered.length;

      for (let k = 0; k < winSize; k++) {
        sumCentered += win.centered[k];
        sumRaw += win.raw[k];
      }
      totalTrades += winSize;
    }

    const tradeWeightedMeanCentered = sumCentered / totalTrades;
    const tradeWeightedMeanRaw = sumRaw / totalTrades;

    bootMeans[b] = tradeWeightedMeanRaw;
    if (tradeWeightedMeanCentered >= sampleMeanNetR) {
      nullExceedCount++;
    }
  }

  bootMeans.sort();
  const ci95Lower = Number(bootMeans[Math.floor(0.025 * B)].toFixed(3));
  const ci95Upper = Number(bootMeans[Math.floor(0.975 * B)].toFixed(3));
  const pBlock = Number(((nullExceedCount + 1) / (B + 1)).toFixed(4));

  let winsSum = 0, lossesSum = 0;
  let peak = 0, running = 0, maxDD = 0;
  for (let i = 0; i < n; i++) {
    const r = netRs[i];
    if (r > 0) winsSum += r;
    else lossesSum += Math.abs(r);

    running += r;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;
  }
  const profitFactor = lossesSum === 0 ? (winsSum > 0 ? 99.0 : 0) : Number((winsSum / lossesSum).toFixed(2));

  return {
    nTrades: n,
    meanNetR: Number(sampleMeanNetR.toFixed(3)),
    ci95Lower, ci95Upper,
    pBlock,
    profitFactor,
    mddR: Number(maxDD.toFixed(2)),
    totalNetR: Number(netRs.reduce((a, b) => a + b, 0).toFixed(2))
  };
}

// Benjamini-Yekutieli (BY 2001) Multiplicity Correction
export function computeBenjaminiYekutieli(pValues) {
  const M = pValues.length; // 40
  let cM = 0;
  for (let i = 1; i <= M; i++) cM += 1 / i; // ~4.278543
  const cConstant = M * cM; // ~171.1417

  // Pair with original index
  const indexed = pValues.map((p, idx) => ({ p, idx }));
  indexed.sort((a, b) => a.p - b.p);

  const qValues = new Float64Array(M);
  let minNext = Infinity;

  for (let rank = M; rank >= 1; rank--) {
    const pVal = indexed[rank - 1].p;
    const currentQ = (cConstant * pVal) / rank;
    if (currentQ < minNext) minNext = currentQ;
    qValues[indexed[rank - 1].idx] = Math.min(1.0, Number(minNext.toFixed(4)));
  }

  return Array.from(qValues);
}

// Graph Basin & Medoid Discovery
export function findBasinsAndMedoid(results, graphSpec) {
  // Find eligible nodes: q_BY < 0.0500 AND nTrades >= 60 AND meanNetR >= +0.150
  const eligibleSet = new Set();
  const eligibleMap = new Map();

  for (const r of results) {
    if (r.qBY < 0.0500 && r.nTrades >= 60 && r.meanNetR >= 0.150) {
      eligibleSet.add(r.id);
      eligibleMap.set(r.id, r);
    }
  }

  if (eligibleSet.size === 0) {
    return {
      hasBasin: false,
      reason: 'ZERO_ELIGIBLE_NODES',
      eligibleCount: 0,
      basins: [],
      winningBasin: null,
      medoid: null
    };
  }

  // Find connected components in eligibleSet using adjacencyList
  const visited = new Set();
  const basins = [];

  for (const nodeId of eligibleSet) {
    if (!visited.has(nodeId)) {
      const component = [];
      const queue = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const curr = queue.shift();
        component.push(curr);

        const neighbors = graphSpec.adjacencyList[curr] || [];
        for (const nbr of neighbors) {
          if (eligibleSet.has(nbr) && !visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        }
      }
      basins.push(component);
    }
  }

  // Deterministic Basin Tie-Break:
  // 1. Cardinality (descending)
  // 2. Mean q_BY (ascending)
  // 3. Min lexical ID (ascending)
  basins.sort((A, B) => {
    if (B.length !== A.length) return B.length - A.length;
    const meanQA = A.reduce((s, id) => s + eligibleMap.get(id).qBY, 0) / A.length;
    const meanQB = B.reduce((s, id) => s + eligibleMap.get(id).qBY, 0) / B.length;
    if (Math.abs(meanQA - meanQB) > 1e-6) return meanQA - meanQB;
    const minIdA = A.slice().sort()[0];
    const minIdB = B.slice().sort()[0];
    return minIdA.localeCompare(minIdB);
  });

  const winningBasin = basins[0];

  // Medoid of winningBasin:
  // Shortest path distance in Graph G:
  function shortestPath(start, target) {
    if (start === target) return 0;
    const dist = new Map();
    dist.set(start, 0);
    const q = [start];
    while (q.length > 0) {
      const u = q.shift();
      const d = dist.get(u);
      for (const v of graphSpec.adjacencyList[u] || []) {
        if (!dist.has(v)) {
          dist.set(v, d + 1);
          if (v === target) return d + 1;
          q.push(v);
        }
      }
    }
    return 999;
  }

  let bestNode = null;
  let bestDist = Infinity;

  const candidateMedoids = [];
  for (const u of winningBasin) {
    let sumD = 0;
    for (const v of winningBasin) {
      sumD += shortestPath(u, v);
    }
    candidateMedoids.push({ id: u, sumD, qBY: eligibleMap.get(u).qBY, nTrades: eligibleMap.get(u).nTrades });
  }

  candidateMedoids.sort((a, b) => {
    if (a.sumD !== b.sumD) return a.sumD - b.sumD;
    if (Math.abs(a.qBY - b.qBY) > 1e-6) return a.qBY - b.qBY;
    if (b.nTrades !== a.nTrades) return b.nTrades - a.nTrades;
    return a.id.localeCompare(b.id);
  });

  const medoidId = candidateMedoids[0].id;
  const medoid = eligibleMap.get(medoidId);

  return {
    hasBasin: true,
    eligibleCount: eligibleSet.size,
    basinsCount: basins.length,
    basins,
    winningBasin,
    medoid
  };
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ AD003 DISCOVERY SIMULATION ENGINE & BY FDR EVALUATION');
  console.log('================================================================\n');

  // Verify V8 Engine
  const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
  const engineSHA = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
  const expectedSHA = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';
  if (engineSHA !== expectedSHA) {
    console.error('❌ FATAL: V8 engine hash mismatch!');
    process.exit(1);
  }
  console.log('✔ V8 Engine SHA-256 Verified Invariant.');

  // Load Matrix & Graph
  const matrixPath = path.resolve(rootDir, 'research/alpha_discovery/AD003/spec/TSD_40_HYPOTHESIS_MATRIX.json');
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

  const graphPath = path.resolve(rootDir, 'research/alpha_discovery/AD003/spec/TSD_40_ADJACENCY_GRAPH.json');
  const graphSpec = JSON.parse(fs.readFileSync(graphPath, 'utf8'));

  // Load Discovery Datasets (2023-2024 only)
  const dataDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
  const TARGET_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];
  const TIMEFRAMES = ['15m', '30m', '2h', '4h'];

  console.log('\nLoading and precomputing indicators for 24 discovery datasets...');
  const datasetStore = {};

  for (const sym of TARGET_ASSETS) {
    datasetStore[sym] = {};
    for (const tf of TIMEFRAMES) {
      const fpath = path.join(dataDir, `${sym}_${tf}.json`);
      if (!fs.existsSync(fpath)) {
        console.error(`❌ Missing dataset: ${fpath}`);
        process.exit(1);
      }
      const candles = JSON.parse(fs.readFileSync(fpath, 'utf8'));
      candles.sort((a, b) => a.timestamp - b.timestamp);

      // Verify no candles > 2024-12-31
      if (candles[candles.length - 1].timestamp > 1735689599999) {
        console.error(`❌ FIREWALL BREACH: Candle timestamp exceeds 2024-12-31 in ${sym}_${tf}!`);
        process.exit(1);
      }

      const ind = precomputeIndicators(candles, 192);
      datasetStore[sym][tf] = { candles, ind };
    }
  }
  console.log('✔ All 24 datasets validated and indicators precomputed.');

  console.log('\nEvaluating 40 hypotheses across 6 assets (TSD001 -> TSD040)...');
  const results = [];

  for (let i = 0; i < matrix.length; i++) {
    const hyp = matrix[i];
    let pooledTrades = [];
    let totalInfeasible = 0;

    for (const sym of TARGET_ASSETS) {
      const { candles, ind } = datasetStore[sym][hyp.timeframe];
      const extremes = computeRollingExtremes(candles, hyp.breakoutLookbackK);
      const { trades, infeasibleCount } = simulateAssetAD003(candles, ind, extremes, hyp, sym);
      pooledTrades = pooledTrades.concat(trades);
      totalInfeasible += infeasibleCount;
    }

    pooledTrades.sort((a, b) => a.exitTime - b.exitTime);

    // Bootstrap test
    const boot = runCalendarBlockBootstrap(pooledTrades, { replications: 10000, seed: 888888 });

    results.push({
      id: hyp.id,
      timeframe: hyp.timeframe,
      modelType: hyp.modelType,
      modelLabel: hyp.modelLabel,
      K: hyp.breakoutLookbackK,
      theta: hyp.compressionThresholdTheta,
      nTrades: boot.nTrades,
      infeasibleCount: totalInfeasible,
      meanNetR: boot.meanNetR,
      ci95Lower: boot.ci95Lower,
      ci95Upper: boot.ci95Upper,
      pBlock: boot.pBlock,
      profitFactor: boot.profitFactor,
      mddR: boot.mddR,
      totalNetR: boot.totalNetR
    });

    process.stdout.write(`\r   Processed ${i + 1}/40: ${hyp.id} (${hyp.timeframe}, K=${hyp.breakoutLookbackK}, th=${hyp.compressionThresholdTheta}) -> N=${boot.nTrades}, meanR=${boot.meanNetR >= 0 ? '+' : ''}${boot.meanNetR}R, p=${boot.pBlock.toFixed(4)}`);
  }
  console.log('\n✔ All 40 hypotheses evaluated.');

  // Apply Benjamini-Yekutieli Multiplicity Adjustment
  console.log('\nApplying Benjamini-Yekutieli (BY, 2001) FDR correction (c(M) = 4.2785)...');
  const pValues = results.map(r => r.pBlock);
  const qBYValues = computeBenjaminiYekutieli(pValues);

  for (let i = 0; i < results.length; i++) {
    results[i].qBY = qBYValues[i];
    results[i].byPass = qBYValues[i] < 0.0500;
  }

  // Topology & Basin Analysis
  console.log('\nComputing topological basins and deterministic medoid...');
  const basinAnalysis = findBasinsAndMedoid(results, graphSpec);

  // Summary counts
  const countP05 = results.filter(r => r.pBlock < 0.0500).length;
  const countBY05 = results.filter(r => r.byPass).length;
  const countN60 = results.filter(r => r.nTrades >= 60).length;
  const countEligible = basinAnalysis.eligibleCount;

  console.log('================================================================');
  console.log('🏛️ AD003 DISCOVERY EXECUTIVE SUMMARY');
  console.log('================================================================');
  console.log(`Total Evaluated Hypotheses:       40 (TSD001 - TSD040)`);
  console.log(`Unadjusted p < 0.0500 count:      ${countP05}/40 (${((countP05/40)*100).toFixed(1)}%)`);
  console.log(`Benjamini-Yekutieli q < 0.0500:   ${countBY05}/40 (${((countBY05/40)*100).toFixed(1)}%)`);
  console.log(`Adequate Sample (N >= 60):        ${countN60}/40`);
  console.log(`Fully Eligible (BY + N>=60 + R):  ${countEligible}/40`);
  console.log(`Topological Basins Found:         ${basinAnalysis.basinsCount || 0}`);
  if (basinAnalysis.hasBasin) {
    console.log(`Winning Basin Size:               ${basinAnalysis.winningBasin.length} nodes: [${basinAnalysis.winningBasin.join(', ')}]`);
    console.log(`Deterministic Medoid:             ${basinAnalysis.medoid.id} (${basinAnalysis.medoid.timeframe}, ${basinAnalysis.medoid.modelLabel}, th=${basinAnalysis.medoid.theta})`);
    console.log(`   Medoid Metrics: N=${basinAnalysis.medoid.nTrades}, meanR=+${basinAnalysis.medoid.meanNetR}R, p=${basinAnalysis.medoid.pBlock}, q_BY=${basinAnalysis.medoid.qBY}, PF=${basinAnalysis.medoid.profitFactor}`);
  } else {
    console.log(`Winning Basin:                    NONE (0 eligible hypotheses)`);
    console.log(`Verdict:                          🔴 DISCOVERY FAIL (No candidate passed BY FDR + N>=60)`);
  }
  console.log('================================================================\n');

  // Persist Raw Results JSON
  const rawPath = path.resolve(__dirname, 'AD003_DISCOVERY_RAW_RESULTS.json');
  fs.writeFileSync(rawPath, JSON.stringify({
    program: 'ALPHA_DISCOVERY_AD003',
    timestampUTC: new Date().toISOString(),
    discoveryPeriod: '2023-01-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z',
    engineFrozenSHA256: engineSHA,
    multiplicityMethod: 'BENJAMINI_YEKUTIELI_2001',
    harmonicConstant: 4.278543,
    summary: {
      total: 40,
      unadjustedP05: countP05,
      byQ05: countBY05,
      n60: countN60,
      eligible: countEligible
    },
    basinAnalysis,
    results
  }, null, 2));

  // Persist Comprehensive Markdown Report
  let md = `# RELATÓRIO EXECUTIVO DE DESCOBERTA — PROGRAMA AD003
## Temporal Scale Dependence of Volatility Compression Breakouts

**Identificador**: \`AD003\`  
**Período de Descoberta**: \`2023-01-01T00:00:00.000Z\` a \`2024-12-31T23:59:59.999Z\` (2 anos fechados)  
**Universo de Ativos**: \`BTCUSDT\`, \`ETHUSDT\`, \`SOLUSDT\`, \`AVAXUSDT\`, \`LINKUSDT\`, \`DOGEUSDT\`  
**Timeframes**: \`15m\`, \`30m\`, \`2h\`, \`4h\` (1H terminantemente excluído)  
**Procedimento de Multiplicidade**: **Benjamini–Yekutieli (BY, 2001)** ($c(M) = 4,2785$, penalidade global $171,1417$)  
**Motor V8 SHA-256**: \`${engineSHA}\` (**100% INTACTO**)  
**Data UTC de Execução**: \`${new Date().toISOString()}\`  

---

## 1. Tabela Consolidada das 40 Hipóteses (TSD001 a TSD040)

| ID | TF | Modelo | K | $\\theta$ | N ($N_{\\ge 60}$) | Inviáveis | $E[R]_{\\text{net}}$ | IC95% | $p_{\\text{block}}$ | $q_{\\text{BY}}$ | Status BY |
|---|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

  for (const r of results) {
    const byTag = r.byPass ? '🟢 PASS' : '🔴 FAIL';
    md += `| **${r.id}** | ${r.timeframe} | ${r.modelLabel} | ${r.K} | ${r.theta.toFixed(2)} | ${r.nTrades} | ${r.infeasibleCount} | ${r.meanNetR >= 0 ? '+' : ''}${r.meanNetR}R | [${r.ci95Lower}, ${r.ci95Upper}] | ${r.pBlock.toFixed(4)} | ${r.qBY.toFixed(4)} | ${byTag} |\n`;
  }

  md += `
---

## 2. Análise Topológica de Bacias e Seleção de Candidato

- **Nós Elegíveis ($q_{\\text{BY}} < 0,0500 \\land N \\ge 60 \\land E[R] \\ge +0,150$)**: ${basinAnalysis.eligibleCount} de 40.
- **Bacias Conexas Identificadas**: ${basinAnalysis.basinsCount || 0}.
`;

  if (basinAnalysis.hasBasin) {
    md += `
### 🟢 Bacia Vencedora Selecionada Deterministicamente:
- **Tamanho da Bacia**: ${basinAnalysis.winningBasin.length} nós: \`[${basinAnalysis.winningBasin.join(', ')}]\`
- **Medoide Topológico da Bacia**: **\`${basinAnalysis.medoid.id}\`**
  - Timeframe: **${basinAnalysis.medoid.timeframe}**
  - Modelo: **${basinAnalysis.medoid.modelLabel}** ($K = ${basinAnalysis.medoid.K}$)
  - Compressão: **$\\theta = ${basinAnalysis.medoid.theta.toFixed(2)}$**
  - Tamanho Amostral: **${basinAnalysis.medoid.nTrades} trades elegíveis**
  - Esperança Matemática: **+${basinAnalysis.medoid.meanNetR}R**
  - Profit Factor: **${basinAnalysis.medoid.profitFactor}**
  - $p$-valor não-ajustado: **${basinAnalysis.medoid.pBlock.toFixed(4)}**
  - $q$-valor ajustado por Benjamini–Yekutieli: **${basinAnalysis.medoid.qBY.toFixed(4)}**

> **STATUS DO PROGRAMA AD003**: 🟢 **DESCOBERTA BEM-SUCEDIDA**  
> O candidato **\`${basinAnalysis.medoid.id}\`** é a única célula elegível para conversão em Pré-Registro Confirmatório independente para o holdout 2025–2026.
`;
  } else {
    md += `
### 🔴 Veredito de Descoberta: NENHUMA BACIA SIGNIFICATIVA
Nenhuma hipótese superou simultaneamente o critério de significância Benjamini–Yekutieli ($q_{\\text{BY}} < 0,0500$) e o piso amostral ($N \\ge 60$).

> **STATUS DO PROGRAMA AD003**: 🔴 **FAIL EM DISCOVERY**  
> O programa AD003 encerra-se sem promoção de hipóteses confirmatórias. Holdout 2025–2026 permanece 100% lacrado e intocado.
`;
  }

  const reportPath = path.resolve(__dirname, 'AD003_DISCOVERY_REPORT.md');
  fs.writeFileSync(reportPath, md);

  console.log(`✔ Raw results JSON saved at: ${rawPath}`);
  console.log(`✔ Discovery Report saved at: ${reportPath}`);
}

main().catch(err => {
  console.error('❌ Simulation failed:', err);
  process.exit(1);
});

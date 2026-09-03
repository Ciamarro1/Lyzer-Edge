/**
 * AD002 — CONTROLLED EXPLORATORY MINING ENGINE (VCB001 to VCB064)
 * Script: run_ad002_discovery.js
 * 
 * Universe: Batch 039 (2023-01-01 to 2026-08-31)
 * Hypotheses: Exactly 64 Closed Hypotheses from VCB_64_HYPOTHESIS_MATRIX.json
 * Rules:
 * - Single Concurrent Position per Asset
 * - Temporal Shielding: SL/TP evaluated strictly from t+1
 * - Worst-Case Tie-Breaking: SL triggers first on intrabar collision
 * - Realistic Gap Handling with Slippage
 * - Exact Individual Cost Accounting in R
 * - 1,000 Block-Bootstrap Replications for Expectancy CI
 * - Full FDR Correction (Benjamini-Hochberg) across all 64 Hypotheses
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('================================================================');
console.log('⚡ AD002 — VOLATILITY COMPRESSION BREAKOUT (1:5 RR) MINING ENGINE');
console.log('Discovery Dataset: Batch 039 [2023-01-01 -> 2026-08-31]');
console.log('Closed Hypothesis Matrix: VCB001 to VCB064 (M = 64)');
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
  console.error('❌ CONSTITUTIONAL BREACH: V8 engine mismatch! Aborting.');
  process.exit(1);
}
console.log('   ✔ V8 Engine 100% Frozen & Untouched.\n');

// PRNG: Mulberry32 for deterministic bootstrap
function mulberry32(seed) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2. Load Hypotheses Matrix
const matrixPath = path.resolve(__dirname, '../spec/VCB_64_HYPOTHESIS_MATRIX.json');
if (!fs.existsSync(matrixPath)) {
  console.error('❌ Hypothesis matrix missing:', matrixPath);
  process.exit(1);
}
const hypotheses = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
console.log(`2. Loaded ${hypotheses.length} closed hypotheses from matrix.\n`);

// 3. Load Target Assets from Batch 039
const batchDir = path.resolve(rootDir, 'research/datasets/batch039');
const TARGET_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];
console.log('3. Loading Discovery Data for 6 Core Assets:', TARGET_ASSETS.join(', '));

const assetData = {};
for (const sym of TARGET_ASSETS) {
  const fpath = path.join(batchDir, `${sym}_1h.json`);
  if (!fs.existsSync(fpath)) {
    console.error(`❌ Missing dataset for ${sym}: ${fpath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  raw.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  assetData[sym] = raw;
  console.log(`   ✔ ${sym}: ${raw.length.toLocaleString()} candles loaded`);
}
console.log('');

// 4. Precompute Indicators for each Asset
console.log('4. Precomputing Wilder RMA ATRs and Rolling Breakout Bands...');

function precomputeAssetIndicators(candles) {
  const n = candles.length;
  const tr = new Float64Array(n);
  const atr12 = new Float64Array(n);
  const atr24 = new Float64Array(n);
  const atr72 = new Float64Array(n);
  const vol24SMA = new Float64Array(n);

  // Compute TR
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < n; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const cPrev = candles[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - cPrev), Math.abs(l - cPrev));
  }

  // Compute Wilder RMA ATR for K=12, 24, 72
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

  // Compute 24-period Volume SMA
  let volSum = 0;
  for (let i = 0; i < 24; i++) volSum += candles[i].volume;
  vol24SMA[23] = volSum / 24;
  for (let i = 24; i < n; i++) {
    volSum += candles[i].volume - candles[i - 24].volume;
    vol24SMA[i] = volSum / 24;
  }

  // Rolling Breakout Extremes for K in {10, 20, 30, 40}
  // Max/Min of past K bars [t-K, t-1]
  const highsK = {
    10: new Float64Array(n),
    20: new Float64Array(n),
    30: new Float64Array(n),
    40: new Float64Array(n)
  };
  const lowsK = {
    10: new Float64Array(n),
    20: new Float64Array(n),
    30: new Float64Array(n),
    40: new Float64Array(n)
  };

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
console.log('   ✔ Indicators precomputed across all assets.\n');

// 5. Execution Simulator for a Given Hypothesis on an Asset
function simulateHypothesisOnAsset(hyp, symbol) {
  const candles = assetData[symbol];
  const ind = precomputed[symbol];
  const n = candles.length;

  const theta = hyp.compressionThreshold;
  const K = hyp.breakoutLookback;
  const vMult = hyp.volumeMultiplier;
  const timeoutLimit = hyp.timeoutHours; // 72
  const slippageBase = 0.0002; // 2 bps
  const totalCostRate = 0.0012; // 10 bps fees + 2 bps slippage = 12 bps

  const trades = [];
  let inPosition = false;
  let activeTrade = null;

  // Evaluation starts at max lookback requirement: 72 bars
  for (let t = 72; t < n; t++) {
    // If we have an active position, monitor execution at bar t
    if (inPosition) {
      const cBar = candles[t];
      const O = cBar.open;
      const H = cBar.high;
      const L = cBar.low;
      const C = cBar.close;

      activeTrade.holdingHours++;
      let exited = false;
      let grossR = 0;
      let exitType = '';

      if (activeTrade.side === 1) { // LONG
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        // Check Gap at Open
        if (O <= SL) {
          // Gap adverse
          const pExit = O - slippageBase * O;
          grossR = (pExit - activeTrade.entryPrice) / activeTrade.riskR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O >= TP) {
          // Gap favorable
          const pExit = O - slippageBase * O;
          grossR = (pExit - activeTrade.entryPrice) / activeTrade.riskR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          // Intrabar check
          const touchesSL = L <= SL;
          const touchesTP = H >= TP;

          if (touchesSL && touchesTP) {
            // Worst-Case Tie-Breaking: SL triggers first
            grossR = -1.0;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            grossR = -1.0;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            grossR = 5.0;
            exitType = 'TP';
            exited = true;
          }
        }

        // Timeout check at 72 hours
        if (!exited && activeTrade.holdingHours >= timeoutLimit) {
          const pExit = C - slippageBase * C;
          grossR = (pExit - activeTrade.entryPrice) / activeTrade.riskR;
          exitType = 'TIMEOUT';
          exited = true;
        }

      } else { // SHORT
        const SL = activeTrade.sl;
        const TP = activeTrade.tp;

        // Check Gap at Open
        if (O >= SL) {
          // Gap adverse
          const pExit = O + slippageBase * O;
          grossR = (activeTrade.entryPrice - pExit) / activeTrade.riskR;
          exitType = 'GAP_SL';
          exited = true;
        } else if (O <= TP) {
          // Gap favorable
          const pExit = O + slippageBase * O;
          grossR = (activeTrade.entryPrice - pExit) / activeTrade.riskR;
          exitType = 'GAP_TP';
          exited = true;
        } else {
          // Intrabar check
          const touchesSL = H >= SL;
          const touchesTP = L <= TP;

          if (touchesSL && touchesTP) {
            // Worst-Case Tie-Breaking: SL triggers first
            grossR = -1.0;
            exitType = 'SL_COLLISION';
            exited = true;
          } else if (touchesSL) {
            grossR = -1.0;
            exitType = 'SL';
            exited = true;
          } else if (touchesTP) {
            grossR = 5.0;
            exitType = 'TP';
            exited = true;
          }
        }

        // Timeout check at 72 hours
        if (!exited && activeTrade.holdingHours >= timeoutLimit) {
          const pExit = C + slippageBase * C;
          grossR = (activeTrade.entryPrice - pExit) / activeTrade.riskR;
          exitType = 'TIMEOUT';
          exited = true;
        }
      }

      if (exited) {
        const netR = grossR - activeTrade.costR;
        trades.push({
          symbol,
          entryTime: activeTrade.entryTime,
          exitTime: candles[t].timestamp,
          side: activeTrade.side,
          holdingHours: activeTrade.holdingHours,
          exitType,
          grossR,
          costR: activeTrade.costR,
          netR
        });
        inPosition = false;
        activeTrade = null;
      }
    }

    // If no position, evaluate entry signal at close of bar t
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
        const isLongBreak = cNow > ind.highsK[K][t];
        const isShortBreak = cNow < ind.lowsK[K][t];

        if (ratioVol <= theta && volExp) {
          let side = 0;
          if (isLongBreak && !isShortBreak) side = 1;
          else if (isShortBreak && !isLongBreak) side = -1;

          if (side !== 0) {
            // Define 1R
            const raw1R = 1.5 * atr24;
            const floor1R = 0.0080 * cNow; // 80 bps floor
            const riskR = Math.max(raw1R, floor1R);

            // Compute exact cost in R
            const costR = (totalCostRate * cNow) / riskR;

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
              costR,
              sl,
              tp,
              holdingHours: 0
            };
          }
        }
      }
    }
  }

  return trades;
}

// 6. Bootstrap & Statistics for Pooled Trades
function computeMetrics(trades, numBootstrap = 1000, seed = 424242) {
  const n = trades.length;
  if (n === 0) {
    return {
      nTrades: 0,
      tpCount: 0, tpPct: 0,
      slCount: 0, slPct: 0,
      timeoutCount: 0, timeoutPct: 0,
      meanNetR: 0,
      ci95Lower: 0, ci95Upper: 0,
      pValue: 1.0,
      profitFactor: 0,
      mddR: 0,
      maxLosingStreak: 0,
      totalNetR: 0
    };
  }

  const netRs = trades.map(t => t.netR);
  let sumNet = 0;
  let tpCount = 0, slCount = 0, timeoutCount = 0;
  let winsSum = 0, lossesSum = 0;

  for (let i = 0; i < n; i++) {
    const r = netRs[i];
    sumNet += r;
    if (trades[i].exitType.includes('TP')) tpCount++;
    else if (trades[i].exitType.includes('SL')) slCount++;
    else if (trades[i].exitType === 'TIMEOUT') timeoutCount++;

    if (r > 0) winsSum += r;
    else lossesSum += Math.abs(r);
  }

  const meanNetR = sumNet / n;
  const tpPct = Number(((tpCount / n) * 100).toFixed(1));
  const slPct = Number(((slCount / n) * 100).toFixed(1));
  const timeoutPct = Number(((timeoutCount / n) * 100).toFixed(1));
  const profitFactor = lossesSum === 0 ? (winsSum > 0 ? 99.0 : 0) : Number((winsSum / lossesSum).toFixed(2));

  // Max Drawdown in R and Max Losing Streak
  let peak = 0;
  let running = 0;
  let maxDD = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  for (let i = 0; i < n; i++) {
    const r = netRs[i];
    running += r;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDD) maxDD = dd;

    if (r <= 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // Block Bootstrap (Block Size = 5 trades) for 95% CI and p-value
  const blockSize = Math.min(n, 5);
  const numBlocks = Math.ceil(n / blockSize);
  const blocks = [];
  for (let i = 0; i < n; i += blockSize) {
    blocks.push(netRs.slice(i, Math.min(n, i + blockSize)));
  }

  const rng = mulberry32(seed);
  const bootMeans = new Float64Array(numBootstrap);
  let nullExceedCount = 0;

  for (let b = 0; b < numBootstrap; b++) {
    let bSum = 0;
    let bCount = 0;
    for (let k = 0; k < numBlocks; k++) {
      const bIdx = Math.floor(rng() * blocks.length);
      const blk = blocks[bIdx];
      for (let j = 0; j < blk.length && bCount < n; j++) {
        bSum += blk[j];
        bCount++;
      }
    }
    const bMean = bSum / bCount;
    bootMeans[b] = bMean;
    if (bMean <= 0) nullExceedCount++;
  }

  bootMeans.sort();
  const ci95Lower = Number(bootMeans[Math.floor(0.025 * numBootstrap)].toFixed(3));
  const ci95Upper = Number(bootMeans[Math.floor(0.975 * numBootstrap)].toFixed(3));
  const pValue = Number(((nullExceedCount + 1) / (numBootstrap + 1)).toFixed(4));

  return {
    nTrades: n,
    tpCount, tpPct,
    slCount, slPct,
    timeoutCount, timeoutPct,
    meanNetR: Number(meanNetR.toFixed(3)),
    ci95Lower, ci95Upper,
    pValue,
    profitFactor,
    mddR: Number(maxDD.toFixed(2)),
    maxLosingStreak: maxStreak,
    totalNetR: Number(sumNet.toFixed(2))
  };
}

// 7. Run Full Discovery Suite over all 64 Hypotheses
console.log('5. Executing 64 Closed Hypotheses over 6 Assets...');
const results = [];

for (let i = 0; i < hypotheses.length; i++) {
  const hyp = hypotheses[i];
  let pooledTrades = [];
  const perAsset = {};

  for (const sym of TARGET_ASSETS) {
    const aTrades = simulateHypothesisOnAsset(hyp, sym);
    pooledTrades = pooledTrades.concat(aTrades);
    perAsset[sym] = computeMetrics(aTrades);
  }

  // Sort pooled trades chronologically by exit time
  pooledTrades.sort((a, b) => a.exitTime - b.exitTime);

  const pooledMetrics = computeMetrics(pooledTrades, 1000, 424242 + i);

  results.push({
    hypothesisId: hyp.hypothesisId,
    params: {
      compressionThreshold: hyp.compressionThreshold,
      breakoutLookback: hyp.breakoutLookback,
      volumeMultiplier: hyp.volumeMultiplier
    },
    pooled: pooledMetrics,
    perAsset
  });

  if ((i + 1) % 16 === 0 || i === hypotheses.length - 1) {
    console.log(`   Processed ${i + 1}/64 hypotheses...`);
  }
}
console.log('   ✔ All 64 hypotheses simulated successfully.\n');

// 8. Benjamini-Hochberg FDR Correction across all 64 Hypotheses
console.log('6. Applying Benjamini-Hochberg FDR (5%) across M=64 Hypotheses...');
const sortedByP = [...results].sort((a, b) => a.pooled.pValue - b.pooled.pValue);
const M = sortedByP.length; // 64

let maxPassingRank = -1;
for (let rank = 1; rank <= M; rank++) {
  const h = sortedByP[rank - 1];
  const bhCrit = (rank / M) * 0.05;
  const rawP = h.pooled.pValue;
  h.fdrRank = rank;
  h.bhCritical = Number(bhCrit.toFixed(5));

  if (rawP <= bhCrit && h.pooled.meanNetR > 0) {
    maxPassingRank = rank;
  }
}

// Compute adjusted q-values: q_k = min_{j >= k} (M/j * p_j)
for (let k = 0; k < M; k++) {
  let minQ = Infinity;
  for (let j = k; j < M; j++) {
    const val = (M / (j + 1)) * sortedByP[j].pooled.pValue;
    if (val < minQ) minQ = val;
  }
  sortedByP[k].qValue = Number(Math.min(1.0, minQ).toFixed(4));
  sortedByP[k].fdrPass = sortedByP[k].fdrRank <= maxPassingRank;
}

console.log(`   Maximum passing BH rank: ${maxPassingRank >= 1 ? maxPassingRank : 'NONE'}`);
console.log(`   Hypotheses passing 5% FDR: ${sortedByP.filter(h => h.fdrPass).length}/64\n`);

// 9. Generate Discovery Ledger and Reports
console.log('7. Persisting Full Raw Results and Formal Reports...');
const discoveryDir = path.resolve(__dirname, '../discovery');

// Write Raw JSON
const rawJsonPath = path.join(discoveryDir, 'AD002_DISCOVERY_RAW_RESULTS.json');
fs.writeFileSync(rawJsonPath, JSON.stringify({
  program: 'ALPHA_DISCOVERY_002',
  engineFrozenSHA256: expectedSHA,
  timestampUTC: new Date().toISOString(),
  universe: TARGET_ASSETS,
  totalHypotheses: 64,
  fdrPassCount: sortedByP.filter(h => h.fdrPass).length,
  results: sortedByP
}, null, 2));

// Generate Comprehensive Markdown Ledger
let md = `# AD002 — Relatório Completo de Mineração Exploratória (VCB001 a VCB064)

**Identificador do Programa**: \`ALPHA_DISCOVERY_002\` (\`AD002\`)  
**Data da Mineração UTC**: \`${new Date().toISOString()}\`  
**Dataset de Mineração**: Batch 039 (\`2023-01-01\` a \`2026-08-31\`)  
**Universo de Ativos**: \`${TARGET_ASSETS.join(', ')}\` (6 ativos de alta liquidez e alto beta)  
**Total de Hipóteses Fechadas**: **64 hipóteses ($4 \\times 4 \\times 4$)**  
**SHA-256 do Motor V8**: \`${expectedSHA}\` (**INTACTO**)  

---

## 1. Síntese Executiva de Descoberta

- **Total de Hipóteses Avaliadas**: 64
- **Hipóteses com $E[R]_{\\text{net}} > 0$ (Viabilidade Econômica Bruta)**: ${results.filter(r => r.pooled.meanNetR > 0).length} / 64 (${((results.filter(r => r.pooled.meanNetR > 0).length / 64) * 100).toFixed(1)}%)
- **Hipóteses que Superam o Critério de Promoção ($E[R] \\ge +0.15R$, PF $\\ge 1.30$, $N \\ge 150$)**: ${results.filter(r => r.pooled.meanNetR >= 0.15 && r.pooled.profitFactor >= 1.30 && r.pooled.nTrades >= 150).length} / 64
- **Hipóteses Aprovadas sob Benjamini-Hochberg FDR (5%)**: **${sortedByP.filter(h => h.fdrPass).length} / 64**

---

## 2. Tabela Completa das 64 Hipóteses (Ordenadas por Desempenho $E[R]_{\\text{net}}$)

| Rank | ID | Parâmetros ($\\theta, K, v$) | Trades ($N$) | TP % | SL % | Timeout % | **$E[R]_{\\text{net}}$** | 95% Bootstrap CI | Profit Factor | $MDD_R$ | $p$-valor | $q$-valor (FDR) | Status FDR |
|:---:|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
`;

const sortedByE = [...results].sort((a, b) => b.pooled.meanNetR - a.pooled.meanNetR);
for (let i = 0; i < sortedByE.length; i++) {
  const r = sortedByE[i];
  const p = r.pooled;
  const fdrMatch = sortedByP.find(h => h.hypothesisId === r.hypothesisId);
  const fdrStatus = fdrMatch.fdrPass ? '🟢 PASS' : '🔴 FAIL';

  md += `| ${i + 1} | **${r.hypothesisId}** | $\\theta=${r.params.compressionThreshold}, K=${r.params.breakoutLookback}, v=${r.params.volumeMultiplier}$ | ${p.nTrades} | ${p.tpPct}% | ${p.slPct}% | ${p.timeoutPct}% | **${p.meanNetR >= 0 ? '+' : ''}${p.meanNetR.toFixed(3)}R** | [${p.ci95Lower}, ${p.ci95Upper}] | ${p.profitFactor} | -${p.mddR}R | ${p.pValue.toFixed(4)} | ${fdrMatch.qValue.toFixed(4)} | ${fdrStatus} |\n`;
}

md += `\n---

## 3. Análise Detalhada dos Melhores Candidatos

`;

const top5 = sortedByE.slice(0, 5);
for (const cand of top5) {
  const p = cand.pooled;
  md += `### Candidato: ${cand.hypothesisId} ($\\theta = ${cand.params.compressionThreshold}, K = ${cand.params.breakoutLookback}, v = ${cand.params.volumeMultiplier}$)
- **Expectativa Líquida**: **${p.meanNetR >= 0 ? '+' : ''}${p.meanNetR}R por trade**
- **Intervalo de Confiança de 95%**: [${p.ci95Lower}R, ${p.ci95Upper}R]
- **Trades Realizados**: ${p.nTrades} trades no universo de 6 ativos
- **Distribuição de Saídas**: Take Profit (${p.tpPct}%), Stop Loss (${p.slPct}%), Timeout 72h (${p.timeoutPct}%)
- **Profit Factor Líquido**: ${p.profitFactor}
- **Drawdown Máximo**: -${p.mddR}R
- **Maior Sequência de Perdas**: ${p.maxLosingStreak} trades consecutivos

#### Decomposição por Ativo:
| Ativo | Trades ($N$) | TP % | SL % | Timeout % | $E[R]_{\\text{net}}$ | Profit Factor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
`;
  for (const sym of TARGET_ASSETS) {
    const a = cand.perAsset[sym];
    md += `| **${sym}** | ${a.nTrades} | ${a.tpPct}% | ${a.slPct}% | ${a.timeoutPct}% | ${a.meanNetR >= 0 ? '+' : ''}${a.meanNetR}R | ${a.profitFactor} |\n`;
  }
  md += '\n';
}

md += `---

## 4. Conclusão da Fase de Descoberta

1. **O mecanismo VCB demonstrou viabilidade exploratória?**
   - Verificar se as melhores configurações apresentam assimetria favorável e sobrevivem ao FDR de múltiplos testes.
2. **Próximo Passo Constitucional**:
   - Este relatório é exclusivamente exploratório (Discovery).
   - Nenhum candidato será promovido sem auditoria forense prévia e elaboração de um novo pré-registro confirmatório isolado por Data Firewall.
`;

const mdPath = path.join(discoveryDir, 'AD002_DISCOVERY_REPORT.md');
fs.writeFileSync(mdPath, md);

console.log(`✔ AD002 Discovery Report persisted at: ${mdPath}`);
console.log(`✔ Raw results JSON persisted at: ${rawJsonPath}`);

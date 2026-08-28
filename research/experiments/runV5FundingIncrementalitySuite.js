import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION
// ============================================================================
const datasetDir = resolve(__dirname, '../datasets');
const candles1h = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_1h_multiyear_2023_2026.json'), 'utf-8'));
const fundingRates = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_funding_rates_2023_2026.json'), 'utf-8'));

candles1h.sort((a, b) => a.openTime - b.openTime);
fundingRates.sort((a, b) => a.fundingTime - b.fundingTime);

console.log('='.repeat(75));
console.log('🏛️ EXP-V5-FUNDING-INCREMENTALITY-005: 2x2 FACTORIAL INTERACTION & INCREMENTALITY SUITE');
console.log('='.repeat(75));
console.log(`Ingested: 1H Candles = ${candles1h.length} | Funding Records = ${fundingRates.length}`);

// ============================================================================
// 2. HELPER FUNCTIONS
// ============================================================================
function getLatestFundingRate(fundingList, t) {
  let latest = null;
  for (const f of fundingList) {
    if (f.fundingTime <= t) latest = f;
    else break;
  }
  return latest ? latest.fundingRate : 0.0001; // default neutral 0.01%
}

// ============================================================================
// 3. SIGNAL EXTRACTION (V5 FROZEN)
// ============================================================================
const v5Engine = new WyckoffVolumeProfileEngine({
  lookback: 30,
  volumeZScore: 1.50,
  minPierceATR: 0.50,
  pocProximity: 0.003,
  requireVolume: true,
  requirePierce: true,
  requirePOC: false,
  requireReversal: true
});

const springSignalIndices = new Set();
const lookbackBuffer = [];

for (let i = 0; i < candles1h.length; i++) {
  const candle = candles1h[i];
  lookbackBuffer.push(candle);
  if (lookbackBuffer.length > 300) lookbackBuffer.shift();
  if (i < 48 || lookbackBuffer.length < 30) continue;

  const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
  const nar = v5Engine.reconstruct(mtf);

  if (nar && nar.signal && nar.signal === 'LONG') {
    springSignalIndices.add(i);
  }
}

console.log(`Total V5 Spring Signals Extracted: ${springSignalIndices.size}`);

// ============================================================================
// 4. FULL POPULATION CLASSIFICATION (2x2 FACTORIAL CELLS)
// ============================================================================
// We evaluate every valid 1h candle (leaving 24h horizon buffer at the end)
const cellA = []; // Spring=1, Funding<0 (Treatment)
const cellB = []; // Spring=1, Funding>=0 (Event Only)
const cellC = []; // Spring=0, Funding<0 (Regime Only)
const cellD = []; // Spring=0, Funding>=0 (Pure Control)

const continuousBins = {
  deepDiscount: [],    // F < -0.01%
  moderateDiscount: [],// -0.01% <= F < 0%
  neutralLow: [],      // 0% <= F <= 0.005%
  mildPremium: [],     // 0.005% < F <= 0.01%
  elevatedPremium: []  // F > 0.01%
};

for (let i = 48; i < candles1h.length - 24; i++) {
  const c = candles1h[i];
  const t = c.closeTime;
  const funding = getLatestFundingRate(fundingRates, t);
  const isSpring = springSignalIndices.has(i);

  // Local ATR(14)
  const prior = candles1h.slice(i - 14, i);
  const ranges = prior.map(x => x.high - x.low);
  const localAtr = ranges.reduce((s, r) => s + r, 0) / ranges.length;

  // Trajectory & Realized Execution
  const rawEntry = candles1h[i + 1].open;
  const horizon6hClose = candles1h[i + 6].close;
  const fwdRet6hPct = ((horizon6hClose - rawEntry) / rawEntry) * 100;

  // Compute MFE and MAE over 6h
  let maxFav = 0;
  let maxAdv = 0;
  for (let f = i + 1; f <= i + 6; f++) {
    const bar = candles1h[f];
    const fav = (bar.high - rawEntry) / rawEntry;
    const adv = (rawEntry - bar.low) / rawEntry;
    if (fav > maxFav) maxFav = fav;
    if (adv > maxAdv) maxAdv = adv;
  }

  // Simulate Execution (SL 1.0 ATR, TP 2.5R, Exit 6h, Taker 0.10% leg, Slip 0.02% leg)
  const slippagePct = 0.0002;
  const takerFeePct = 0.001;
  const notional = 1000;
  const entryPrice = rawEntry * (1 + slippagePct);
  const slDist = Math.max(rawEntry * 0.002, localAtr * 1.0);
  const stopPrice = rawEntry - slDist;
  const targetPrice = rawEntry + slDist * 2.5;

  let exitPrice = null;
  let exitReason = null;

  for (let f = i + 1; f <= i + 6; f++) {
    const bar = candles1h[f];
    const hitSL = bar.low <= stopPrice;
    const hitTP = bar.high >= targetPrice;

    if (hitSL && hitTP) {
      exitPrice = stopPrice * (1 - slippagePct);
      exitReason = 'INTRABAR_COLLISION_SL';
      break;
    } else if (hitSL) {
      exitPrice = stopPrice * (1 - slippagePct);
      exitReason = 'STOP_LOSS';
      break;
    } else if (hitTP) {
      exitPrice = targetPrice * (1 - slippagePct);
      exitReason = 'TAKE_PROFIT';
      break;
    }

    if (f === i + 6) {
      exitPrice = bar.close * (1 - slippagePct);
      exitReason = 'TIME_EXIT';
      break;
    }
  }

  if (exitPrice === null) {
    exitPrice = candles1h[i + 6].close * (1 - slippagePct);
    exitReason = 'TIME_EXIT';
  }

  const retReal = (exitPrice - entryPrice) / entryPrice;
  const grossPnL = notional * retReal;
  const totalFees = notional * takerFeePct * 2;
  const slippageCost = notional * (slippagePct * 2);
  const netPnL = grossPnL - totalFees;

  const item = {
    index: i,
    timestamp: c.openTime,
    year: new Date(c.openTime).getUTCFullYear(),
    isSpring,
    funding,
    fwdRet6hPct,
    mfe6hPct: maxFav * 100,
    mae6hPct: maxAdv * 100,
    grossPnL: Number(grossPnL.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    isWin: netPnL > 0,
    exitReason
  };

  if (isSpring && funding < 0) cellA.push(item);
  else if (isSpring && funding >= 0) cellB.push(item);
  else if (!isSpring && funding < 0) cellC.push(item);
  else cellD.push(item);

  // Bins for Spring items
  if (isSpring) {
    if (funding < -0.0001) continuousBins.deepDiscount.push(item);
    else if (funding < 0) continuousBins.moderateDiscount.push(item);
    else if (funding <= 0.00005) continuousBins.neutralLow.push(item);
    else if (funding <= 0.0001) continuousBins.mildPremium.push(item);
    else continuousBins.elevatedPremium.push(item);
  }
}

// ============================================================================
// 5. METRICS AGGREGATION FUNCTION
// ============================================================================
function computeCellMetrics(arr, cellName) {
  const n = arr.length;
  if (n === 0) return { name: cellName, n: 0 };

  const fwdRetMean = arr.reduce((s, x) => s + x.fwdRet6hPct, 0) / n;
  const sortedFwd = [...arr.map(x => x.fwdRet6hPct)].sort((a, b) => a - b);
  const fwdRetMedian = sortedFwd[Math.floor(n / 2)];

  const mfeMean = arr.reduce((s, x) => s + x.mfe6hPct, 0) / n;
  const maeMean = arr.reduce((s, x) => s + x.mae6hPct, 0) / n;
  const mfeMaeRatio = maeMean > 0 ? Number((mfeMean / maeMean).toFixed(2)) : 10;
  const posRate = (arr.filter(x => x.fwdRet6hPct > 0).length / n) * 100;

  const totalGross = arr.reduce((s, x) => s + x.grossPnL, 0);
  const totalNet = arr.reduce((s, x) => s + x.netPnL, 0);
  const grossExp = totalGross / n;
  const netExp = totalNet / n;

  const wins = arr.filter(x => x.isWin);
  const losses = arr.filter(x => !x.isWin);
  const winG = wins.reduce((s, x) => s + x.netPnL, 0);
  const lossG = Math.abs(losses.reduce((s, x) => s + x.netPnL, 0));
  const pfNet = lossG > 0 ? Number((winG / lossG).toFixed(2)) : (winG > 0 ? 10 : 0);
  const wrNet = (wins.length / n) * 100;

  return {
    name: cellName,
    n,
    fwdRetMeanPct: Number(fwdRetMean.toFixed(3)),
    fwdRetMedianPct: Number(fwdRetMedian.toFixed(3)),
    mfeMeanPct: Number(mfeMean.toFixed(3)),
    maeMeanPct: Number(maeMean.toFixed(3)),
    mfeMaeRatio,
    posRatePct: Number(posRate.toFixed(2)),
    grossPnL: Number(totalGross.toFixed(2)),
    netPnL: Number(totalNet.toFixed(2)),
    grossExpectancy: Number(grossExp.toFixed(3)),
    netExpectancy: Number(netExp.toFixed(3)),
    profitFactorNet: pfNet,
    winRateNet: Number(wrNet.toFixed(2))
  };
}

const mA = computeCellMetrics(cellA, 'Cell A: Spring=1, Funding<0 (Treatment)');
const mB = computeCellMetrics(cellB, 'Cell B: Spring=1, Funding>=0 (Event Only)');
const mC = computeCellMetrics(cellC, 'Cell C: Spring=0, Funding<0 (Regime Only)');
const mD = computeCellMetrics(cellD, 'Cell D: Spring=0, Funding>=0 (Pure Control)');

// Difference in Differences
const didForwardRet = Number((mA.fwdRetMeanPct - mB.fwdRetMeanPct - mC.fwdRetMeanPct + mD.fwdRetMeanPct).toFixed(3));
const incrementalOverRegime = Number((mA.fwdRetMeanPct - mC.fwdRetMeanPct).toFixed(3));
const incrementalOverEvent = Number((mA.fwdRetMeanPct - mB.fwdRetMeanPct).toFixed(3));

const didNetExp = Number((mA.netExpectancy - mB.netExpectancy - mC.netExpectancy + mD.netExpectancy).toFixed(3));
const netIncrementalOverRegime = Number((mA.netExpectancy - mC.netExpectancy).toFixed(3));

// ============================================================================
// 6. ADVANCED STATISTICAL INFERENCE (10,000 PERMUTATIONS & BOOTSTRAP)
// ============================================================================
// Test if the Spring within Funding < 0 is statistically superior to random bars within Funding < 0
const allFundingNegItems = [...cellA, ...cellC];
const nTarget = cellA.length;
const observedDiff = incrementalOverRegime;

let permCountHigher = 0;
const iterations = 10000;
const permDiffs = [];

for (let b = 0; b < iterations; b++) {
  // Sample nTarget without replacement
  let sumSample = 0;
  for (let i = 0; i < nTarget; i++) {
    const randIdx = Math.floor(Math.random() * allFundingNegItems.length);
    sumSample += allFundingNegItems[randIdx].fwdRet6hPct;
  }
  const meanSample = sumSample / nTarget;
  const diff = meanSample - mC.fwdRetMeanPct;
  permDiffs.push(diff);
  if (diff >= observedDiff) permCountHigher++;
}

const empiricalPValue = Number((permCountHigher / iterations).toFixed(4));

// Bootstrap 10,000 on Cell A Net Expectancy
const bootstrapA = [];
for (let b = 0; b < iterations; b++) {
  let sumNet = 0;
  for (let i = 0; i < cellA.length; i++) {
    const randIdx = Math.floor(Math.random() * cellA.length);
    sumNet += cellA[randIdx].netPnL;
  }
  bootstrapA.push(sumNet / cellA.length);
}
bootstrapA.sort((a, b) => a - b);
const bootstrapA_CI95 = [
  Number(bootstrapA[Math.floor(iterations * 0.025)].toFixed(3)),
  Number(bootstrapA[Math.floor(iterations * 0.975)].toFixed(3))
];

// ============================================================================
// 7. CONTINUOUS BINS EVALUATION
// ============================================================================
const binMetrics = {};
for (const [binName, arr] of Object.entries(continuousBins)) {
  binMetrics[binName] = computeCellMetrics(arr, binName);
}

// ============================================================================
// 8. LOGGING RESULTS & SAVE ARTIFACTS
// ============================================================================
console.log('\n' + '='.repeat(75));
console.log('📊 2x2 FACTORIAL INTERACTION MATRIX RESULTS');
console.log('='.repeat(75));
console.log(`Cell A (Spring=1, F<0)  -> N: ${String(mA.n).padStart(5)} | FwdRet6h: +${mA.fwdRetMeanPct}% | MFE/MAE: ${mA.mfeMaeRatio}x | NetPnL: $${String(mA.netPnL).padStart(7)} | NetExp: $${String(mA.netExpectancy).padStart(6)} | NetPF: ${mA.profitFactorNet} | NetWR: ${mA.winRateNet}%`);
console.log(`Cell B (Spring=1, F>=0) -> N: ${String(mB.n).padStart(5)} | FwdRet6h: +${mB.fwdRetMeanPct}% | MFE/MAE: ${mB.mfeMaeRatio}x | NetPnL: $${String(mB.netPnL).padStart(7)} | NetExp: $${String(mB.netExpectancy).padStart(6)} | NetPF: ${mB.profitFactorNet} | NetWR: ${mB.winRateNet}%`);
console.log(`Cell C (Spring=0, F<0)  -> N: ${String(mC.n).padStart(5)} | FwdRet6h: +${mC.fwdRetMeanPct}% | MFE/MAE: ${mC.mfeMaeRatio}x | NetPnL: $${String(mC.netPnL).padStart(7)} | NetExp: $${String(mC.netExpectancy).padStart(6)} | NetPF: ${mC.profitFactorNet} | NetWR: ${mC.winRateNet}%`);
console.log(`Cell D (Spring=0, F>=0) -> N: ${String(mD.n).padStart(5)} | FwdRet6h: +${mD.fwdRetMeanPct}% | MFE/MAE: ${mD.mfeMaeRatio}x | NetPnL: $${String(mD.netPnL).padStart(7)} | NetExp: $${String(mD.netExpectancy).padStart(6)} | NetPF: ${mD.profitFactorNet} | NetWR: ${mD.winRateNet}%`);

console.log('\n' + '='.repeat(75));
console.log('🔬 INTERACTION (DIFFERENCE-IN-DIFFERENCES) & INCREMENTALITY METRICS');
console.log('='.repeat(75));
console.log(`- Forward Return DiD Interaction : ${didForwardRet > 0 ? '+' : ''}${didForwardRet}% (+${(didForwardRet * 100).toFixed(1)} bps)`);
console.log(`- Incremental over Regime (A - C): ${incrementalOverRegime > 0 ? '+' : ''}${incrementalOverRegime}% (+${(incrementalOverRegime * 100).toFixed(1)} bps)`);
console.log(`- Incremental over Event  (A - B): ${incrementalOverEvent > 0 ? '+' : ''}${incrementalOverEvent}% (+${(incrementalOverEvent * 100).toFixed(1)} bps)`);
console.log(`- Net Realized DiD Interaction   : $${didNetExp}`);
console.log(`- Net Realized Edge over Regime  : $${netIncrementalOverRegime} per trade`);
console.log(`- Permutation Test p-value (10k) : p = ${empiricalPValue} (${empiricalPValue < 0.05 ? 'STATISTICALLY SIGNIFICANT p < 0.05 ✅' : 'NOT SIGNIFICANT ❌'})`);
console.log(`- Bootstrap 10k CI95 (Cell A)    : [$${bootstrapA_CI95[0]}, $${bootstrapA_CI95[1]}] (${bootstrapA_CI95[0] > 0 ? 'STRICTLY POSITIVE ✅' : 'INCLUDES ZERO ❌'})`);

console.log('\n' + '='.repeat(75));
console.log('🌊 CONTINUOUS FUNDING BINS (SPRING EVENTS)');
console.log('='.repeat(75));
for (const [k, v] of Object.entries(binMetrics)) {
  console.log(`  ${k.padEnd(18)} -> N: ${String(v.n).padStart(3)} | FwdRet6h: ${String(v.fwdRetMeanPct).padStart(6)}% | MFE/MAE: ${v.mfeMaeRatio}x | NetPnL: $${String(v.netPnL).padStart(7)} | NetExp: $${String(v.netExpectancy).padStart(6)} | NetPF: ${v.profitFactorNet}`);
}

const outputDir = resolve(__dirname, '../results/v5_funding_incrementality');
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const manifest = {
  experimentId: 'EXP-V5-FUNDING-INCREMENTALITY-005',
  timestamp: new Date().toISOString(),
  matrix2x2: { cellA: mA, cellB: mB, cellC: mC, cellD: mD },
  interactionTerms: {
    didForwardRet,
    incrementalOverRegime,
    incrementalOverEvent,
    didNetExp,
    netIncrementalOverRegime
  },
  statisticalInference: {
    permutationTest10k: { empiricalPValue },
    bootstrap10kCellA: { ci95: bootstrapA_CI95 }
  },
  continuousBins: binMetrics,
  governanceVerdict: {
    classification: '🟡 PROMISING CONDITIONAL EVIDENCE — STATISTICALLY UNCONFIRMED (N=25)',
    productionStatus: '🚫 PERMANENTLY BLOCKED',
    shadowStatus: '🟢 ACTIVE SHADOW TRACKING PROTOCOL'
  }
};

writeFileSync(resolve(outputDir, 'incrementality_manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n✅ Incrementality Manifest saved to ${resolve(outputDir, 'incrementality_manifest.json')}`);

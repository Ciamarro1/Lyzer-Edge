import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION (1H, 4H, 1D, 1W, FUNDING RATES)
// ============================================================================
const datasetDir = resolve(__dirname, '../datasets');
const candles1h = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_1h_multiyear_2023_2026.json'), 'utf-8'));
const candles4h = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_4h_multiyear.json'), 'utf-8'));
const candles1d = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_1d_multiyear.json'), 'utf-8'));
const candles1w = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_1w_multiyear.json'), 'utf-8'));
const fundingRates = JSON.parse(readFileSync(resolve(datasetDir, 'BTCUSDT_funding_rates_2023_2026.json'), 'utf-8'));

candles1h.sort((a, b) => a.openTime - b.openTime);
candles4h.sort((a, b) => a.openTime - b.openTime);
candles1d.sort((a, b) => a.openTime - b.openTime);
candles1w.sort((a, b) => a.openTime - b.openTime);
fundingRates.sort((a, b) => a.fundingTime - b.fundingTime);

console.log('='.repeat(75));
console.log('🏛️ EXP-V5-EXOGENOUS-STATE-004: EXOGENOUS MARKET STATE & INCREMENTALITY TEST');
console.log('='.repeat(75));
console.log(`Ingested -> 1H: ${candles1h.length} | 4H: ${candles4h.length} | 1D: ${candles1d.length} | 1W: ${candles1w.length} | Funding: ${fundingRates.length}`);

// ============================================================================
// 2. HELPER FUNCTIONS FOR CAUSAL HTF & DERIVATIVES LOOKUPS
// ============================================================================
// Causal lookup: only use HTF candles closed strictly BEFORE or AT timestamp t
function getCausalHTF(candlesHTF, t) {
  const available = candlesHTF.filter(c => c.closeTime <= t);
  return available;
}

function computeSMA(arr, period) {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((s, c) => s + c.close, 0) / period;
}

function getLatestFundingRate(fundingList, t) {
  // Most recent funding rate settled before or at t
  let latest = null;
  for (const f of fundingList) {
    if (f.fundingTime <= t) latest = f;
    else break;
  }
  return latest ? latest.fundingRate : 0.0001; // default neutral 0.01%
}

// ============================================================================
// 3. SIGNAL EXTRACTION WITH EXOGENOUS STATE FEATURES
// ============================================================================
function extractSignalsWithExogenousState(all1h, all4h, all1d, all1w, allFunding) {
  const v5Engine = new WyckoffVolumeProfileEngine({
    lookback: 30,
    volumeZScore: 1.50,
    minPierceATR: 0.50,
    pocProximity: 0.003,
    requireVolume: true,
    requirePierce: true,
    requirePOC: false, // FROZEN RULE
    requireReversal: true
  });

  const signals = [];
  const lookbackBuffer = [];

  for (let i = 0; i < all1h.length; i++) {
    const candle = all1h[i];
    lookbackBuffer.push(candle);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();
    if (i < 48 || lookbackBuffer.length < 30) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    if (nar && nar.signal && nar.signal === 'LONG') {
      const prior1h = lookbackBuffer.slice(0, -1);
      const ranges = prior1h.map(c => c.high - c.low);
      const localAtr = ranges.reduce((s, r) => s + r, 0) / Math.max(1, ranges.length);

      const t = candle.closeTime;

      // 1. HTF 4H Features
      const htf4h = getCausalHTF(all4h, t);
      const sma50_4h = computeSMA(htf4h, 50);
      const sma200_4h = computeSMA(htf4h, 200);
      const is4hBull = sma50_4h ? candle.close > sma50_4h : false;

      // 2. HTF 1D Features
      const htf1d = getCausalHTF(all1d, t);
      const sma50_1d = computeSMA(htf1d, 50);
      const sma200_1d = computeSMA(htf1d, 200);
      const is1dBull = sma50_1d ? candle.close > sma50_1d : false;
      const is1dMacroBull = sma200_1d ? candle.close > sma200_1d : false;

      // 4-State HTF Matrix
      let htfState = '4H_BEAR_1D_BEAR';
      if (is4hBull && is1dBull) htfState = '4H_BULL_1D_BULL';
      else if (is4hBull && !is1dBull) htfState = '4H_BULL_1D_BEAR';
      else if (!is4hBull && is1dBull) htfState = '4H_BEAR_1D_BULL';

      // 3. Derivatives Features (Funding Rate)
      const currentFunding = getLatestFundingRate(allFunding, t);
      let fundingRegime = 'NEUTRAL';
      if (currentFunding < 0) fundingRegime = 'NEGATIVE_DISCOUNT';
      else if (currentFunding > 0.0002) fundingRegime = 'ELEVATED_PREMIUM'; // > 0.02% per 8h

      // 4. Structural Weekly Context
      const htf1w = getCausalHTF(all1w, t);
      let isWeeklyLowSweep = false;
      if (htf1w.length >= 2) {
        const prevWeek = htf1w[htf1w.length - 1]; // previous closed week
        if (candle.low < prevWeek.low && candle.close > prevWeek.low) {
          isWeeklyLowSweep = true;
        }
      }

      // 5. 30-Day Drawdown from Rolling High
      const lookback30dCandles = all1h.slice(Math.max(0, i - (30 * 24)), i);
      const high30d = Math.max(...lookback30dCandles.map(c => c.high));
      const dd30dPct = high30d > 0 ? ((high30d - candle.close) / high30d) * 100 : 0;
      const isDeepDrawdown = dd30dPct > 15.0; // > 15% correction

      const year = new Date(candle.openTime).getUTCFullYear();

      signals.push({
        index: i,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        year,
        direction: 'LONG',
        closePrice: candle.close,
        openPriceNext: all1h[i + 1] ? all1h[i + 1].open : candle.close,
        localAtr,
        is4hBull,
        is1dBull,
        is1dMacroBull,
        htfState,
        currentFunding,
        fundingRegime,
        isWeeklyLowSweep,
        dd30dPct: Number(dd30dPct.toFixed(2)),
        isDeepDrawdown
      });
    }
  }

  return signals;
}

// ============================================================================
// 4. DETERMINISTIC FROZEN EXECUTION SIMULATOR
// ============================================================================
function simulateFrozenExecution(allCandles, signals) {
  const takerFeePct = 0.001; // 0.10% each leg = 0.20% roundtrip
  const slippagePct = 0.0002; // 0.02% each leg = 0.04% roundtrip
  const slAtrMult = 1.0;
  const tpRMult = 2.5;
  const timeExitBars = 6;
  const notional = 1000;

  const trades = [];

  for (const sig of signals) {
    const entryIdx = sig.index;
    if (entryIdx >= allCandles.length - 1) continue;

    const rawEntry = sig.openPriceNext;
    const entryPrice = rawEntry * (1 + slippagePct);
    const slDist = Math.max(rawEntry * 0.002, sig.localAtr * slAtrMult);
    const stopPrice = rawEntry - slDist;
    const targetPrice = rawEntry + slDist * tpRMult;

    let exitPrice = null;
    let exitReason = null;
    let exitIndex = null;

    const maxHorizon = Math.min(allCandles.length - 1, entryIdx + timeExitBars);

    for (let f = entryIdx + 1; f <= maxHorizon; f++) {
      const c = allCandles[f];
      const hitSL = c.low <= stopPrice;
      const hitTP = c.high >= targetPrice;

      if (hitSL && hitTP) {
        exitPrice = stopPrice * (1 - slippagePct);
        exitReason = 'INTRABAR_COLLISION_SL';
        exitIndex = f;
        break;
      } else if (hitSL) {
        exitPrice = stopPrice * (1 - slippagePct);
        exitReason = 'STOP_LOSS';
        exitIndex = f;
        break;
      } else if (hitTP) {
        exitPrice = targetPrice * (1 - slippagePct);
        exitReason = 'TAKE_PROFIT';
        exitIndex = f;
        break;
      }

      if (f === maxHorizon) {
        exitPrice = c.close * (1 - slippagePct);
        exitReason = 'TIME_EXIT';
        exitIndex = f;
        break;
      }
    }

    if (exitPrice === null) {
      exitPrice = allCandles[maxHorizon].close * (1 - slippagePct);
      exitReason = 'TIME_EXIT';
      exitIndex = maxHorizon;
    }

    // Trajectory 6h Return
    const ret6hPrice = allCandles[maxHorizon].close;
    const forwardRet6hPct = ((ret6hPrice - rawEntry) / rawEntry) * 100;

    const ret = (exitPrice - entryPrice) / entryPrice;
    const grossPnL = notional * ret;
    const totalFees = notional * takerFeePct * 2;
    const slippageCost = notional * (slippagePct * 2);
    const netPnL = grossPnL - totalFees;

    trades.push({
      signalId: sig.index,
      timestamp: sig.openTime,
      year: sig.year,
      htfState: sig.htfState,
      is1dMacroBull: sig.is1dMacroBull,
      fundingRegime: sig.fundingRegime,
      isWeeklyLowSweep: sig.isWeeklyLowSweep,
      isDeepDrawdown: sig.isDeepDrawdown,
      forwardRet6hPct,
      grossPnL: Number(grossPnL.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      isWin: netPnL > 0,
      exitReason
    });
  }

  return trades;
}

function computeMetrics(trades) {
  const n = trades.length;
  if (n === 0) return { trades: 0, netPnL: 0, netExp: 0, grossExp: 0, netPF: 0, netWR: 0, meanForwardRet6hPct: 0 };

  const totalNet = trades.reduce((s, t) => s + t.netPnL, 0);
  const totalGross = trades.reduce((s, t) => s + t.grossPnL, 0);
  const wins = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);
  const winSum = wins.reduce((s, t) => s + t.netPnL, 0);
  const lossSum = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));

  const pf = lossSum > 0 ? Number((winSum / lossSum).toFixed(2)) : (winSum > 0 ? 10 : 0);
  const wr = Number(((wins.length / n) * 100).toFixed(2));
  const meanFwdRet = trades.reduce((s, t) => s + t.forwardRet6hPct, 0) / n;

  return {
    trades: n,
    grossPnL: Number(totalGross.toFixed(2)),
    netPnL: Number(totalNet.toFixed(2)),
    grossExp: Number((totalGross / n).toFixed(3)),
    netExp: Number((totalNet / n).toFixed(3)),
    netPF: pf,
    netWR: wr,
    meanForwardRet6hPct: Number(meanFwdRet.toFixed(3))
  };
}

// ============================================================================
// 5. BASELINE MARKET BENCHMARK (CONTROL OF BETA)
// ============================================================================
function computeMarketBaselineReturn(allCandles, conditionFn) {
  const forwardReturns = [];
  for (let i = 200 * 24; i < allCandles.length - 6; i++) {
    const c = allCandles[i];
    if (conditionFn(c, i)) {
      const entry = allCandles[i + 1].open;
      const exit = allCandles[i + 6].close;
      const ret = ((exit - entry) / entry) * 100;
      forwardReturns.push(ret);
    }
  }
  if (forwardReturns.length === 0) return 0;
  return Number((forwardReturns.reduce((s, v) => s + v, 0) / forwardReturns.length).toFixed(3));
}

// ============================================================================
// MAIN EXPERIMENT PIPELINE
// ============================================================================
async function main() {
  const outputDir = resolve(__dirname, '../results/v5_exogenous_state');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const allSignals = extractSignalsWithExogenousState(candles1h, candles4h, candles1d, candles1w, fundingRates);
  console.log(`\n📊 Total Multi-Year V5 Spring Signals: ${allSignals.length}`);

  const allTrades = simulateFrozenExecution(candles1h, allSignals);
  const mAll = computeMetrics(allTrades);

  console.log(`Baseline All Springs -> N: ${mAll.trades} | Net PnL: $${mAll.netPnL} | Net Exp: $${mAll.netExp} | Net PF: ${mAll.netPF} | Net WR: ${mAll.netWR}% | 6h Mean Ret: ${mAll.meanForwardRet6hPct}%`);

  // ==========================================================================
  // FASE 1: HTF 4-STATE MATRIX (4H & 1D TREND)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('📈 FASE 1 — HTF 4-STATE MATRIX (4H vs 1D TREND ALIGNMENT)');
  console.log('='.repeat(75));

  const htfStates = [
    '4H_BULL_1D_BULL',
    '4H_BULL_1D_BEAR',
    '4H_BEAR_1D_BULL',
    '4H_BEAR_1D_BEAR'
  ];

  const htfResults = {};

  for (const st of htfStates) {
    const subset = allTrades.filter(t => t.htfState === st);
    const m = computeMetrics(subset);
    htfResults[st] = m;
    console.log(`  ${st.padEnd(18)} -> N: ${String(m.trades).padStart(3)} | NetPnL: $${String(m.netPnL).padStart(7)} | NetExp: $${String(m.netExp).padStart(6)} | NetPF: ${m.netPF} | NetWR: ${m.netWR}% | 6h Ret: ${m.meanForwardRet6hPct}%`);
  }

  // HTF 1D 200 SMA (Macro Bull vs Macro Bear)
  const macroBullTrades = allTrades.filter(t => t.is1dMacroBull);
  const macroBearTrades = allTrades.filter(t => !t.is1dMacroBull);
  const mMacroBull = computeMetrics(macroBullTrades);
  const mMacroBear = computeMetrics(macroBearTrades);

  console.log(`\n  Macro 1D SMA200 Bull -> N: ${String(mMacroBull.trades).padStart(3)} | NetPnL: $${String(mMacroBull.netPnL).padStart(7)} | NetExp: $${String(mMacroBull.netExp).padStart(6)} | NetPF: ${mMacroBull.netPF} | NetWR: ${mMacroBull.netWR}% | 6h Ret: ${mMacroBull.meanForwardRet6hPct}%`);
  console.log(`  Macro 1D SMA200 Bear -> N: ${String(mMacroBear.trades).padStart(3)} | NetPnL: $${String(mMacroBear.netPnL).padStart(7)} | NetExp: $${String(mMacroBear.netExp).padStart(6)} | NetPF: ${mMacroBear.netPF} | NetWR: ${mMacroBear.netWR}% | 6h Ret: ${mMacroBear.meanForwardRet6hPct}%`);

  // ==========================================================================
  // FASE 2: DERIVATIVES REGIME (FUNDING RATE SQUEEZE VS CROWDED)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('💳 FASE 2 — DERIVATIVES REGIME (FUNDING RATE AT SIGNAL)');
  console.log('='.repeat(75));

  const fundingRegimes = ['NEGATIVE_DISCOUNT', 'NEUTRAL', 'ELEVATED_PREMIUM'];
  const fundingResults = {};

  for (const fr of fundingRegimes) {
    const subset = allTrades.filter(t => t.fundingRegime === fr);
    const m = computeMetrics(subset);
    fundingResults[fr] = m;
    console.log(`  ${fr.padEnd(20)} -> N: ${String(m.trades).padStart(3)} | NetPnL: $${String(m.netPnL).padStart(7)} | NetExp: $${String(m.netExp).padStart(6)} | NetPF: ${m.netPF} | NetWR: ${m.netWR}% | 6h Ret: ${m.meanForwardRet6hPct}%`);
  }

  // ==========================================================================
  // FASE 3: STRUCTURAL CONTEXT (WEEKLY LOW SWEEP & DRAWDOWN)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🎯 FASE 3 — STRUCTURAL CONTEXT (WEEKLY LOW SWEEP & DRAWDOWN)');
  console.log('='.repeat(75));

  const weeklySweepTrades = allTrades.filter(t => t.isWeeklyLowSweep);
  const nonWeeklySweepTrades = allTrades.filter(t => !t.isWeeklyLowSweep);
  const mWeeklySweep = computeMetrics(weeklySweepTrades);
  const mNonWeeklySweep = computeMetrics(nonWeeklySweepTrades);

  console.log(`  Weekly Low Sweep     -> N: ${String(mWeeklySweep.trades).padStart(3)} | NetPnL: $${String(mWeeklySweep.netPnL).padStart(7)} | NetExp: $${String(mWeeklySweep.netExp).padStart(6)} | NetPF: ${mWeeklySweep.netPF} | NetWR: ${mWeeklySweep.netWR}% | 6h Ret: ${mWeeklySweep.meanForwardRet6hPct}%`);
  console.log(`  Non-Weekly Sweep     -> N: ${String(mNonWeeklySweep.trades).padStart(3)} | NetPnL: $${String(mNonWeeklySweep.netPnL).padStart(7)} | NetExp: $${String(mNonWeeklySweep.netExp).padStart(6)} | NetPF: ${mNonWeeklySweep.netPF} | NetWR: ${mNonWeeklySweep.netWR}% | 6h Ret: ${mNonWeeklySweep.meanForwardRet6hPct}%`);

  const deepDdTrades = allTrades.filter(t => t.isDeepDrawdown);
  const shallowDdTrades = allTrades.filter(t => !t.isDeepDrawdown);
  const mDeepDd = computeMetrics(deepDdTrades);
  const mShallowDd = computeMetrics(shallowDdTrades);

  console.log(`  Deep Drawdown (>15%) -> N: ${String(mDeepDd.trades).padStart(3)} | NetPnL: $${String(mDeepDd.netPnL).padStart(7)} | NetExp: $${String(mDeepDd.netExp).padStart(6)} | NetPF: ${mDeepDd.netPF} | NetWR: ${mDeepDd.netWR}% | 6h Ret: ${mDeepDd.meanForwardRet6hPct}%`);
  console.log(`  Shallow DD (<=15%)   -> N: ${String(mShallowDd.trades).padStart(3)} | NetPnL: $${String(mShallowDd.netPnL).padStart(7)} | NetExp: $${String(mShallowDd.netExp).padStart(6)} | NetPF: ${mShallowDd.netPF} | NetWR: ${mShallowDd.netWR}% | 6h Ret: ${mShallowDd.meanForwardRet6hPct}%`);

  // ==========================================================================
  // FASE 4: TEMPORAL STABILITY OF TOP REGIME ACROSS PARTITIONS
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('📅 FASE 4 — TEMPORAL STABILITY ACROSS CHRONOLOGICAL PARTITIONS');
  console.log('='.repeat(75));

  const years = [2023, 2024, 2025, 2026];
  const annualMacroBull = {};

  for (const yr of years) {
    const yrTrades = macroBullTrades.filter(t => t.year === yr);
    const m = computeMetrics(yrTrades);
    annualMacroBull[yr] = m;
    console.log(`  Year ${yr} (Macro 1D Bull) -> N: ${String(m.trades).padStart(2)} | NetPnL: $${String(m.netPnL).padStart(7)} | NetExp: $${String(m.netExp).padStart(6)} | NetPF: ${m.netPF} | NetWR: ${m.netWR}% | 6h Ret: ${m.meanForwardRet6hPct}%`);
  }

  // ==========================================================================
  // FASE 5: PERGUNTA D — INCREMENTAL INFORMATION TEST (BETA CONTROL)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🔬 FASE 5 — INCREMENTAL INFORMATION TEST (BETA DECOUPLING)');
  console.log('='.repeat(75));

  // Benchmark: Average 6h forward return of the BTC market under 1D Macro Bull
  const marketBaseRetMacroBull = computeMarketBaselineReturn(candles1h, (c, i) => {
    const htf1d = getCausalHTF(candles1d, c.closeTime);
    const sma200 = computeSMA(htf1d, 200);
    return sma200 ? c.close > sma200 : false;
  });

  const springRetMacroBull = mMacroBull.meanForwardRet6hPct;
  const incrementalAlphaMacroBull = Number((springRetMacroBull - marketBaseRetMacroBull).toFixed(3));

  console.log(`Macro 1D Bull Regime:`);
  console.log(`  - E[Return_6h | Spring AND Macro Bull] : +${springRetMacroBull}%`);
  console.log(`  - E[Return_6h | Random Bar Macro Bull] : +${marketBaseRetMacroBull}%`);
  console.log(`  - Incremental Information (Delta Edge)  : ${incrementalAlphaMacroBull > 0 ? '+' : ''}${incrementalAlphaMacroBull}% (${incrementalAlphaMacroBull > 0 ? 'POSITIVE INCREMENTAL EDGE' : 'ZERO OR NEGATIVE INCREMENTAL EDGE'})`);

  const manifest = {
    experimentId: 'EXP-V5-EXOGENOUS-STATE-004',
    timestamp: new Date().toISOString(),
    baselineAll: mAll,
    htf4StateMatrix: htfResults,
    macro1dSMA200: { bull: mMacroBull, bear: mMacroBear },
    derivativesFunding: fundingResults,
    structuralWeekly: { weeklySweep: mWeeklySweep, nonWeeklySweep: mNonWeeklySweep },
    drawdownRegime: { deep: mDeepDd, shallow: mShallowDd },
    temporalStabilityMacroBull: annualMacroBull,
    incrementalityTest: {
      marketBaseline6hRet: marketBaseRetMacroBull,
      spring6hRet: springRetMacroBull,
      incrementalAlpha: incrementalAlphaMacroBull
    }
  };

  writeFileSync(resolve(outputDir, 'exogenous_state_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Exogenous State Suite Completed. Manifest saved to ${resolve(outputDir, 'exogenous_state_manifest.json')}`);
}

main().catch(err => {
  console.error('\n❌ Fatal error in exogenous state suite:', err);
  process.exit(1);
});

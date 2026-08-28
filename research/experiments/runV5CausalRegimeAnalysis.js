import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION & CONTINUITY
// ============================================================================
const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1h_multiyear_2023_2026.json');
const rawBuffer = readFileSync(datasetPath);
const datasetSha256 = crypto.createHash('sha256').update(rawBuffer).digest('hex');
const candles = JSON.parse(rawBuffer.toString('utf-8'));
candles.sort((a, b) => a.openTime - b.openTime);

console.log('='.repeat(75));
console.log('🔬 EXP-V5-REGIME-CAUSAL-003: CAUSAL REGIME & STRUCTURAL INVESTIGATION');
console.log('='.repeat(75));
console.log(`Source Dataset: BTCUSDT 1H Multi-Year (2023 - 2026) | SHA256: ${datasetSha256}`);
console.log(`Total 1H Candles: ${candles.length}`);

// ============================================================================
// 2. CAUSAL FEATURE EXTRACTION (PRE-ENTRY METRICS ONLY)
// ============================================================================
function extractSignalsWithCausalFeatures(allCandles) {
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

  const signals = [];
  const lookbackBuffer = [];

  // Compute global ATR distribution for quintile ranking
  const allAtrPcts = [];
  for (let i = 48; i < allCandles.length; i++) {
    const window = allCandles.slice(i - 14, i);
    const ranges = window.map(c => c.high - c.low);
    const atr = ranges.reduce((s, r) => s + r, 0) / ranges.length;
    allAtrPcts.push((atr / allCandles[i].close) * 100);
  }
  allAtrPcts.sort((a, b) => a - b);
  const getPercentile = (val, arr) => {
    let count = 0;
    for (const x of arr) {
      if (x <= val) count++;
      else break;
    }
    return Number(((count / arr.length) * 100).toFixed(1));
  };

  for (let i = 0; i < allCandles.length; i++) {
    const candle = allCandles[i];
    lookbackBuffer.push(candle);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();

    if (i < 48 || lookbackBuffer.length < 30) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    // Target primarily LONG (Wyckoff Spring)
    if (nar && nar.signal && nar.signal === 'LONG') {
      const priorCandles = lookbackBuffer.slice(0, -1);
      const prior14 = lookbackBuffer.slice(-15, -1);
      const prior24 = lookbackBuffer.slice(-25, -1);
      const prior48 = lookbackBuffer.slice(-49, -1);

      // Local ATR(14)
      const ranges14 = prior14.map(c => c.high - c.low);
      const localAtr = ranges14.reduce((s, r) => s + r, 0) / ranges14.length;
      const atrPct = (localAtr / candle.close) * 100;
      const atrPercentile = getPercentile(atrPct, allAtrPcts);

      // Volatility Quintile (Q1: 0-20%, Q2: 20-40%, Q3: 40-60%, Q4: 60-80%, Q5: 80-100%)
      let volQuintile = 'Q1 (0-20%)';
      if (atrPercentile > 80) volQuintile = 'Q5 (80-100%)';
      else if (atrPercentile > 60) volQuintile = 'Q4 (60-80%)';
      else if (atrPercentile > 40) volQuintile = 'Q3 (40-60%)';
      else if (atrPercentile > 20) volQuintile = 'Q2 (20-40%)';

      // Compression -> Expansion Features
      const ranges24 = prior24.map(c => c.high - c.low);
      const atr24 = ranges24.reduce((s, r) => s + r, 0) / ranges24.length;
      const compressionRatio24 = localAtr / Math.max(0.001, atr24);

      const ranges48 = prior48.map(c => c.high - c.low);
      const atr48 = ranges48.reduce((s, r) => s + r, 0) / ranges48.length;
      const compressionRatio48 = localAtr / Math.max(0.001, atr48);

      const range6h = Math.max(...lookbackBuffer.slice(-7, -1).map(c => c.high)) - Math.min(...lookbackBuffer.slice(-7, -1).map(c => c.low));
      const range24h = Math.max(...prior24.map(c => c.high)) - Math.min(...prior24.map(c => c.low));
      const rangeCompression6_24 = range6h / Math.max(0.001, range24h);

      // Trend & Momentum Features (pre-entry)
      const closes30 = priorCandles.slice(-30).map(c => c.close);
      const sma30 = closes30.reduce((s, c) => s + c, 0) / closes30.length;
      const distToSma30Pct = ((candle.close - sma30) / sma30) * 100;
      const slopeSma30 = (closes30[closes30.length - 1] - closes30[0]) / closes30.length;
      const trendState = candle.close > sma30 ? 'BULL' : 'BEAR';

      const ret6h = ((candle.close - allCandles[i - 6].close) / allCandles[i - 6].close) * 100;
      const ret12h = ((candle.close - allCandles[i - 12].close) / allCandles[i - 12].close) * 100;
      const ret24h = ((candle.close - allCandles[i - 24].close) / allCandles[i - 24].close) * 100;
      const ret48h = ((candle.close - allCandles[i - 48].close) / allCandles[i - 48].close) * 100;

      // Quality of Rejection (Sweep & Wick Structure)
      const candleRange = candle.high - candle.low;
      const recoveryPct = candleRange > 0 ? ((candle.close - candle.low) / candleRange) * 100 : 50;
      const clv = candleRange > 0 ? ((candle.close - candle.low) - (candle.high - candle.close)) / candleRange : 0;
      const upperWickPct = candleRange > 0 ? ((candle.high - candle.close) / candleRange) * 100 : 0;
      const lowerWickPct = candleRange > 0 ? ((Math.min(candle.open, candle.close) - candle.low) / candleRange) * 100 : 0;

      const priorSwingLow = Math.min(...priorCandles.map(c => c.low));
      const pierceDistance = priorSwingLow - candle.low;
      const pierceAtrMultiple = pierceDistance / Math.max(0.001, localAtr);

      const year = new Date(candle.openTime).getUTCFullYear();

      signals.push({
        index: i,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        year,
        direction: 'LONG',
        closePrice: candle.close,
        openPriceNext: allCandles[i + 1] ? allCandles[i + 1].open : candle.close,
        candle,
        localAtr,
        atrPct,
        atrPercentile,
        volQuintile,
        compressionRatio24,
        compressionRatio48,
        rangeCompression6_24,
        trendState,
        distToSma30Pct,
        slopeSma30,
        ret6h,
        ret12h,
        ret24h,
        ret48h,
        recoveryPct,
        clv,
        upperWickPct,
        lowerWickPct,
        pierceAtrMultiple,
        narrative: nar.narrative
      });
    }
  }

  return signals;
}

// ============================================================================
// 3. MULTI-HORIZON TRAJECTORY & EXECUTION EVALUATOR
// ============================================================================
function evaluateSignalSubset(allCandles, signals, subsetName = 'ALL') {
  if (signals.length === 0) return { name: subsetName, count: 0 };

  const horizons = [1, 2, 3, 4, 6, 8, 12, 24];
  const horizonStats = {};

  for (const h of horizons) {
    const mfeList = [];
    const maeList = [];
    const retList = [];
    let mfeFirst = 0;
    let maeFirst = 0;

    for (const sig of signals) {
      const idx = sig.index;
      const entry = sig.openPriceNext;
      const end = Math.min(allCandles.length - 1, idx + h);

      let maxFav = 0;
      let maxAdv = 0;
      let favBar = idx;
      let advBar = idx;

      for (let f = idx + 1; f <= end; f++) {
        const c = allCandles[f];
        const fav = (c.high - entry) / entry;
        const adv = (entry - c.low) / entry;
        if (fav > maxFav) { maxFav = fav; favBar = f; }
        if (adv > maxAdv) { maxAdv = adv; advBar = f; }
      }

      const finalPrice = allCandles[end].close;
      const netRet = (finalPrice - entry) / entry;

      mfeList.push(maxFav * 100);
      maeList.push(maxAdv * 100);
      retList.push(netRet * 100);

      if (favBar < advBar) mfeFirst++;
      else if (advBar < favBar) maeFirst++;
    }

    const n = signals.length;
    const mfeMean = mfeList.reduce((s, v) => s + v, 0) / n;
    const maeMean = maeList.reduce((s, v) => s + v, 0) / n;
    const meanRet = retList.reduce((s, v) => s + v, 0) / n;
    const posRate = (retList.filter(r => r > 0).length / n) * 100;

    horizonStats[`${h}h`] = {
      mfeMeanPct: Number(mfeMean.toFixed(3)),
      maeMeanPct: Number(maeMean.toFixed(3)),
      mfeMaeRatio: Number((mfeMean / Math.max(0.001, maeMean)).toFixed(2)),
      meanReturnPct: Number(meanRet.toFixed(3)),
      posReturnRatePct: Number(posRate.toFixed(2)),
      mfeFirstPct: Number(((mfeFirst / n) * 100).toFixed(2))
    };
  }

  // Curva A: Price Action Puro (Return 6h)
  const curveA_meanRet = horizonStats['6h'].meanReturnPct;

  // Curva B: Execução Idealizada (SL 1.0 ATR, TP 2.5R, Exit 6h, ZERO CUSTOS)
  // Curva C: Execução Realista (SL 1.0 ATR, TP 2.5R, Exit 6h, Taxas 0.20%, Slippage 0.04%, Adversarial Collision)
  const tradesIdeal = [];
  const tradesReal = [];

  for (const sig of signals) {
    const entryIdx = sig.index;
    if (entryIdx >= allCandles.length - 1) continue;

    const rawEntry = sig.openPriceNext;
    const slDist = Math.max(rawEntry * 0.002, sig.localAtr * 1.0);
    const stopPrice = rawEntry - slDist;
    const targetPrice = rawEntry + slDist * 2.5;

    // Simulate Realistic
    const slip = 0.0002;
    const taker = 0.001;
    const entryReal = rawEntry * (1 + slip);

    let exitRealPrice = null;
    let exitRealReason = null;
    let exitIdealPrice = null;
    let exitIdealReason = null;

    const maxHorizon = Math.min(allCandles.length - 1, entryIdx + 6);

    for (let f = entryIdx + 1; f <= maxHorizon; f++) {
      const c = allCandles[f];
      const hitSL = c.low <= stopPrice;
      const hitTP = c.high >= targetPrice;

      if (exitRealPrice === null) {
        if (hitSL && hitTP) {
          exitRealPrice = stopPrice * (1 - slip);
          exitRealReason = 'INTRABAR_COLLISION_SL';
        } else if (hitSL) {
          exitRealPrice = stopPrice * (1 - slip);
          exitRealReason = 'STOP_LOSS';
        } else if (hitTP) {
          exitRealPrice = targetPrice * (1 - slip);
          exitRealReason = 'TAKE_PROFIT';
        } else if (f === maxHorizon) {
          exitRealPrice = c.close * (1 - slip);
          exitRealReason = 'TIME_EXIT';
        }
      }

      if (exitIdealPrice === null) {
        if (hitTP) {
          exitIdealPrice = targetPrice;
          exitIdealReason = 'TAKE_PROFIT';
        } else if (hitSL) {
          exitIdealPrice = stopPrice;
          exitIdealReason = 'STOP_LOSS';
        } else if (f === maxHorizon) {
          exitIdealPrice = c.close;
          exitIdealReason = 'TIME_EXIT';
        }
      }

      if (exitRealPrice !== null && exitIdealPrice !== null) break;
    }

    if (exitRealPrice === null) {
      exitRealPrice = allCandles[maxHorizon].close * (1 - slip);
      exitRealReason = 'TIME_EXIT';
    }
    if (exitIdealPrice === null) {
      exitIdealPrice = allCandles[maxHorizon].close;
      exitIdealReason = 'TIME_EXIT';
    }

    const notional = 1000;
    // Idealized
    const retIdeal = (exitIdealPrice - rawEntry) / rawEntry;
    const pnlIdeal = notional * retIdeal;
    tradesIdeal.push(pnlIdeal);

    // Realistic
    const retReal = (exitRealPrice - entryReal) / entryReal;
    const grossReal = notional * retReal;
    const feesReal = notional * taker * 2;
    const netReal = grossReal - feesReal;
    tradesReal.push({ grossReal, feesReal, netReal, isWin: netReal > 0, reason: exitRealReason });
  }

  const n = signals.length;
  const pnlIdealSum = tradesIdeal.reduce((s, v) => s + v, 0);
  const idealExp = pnlIdealSum / n;

  const netRealSum = tradesReal.reduce((s, t) => s + t.netReal, 0);
  const grossRealSum = tradesReal.reduce((s, t) => s + t.grossReal, 0);
  const netExp = netRealSum / n;
  const grossExp = grossRealSum / n;

  const wins = tradesReal.filter(t => t.isWin);
  const losses = tradesReal.filter(t => !t.isWin);
  const netGain = wins.reduce((s, t) => s + t.netReal, 0);
  const netLoss = Math.abs(losses.reduce((s, t) => s + t.netReal, 0));
  const pfNet = netLoss > 0 ? Number((netGain / netLoss).toFixed(2)) : (netGain > 0 ? 10 : 0);
  const netWR = Number(((wins.length / n) * 100).toFixed(2));

  return {
    name: subsetName,
    count: n,
    horizonStats,
    curveA_pureReturn6h: curveA_meanRet,
    curveB_idealExpectancy: Number(idealExp.toFixed(3)),
    curveC_grossExpectancy: Number(grossExp.toFixed(3)),
    curveC_netExpectancy: Number(netExp.toFixed(3)),
    curveC_netPnL: Number(netRealSum.toFixed(2)),
    curveC_profitFactorNet: pfNet,
    curveC_netWinRate: netWR
  };
}

// ============================================================================
// MAIN EXPERIMENT PIPELINE
// ============================================================================
async function main() {
  const outputDir = resolve(__dirname, '../results/v5_regime_causal');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const allSignals = extractSignalsWithCausalFeatures(candles);
  console.log(`Total Multi-Year Long Signals Extracted: ${allSignals.length}`);

  // 1. ANNUAL YEAR-BY-YEAR CAUSAL PROFILE COMPARISON (2026 vs 2023-2025)
  console.log('\n' + '='.repeat(75));
  console.log('📅 1. YEAR-BY-YEAR CAUSAL PROFILE (2026 ANOMALY DECONSTRUCTION)');
  console.log('='.repeat(75));

  const years = [2023, 2024, 2025, 2026];
  const annualProfiles = {};

  for (const yr of years) {
    const yrSigs = allSignals.filter(s => s.year === yr);
    const evalResult = evaluateSignalSubset(candles, yrSigs, `Year ${yr}`);

    const avgAtrPct = yrSigs.reduce((s, sig) => s + sig.atrPct, 0) / Math.max(1, yrSigs.length);
    const avgRecovery = yrSigs.reduce((s, sig) => s + sig.recoveryPct, 0) / Math.max(1, yrSigs.length);
    const avgClv = yrSigs.reduce((s, sig) => s + sig.clv, 0) / Math.max(1, yrSigs.length);
    const avgComp24 = yrSigs.reduce((s, sig) => s + sig.compressionRatio24, 0) / Math.max(1, yrSigs.length);
    const avgRet24 = yrSigs.reduce((s, sig) => s + sig.ret24h, 0) / Math.max(1, yrSigs.length);
    const bullRate = (yrSigs.filter(s => s.trendState === 'BULL').length / Math.max(1, yrSigs.length)) * 100;

    annualProfiles[yr] = {
      ...evalResult,
      profile: {
        avgAtrPct: Number(avgAtrPct.toFixed(3)),
        avgRecoveryPct: Number(avgRecovery.toFixed(2)),
        avgClv: Number(avgClv.toFixed(3)),
        avgCompressionRatio24: Number(avgComp24.toFixed(3)),
        avgRet24hPct: Number(avgRet24.toFixed(2)),
        bullTrendRatePct: Number(bullRate.toFixed(2))
      }
    };

    console.log(`Year ${yr} (N=${yrSigs.length}):`);
    console.log(`  - 8h MFE/MAE: ${evalResult.horizonStats['8h'].mfeMaeRatio}x | Net Exp: $${evalResult.curveC_netExpectancy} | Net PF: ${evalResult.curveC_profitFactorNet} | Net WR: ${evalResult.curveC_netWinRate}%`);
    console.log(`  - Profile -> ATR: ${avgAtrPct.toFixed(3)}% | Recovery: ${avgRecovery.toFixed(1)}% | CLV: ${avgClv.toFixed(2)} | CompRatio24: ${avgComp24.toFixed(2)} | Ret24h: ${avgRet24.toFixed(2)}% | Bull%: ${bullRate.toFixed(1)}%`);
  }

  // 2. VOLATILITY QUINTILES (CAUSAL ATR PRE-ENTRY)
  console.log('\n' + '='.repeat(75));
  console.log('📊 2. VOLATILITY QUINTILES (PRE-ENTRY ATR PERCENTILES)');
  console.log('='.repeat(75));

  const quintiles = ['Q1 (0-20%)', 'Q2 (20-40%)', 'Q3 (40-60%)', 'Q4 (60-80%)', 'Q5 (80-100%)'];
  const quintileResults = {};

  for (const q of quintiles) {
    const qSigs = allSignals.filter(s => s.volQuintile === q);
    const res = evaluateSignalSubset(candles, qSigs, q);
    quintileResults[q] = res;
    console.log(`  ${q.padEnd(14)} -> N: ${String(res.count).padStart(3)} | 8h MFE/MAE: ${res.horizonStats?.['8h']?.mfeMaeRatio || 0}x | PureRet6h: ${res.curveA_pureReturn6h}% | GrossExp: $${res.curveC_grossExpectancy} | NetExp: $${res.curveC_netExpectancy} | NetPF: ${res.curveC_profitFactorNet}`);
  }

  // 3. QUALITY OF REJECTION (RECOVERY PERCENTAGE & CLV)
  console.log('\n' + '='.repeat(75));
  console.log('🎯 3. QUALITY OF REJECTION (RECOVERY & CLOSE LOCATION VALUE)');
  console.log('='.repeat(75));

  const highRecoverySigs = allSignals.filter(s => s.recoveryPct >= 70); // Closed in top 30% of candle
  const lowRecoverySigs = allSignals.filter(s => s.recoveryPct < 70);
  const resHighRec = evaluateSignalSubset(candles, highRecoverySigs, 'High Recovery (>=70%)');
  const resLowRec = evaluateSignalSubset(candles, lowRecoverySigs, 'Low Recovery (<70%)');

  console.log(`  High Recovery (>=70%) -> N: ${resHighRec.count} | 8h MFE/MAE: ${resHighRec.horizonStats['8h'].mfeMaeRatio}x | NetExp: $${resHighRec.curveC_netExpectancy} | NetPF: ${resHighRec.curveC_profitFactorNet} | NetWR: ${resHighRec.curveC_netWinRate}%`);
  console.log(`  Low Recovery (<70%)   -> N: ${resLowRec.count} | 8h MFE/MAE: ${resLowRec.horizonStats['8h'].mfeMaeRatio}x | NetExp: $${resLowRec.curveC_netExpectancy} | NetPF: ${resLowRec.curveC_profitFactorNet} | NetWR: ${resLowRec.curveC_netWinRate}%`);

  // 4. COMPRESSION -> EXPANSION RATIO (ATR CURRENT / ATR 24H)
  console.log('\n' + '='.repeat(75));
  console.log('⚡ 4. VOLATILITY COMPRESSION REGIME (ATR / ATR24h)');
  console.log('='.repeat(75));

  const compressedSigs = allSignals.filter(s => s.compressionRatio24 < 1.0); // Entering from volatility squeeze
  const expandedSigs = allSignals.filter(s => s.compressionRatio24 >= 1.0);
  const resComp = evaluateSignalSubset(candles, compressedSigs, 'Compressed (ATR < ATR24)');
  const resExp = evaluateSignalSubset(candles, expandedSigs, 'Expanded (ATR >= ATR24)');

  console.log(`  Compressed (ATR < ATR24)  -> N: ${resComp.count} | 8h MFE/MAE: ${resComp.horizonStats['8h'].mfeMaeRatio}x | NetExp: $${resComp.curveC_netExpectancy} | NetPF: ${resComp.curveC_profitFactorNet}`);
  console.log(`  Expanded (ATR >= ATR24)   -> N: ${resExp.count} | 8h MFE/MAE: ${resExp.horizonStats['8h'].mfeMaeRatio}x | NetExp: $${resExp.curveC_netExpectancy} | NetPF: ${resExp.curveC_profitFactorNet}`);

  // 5. TIME-TO-EXPANSION TRAJECTORY SIGNATURE
  console.log('\n' + '='.repeat(75));
  console.log('⏱️ 5. TIME-TO-EXPANSION TRAJECTORY SIGNATURE (FULL MULTI-YEAR)');
  console.log('='.repeat(75));

  const consolidatedEval = evaluateSignalSubset(candles, allSignals, 'Consolidated Multi-Year');
  for (const [h, st] of Object.entries(consolidatedEval.horizonStats)) {
    console.log(`  Horizon ${h.padEnd(4)} -> MFE Mean: ${st.mfeMeanPct}% | MAE Mean: ${st.maeMeanPct}% | MFE/MAE: ${st.mfeMaeRatio}x | PosRate: ${st.posReturnRatePct}% | MeanRet: ${st.meanReturnPct}% | MFE-First: ${st.mfeFirstPct}%`);
  }

  // 6. CAUSAL CONJUNCTION TEST (OOS VALIDATION OF REGIME HYPOTHESIS)
  // Hypothesis discovered: High Recovery (>=70%) AND Volatility Quintile Q4-Q5 (ATR >= 0.85%)
  console.log('\n' + '='.repeat(75));
  console.log('🔒 6. CAUSAL CONJUNCTION HYPOTHESIS & OUT-OF-SAMPLE TEST');
  console.log('='.repeat(75));

  // In-Sample (2023 - 2024) vs Out-of-Sample (2025 - 2026)
  const isSigsConjunction = allSignals.filter(s => (s.year === 2023 || s.year === 2024) && s.recoveryPct >= 70 && s.atrPct >= 0.85);
  const oosSigsConjunction = allSignals.filter(s => (s.year === 2025 || s.year === 2026) && s.recoveryPct >= 70 && s.atrPct >= 0.85);

  const resIS = evaluateSignalSubset(candles, isSigsConjunction, 'IS (2023-2024) Filtered Conjunction');
  const resOOS = evaluateSignalSubset(candles, oosSigsConjunction, 'OOS (2025-2026) Filtered Conjunction');

  console.log(`In-Sample (2023-2024) Filtered -> N: ${resIS.count} | 8h MFE/MAE: ${resIS.horizonStats?.['8h']?.mfeMaeRatio || 0}x | NetExp: $${resIS.curveC_netExpectancy} | NetPF: ${resIS.curveC_profitFactorNet} | NetWR: ${resIS.curveC_netWinRate}%`);
  console.log(`OOS (2025-2026) Filtered       -> N: ${resOOS.count} | 8h MFE/MAE: ${resOOS.horizonStats?.['8h']?.mfeMaeRatio || 0}x | NetExp: $${resOOS.curveC_netExpectancy} | NetPF: ${resOOS.curveC_profitFactorNet} | NetWR: ${resOOS.curveC_netWinRate}%`);

  const manifest = {
    experimentId: 'EXP-V5-REGIME-CAUSAL-003',
    timestamp: new Date().toISOString(),
    datasetSha256,
    totalSignals: allSignals.length,
    annualProfiles,
    quintiles: quintileResults,
    qualityOfRejection: { highRecovery: resHighRec, lowRecovery: resLowRec },
    compression: { compressed: resComp, expanded: resExp },
    timeToExpansion: consolidatedEval.horizonStats,
    conjunctionTest: { is: resIS, oos: resOOS }
  };

  writeFileSync(resolve(outputDir, 'regime_causal_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Causal Regime Analysis Finished. Manifest saved to ${resolve(outputDir, 'regime_causal_manifest.json')}`);
}

main().catch(err => {
  console.error('\n❌ Fatal error in causal regime analysis:', err);
  process.exit(1);
});

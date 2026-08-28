import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION & DETERMINISTIC MULTI-TIMEFRAME AGGREGATION
// ============================================================================
const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
const rawFileBuffer = readFileSync(datasetPath);
const datasetSha256 = crypto.createHash('sha256').update(rawFileBuffer).digest('hex');
const dataset1mCandles = JSON.parse(rawFileBuffer.toString('utf-8'));
dataset1mCandles.sort((a, b) => a.openTime - b.openTime);

/**
 * Deterministically aggregates M1 candles into 5m, 15m, or 1h candles aligned on UTC boundaries.
 */
function aggregateCandles(m1Candles, timeframeMinutes) {
  const tfMs = timeframeMinutes * 60 * 1000;
  const aggregated = [];
  const buckets = new Map();

  for (const c of m1Candles) {
    const bucketTime = Math.floor(c.openTime / tfMs) * tfMs;
    if (!buckets.has(bucketTime)) {
      buckets.set(bucketTime, []);
    }
    buckets.get(bucketTime).push(c);
  }

  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const bTime of sortedBucketTimes) {
    const group = buckets.get(bTime);
    if (group.length === 0) continue;

    group.sort((a, b) => a.openTime - b.openTime);

    const open = group[0].open;
    const high = Math.max(...group.map(c => c.high));
    const low = Math.min(...group.map(c => c.low));
    const close = group[group.length - 1].close;
    const volume = group.reduce((sum, c) => sum + (c.volume || 0), 0);
    const closeTime = group[group.length - 1].closeTime || (bTime + tfMs - 1);

    aggregated.push({
      openTime: bTime,
      timestamp: bTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime,
      m1Count: group.length
    });
  }

  return aggregated;
}

// ============================================================================
// 2. TEMPORAL PARTITIONING (IS 60%, VAL 20%, OOS 20%)
// ============================================================================
function partitionDataset(candles) {
  const n = candles.length;
  const isEnd = Math.floor(n * 0.60);
  const valEnd = Math.floor(n * 0.80);

  return {
    is: candles.slice(0, isEnd),
    val: candles.slice(isEnd, valEnd),
    oos: candles.slice(valEnd),
    bounds: {
      total: n,
      isCount: isEnd,
      valCount: valEnd - isEnd,
      oosCount: n - valEnd
    }
  };
}

// ============================================================================
// 3. SIGNAL EXTRACTION (FROZEN V5 ABD RULES, LOOKAHEAD-FREE)
// ============================================================================
function extractSignals(candles, config = {}) {
  const v5Config = {
    lookback: config.lookback || 30,
    volumeZScore: config.volumeZScore !== undefined ? config.volumeZScore : 1.50,
    minPierceATR: config.minPierceATR !== undefined ? config.minPierceATR : 0.50,
    pocProximity: 0.003,
    requireVolume: config.requireVolume !== false,
    requirePierce: config.requirePierce !== false,
    requirePOC: false, // FROZEN RULE: POC filter C permanently OFF
    requireReversal: config.requireReversal !== false,
  };

  const v5Engine = new WyckoffVolumeProfileEngine(v5Config);
  const signals = [];
  const lookbackBuffer = [];

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    lookbackBuffer.push(candle);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();

    if (lookbackBuffer.length < v5Config.lookback) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    if (nar && nar.signal && (nar.signal === 'LONG' || nar.signal === 'SHORT')) {
      const priorCandles = lookbackBuffer.slice(0, -1);
      const ranges = priorCandles.map(c => c.high - c.low);
      const localAtr = ranges.reduce((s, r) => s + r, 0) / Math.max(1, ranges.length);

      // Swing extremes of previous candles (prior to setup candle)
      const swingLowPrior = Math.min(...priorCandles.map(c => c.low));
      const swingHighPrior = Math.max(...priorCandles.map(c => c.high));

      signals.push({
        index: i,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        direction: nar.signal,
        closePrice: candle.close,
        openPriceNext: candles[i + 1] ? candles[i + 1].open : candle.close,
        candle,
        localAtr,
        swingLowSetup: candle.low,
        swingHighSetup: candle.high,
        swingLowPrior,
        swingHighPrior,
        narrative: nar.narrative
      });
    }
  }

  return signals;
}

// ============================================================================
// 4. CAMADA 1 — SIGNAL-LEVEL TRAJECTORY ANALYSIS (NO FEES, NO SL, NO TP)
// ============================================================================
function evaluateSignalTrajectory(candles, signals, horizonBarsArray, tfName) {
  const horizonsSummary = {};

  for (const h of horizonBarsArray) {
    const mfeList = [];
    const maeList = [];
    const retList = [];
    const timeToMfeList = [];
    const timeToMaeList = [];

    let mfeFirstCount = 0;
    let maeFirstCount = 0;
    let sameBarCount = 0;

    const longList = [];
    const shortList = [];

    for (const sig of signals) {
      const idx = sig.index;
      const entry = sig.closePrice;
      const isLong = sig.direction === 'LONG';
      const end = Math.min(candles.length - 1, idx + h);
      if (end <= idx) continue;

      let maxFav = 0;
      let maxAdv = 0;
      let favBar = idx;
      let advBar = idx;

      for (let f = idx + 1; f <= end; f++) {
        const c = candles[f];
        const fav = isLong ? (c.high - entry) / entry : (entry - c.low) / entry;
        const adv = isLong ? (entry - c.low) / entry : (c.high - entry) / entry;

        if (fav > maxFav) {
          maxFav = fav;
          favBar = f;
        }
        if (adv > maxAdv) {
          maxAdv = adv;
          advBar = f;
        }
      }

      const finalPrice = candles[end].close;
      const netRet = isLong ? (finalPrice - entry) / entry : (entry - finalPrice) / entry;

      const mfePct = maxFav * 100;
      const maePct = maxAdv * 100;
      const retPct = netRet * 100;

      mfeList.push(mfePct);
      maeList.push(maePct);
      retList.push(retPct);

      timeToMfeList.push(favBar - idx);
      timeToMaeList.push(advBar - idx);

      if (favBar < advBar) mfeFirstCount++;
      else if (advBar < favBar) maeFirstCount++;
      else sameBarCount++;

      if (isLong) longList.push({ mfePct, maePct, retPct });
      else shortList.push({ mfePct, maePct, retPct });
    }

    const n = mfeList.length;
    if (n === 0) continue;

    retList.sort((a, b) => a - b);
    mfeList.sort((a, b) => a - b);
    maeList.sort((a, b) => a - b);
    timeToMfeList.sort((a, b) => a - b);
    timeToMaeList.sort((a, b) => a - b);

    const quantile = (arr, q) => arr[Math.floor((arr.length - 1) * q)] || 0;

    const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const posCount = retList.filter(r => r > 0).length;

    const longRet = longList.map(x => x.retPct);
    const shortRet = shortList.map(x => x.retPct);

    horizonsSummary[`${h}bars`] = {
      horizonBars: h,
      signalsEvaluated: n,
      positiveReturnPct: Number(((posCount / n) * 100).toFixed(2)),
      negativeReturnPct: Number((((n - posCount) / n) * 100).toFixed(2)),
      meanReturnPct: Number(mean(retList).toFixed(3)),
      medianReturnPct: Number(quantile(retList, 0.50).toFixed(3)),
      mfeMeanPct: Number(mean(mfeList).toFixed(3)),
      mfeMedianPct: Number(quantile(mfeList, 0.50).toFixed(3)),
      maeMeanPct: Number(mean(maeList).toFixed(3)),
      maeMedianPct: Number(quantile(maeList, 0.50).toFixed(3)),
      mfeMaeRatio: Number((mean(mfeList) / Math.max(0.001, mean(maeList))).toFixed(2)),
      mfeFirstPct: Number(((mfeFirstCount / n) * 100).toFixed(2)),
      maeFirstPct: Number(((maeFirstCount / n) * 100).toFixed(2)),
      sameBarPct: Number(((sameBarCount / n) * 100).toFixed(2)),
      timeToMfeMedianBars: quantile(timeToMfeList, 0.50),
      timeToMaeMedianBars: quantile(timeToMaeList, 0.50),
      quantilesReturn: {
        p25: Number(quantile(retList, 0.25).toFixed(3)),
        p50: Number(quantile(retList, 0.50).toFixed(3)),
        p75: Number(quantile(retList, 0.75).toFixed(3)),
        p90: Number(quantile(retList, 0.90).toFixed(3))
      },
      longDecomposition: {
        count: longList.length,
        meanReturnPct: longList.length > 0 ? Number(mean(longRet).toFixed(3)) : 0,
        posReturnPct: longList.length > 0 ? Number(((longRet.filter(r => r > 0).length / longList.length) * 100).toFixed(2)) : 0,
        mfeMeanPct: longList.length > 0 ? Number(mean(longList.map(x => x.mfePct)).toFixed(3)) : 0,
        maeMeanPct: longList.length > 0 ? Number(mean(longList.map(x => x.maePct)).toFixed(3)) : 0
      },
      shortDecomposition: {
        count: shortList.length,
        meanReturnPct: shortList.length > 0 ? Number(mean(shortRet).toFixed(3)) : 0,
        posReturnPct: shortList.length > 0 ? Number(((shortRet.filter(r => r > 0).length / shortList.length) * 100).toFixed(2)) : 0,
        mfeMeanPct: shortList.length > 0 ? Number(mean(shortList.map(x => x.mfePct)).toFixed(3)) : 0,
        maeMeanPct: shortList.length > 0 ? Number(mean(shortList.map(x => x.maePct)).toFixed(3)) : 0
      }
    };
  }

  return horizonsSummary;
}

// ============================================================================
// 5. CAMADA 2 — EXECUTION-LEVEL SIMULATOR (WITH STRICT COST & METRICS DECOMPOSITION)
// ============================================================================
function simulateTradesExecution(candles, signals, execConfig = {}) {
  const {
    entryModel = 'MODEL_A', // 'MODEL_A' (close t) or 'MODEL_B' (open t+1)
    slType = 'ATR', // 'ATR' or 'SWING'
    slMultiplier = 1.0, // for ATR
    tpRMultiplier = 2.0,
    timeExitBars = 12,
    costScenario = 'FEE_AND_SLIPPAGE' // 'ZERO_COST', 'FEE_ONLY', 'FEE_AND_SLIPPAGE', 'STRESS'
  } = execConfig;

  let takerFeePct = 0.001; // 0.10% per leg
  let slippagePct = 0.0002; // 0.02% per leg

  if (costScenario === 'ZERO_COST') {
    takerFeePct = 0;
    slippagePct = 0;
  } else if (costScenario === 'FEE_ONLY') {
    slippagePct = 0;
  } else if (costScenario === 'STRESS') {
    slippagePct = 0.0005; // 0.05% per leg
  }

  const trades = [];

  for (const sig of signals) {
    const entryIdx = sig.index;
    if (entryIdx >= candles.length - 1) continue;

    const isLong = sig.direction === 'LONG';
    const rawEntryPrice = entryModel === 'MODEL_A' ? sig.closePrice : sig.openPriceNext;
    const entryPrice = isLong ? rawEntryPrice * (1 + slippagePct) : rawEntryPrice * (1 - slippagePct);

    // Compute Stop Distance
    let slDistance = 0;
    if (slType === 'ATR') {
      slDistance = Math.max(rawEntryPrice * 0.002, sig.localAtr * slMultiplier);
    } else if (slType === 'SWING') {
      slDistance = isLong ? (rawEntryPrice - sig.swingLowSetup) : (sig.swingHighSetup - rawEntryPrice);
      if (slDistance <= 0 || slDistance > rawEntryPrice * 0.05) {
        slDistance = Math.max(rawEntryPrice * 0.002, sig.localAtr * 1.5);
      }
    }

    const stopPrice = isLong ? (rawEntryPrice - slDistance) : (rawEntryPrice + slDistance);
    const targetPrice = isLong ? (rawEntryPrice + slDistance * tpRMultiplier) : (rawEntryPrice - slDistance * tpRMultiplier);

    let exitPrice = null;
    let exitReason = null;
    let exitIndex = null;

    const maxHorizon = Math.min(candles.length - 1, entryIdx + timeExitBars);

    for (let f = entryIdx + 1; f <= maxHorizon; f++) {
      const c = candles[f];

      if (isLong) {
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
      } else {
        const hitSL = c.high >= stopPrice;
        const hitTP = c.low <= targetPrice;

        if (hitSL && hitTP) {
          exitPrice = stopPrice * (1 + slippagePct);
          exitReason = 'INTRABAR_COLLISION_SL';
          exitIndex = f;
          break;
        } else if (hitSL) {
          exitPrice = stopPrice * (1 + slippagePct);
          exitReason = 'STOP_LOSS';
          exitIndex = f;
          break;
        } else if (hitTP) {
          exitPrice = targetPrice * (1 + slippagePct);
          exitReason = 'TAKE_PROFIT';
          exitIndex = f;
          break;
        }
      }

      if (f === maxHorizon) {
        exitPrice = isLong ? c.close * (1 - slippagePct) : c.close * (1 + slippagePct);
        exitReason = 'TIME_EXIT';
        exitIndex = f;
        break;
      }
    }

    if (exitPrice === null) {
      const lastC = candles[candles.length - 1];
      exitPrice = isLong ? lastC.close * (1 - slippagePct) : lastC.close * (1 + slippagePct);
      exitReason = 'END_OF_DATA';
      exitIndex = candles.length - 1;
    }

    const notional = 1000;
    const priceReturn = isLong ? (exitPrice - entryPrice) / entryPrice : (entryPrice - exitPrice) / entryPrice;
    const grossPnL = notional * priceReturn;
    const totalFees = notional * takerFeePct * 2;
    const slippageCost = notional * (slippagePct * 2);
    const netPnL = grossPnL - totalFees;
    const rMultiple = slDistance > 0 ? ((isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice)) / slDistance) : 0;

    trades.push({
      signalId: sig.index,
      timestamp: sig.openTime,
      direction: sig.direction,
      entryPrice: Number(entryPrice.toFixed(2)),
      stopPrice: Number(stopPrice.toFixed(2)),
      targetPrice: Number(targetPrice.toFixed(2)),
      exitPrice: Number(exitPrice.toFixed(2)),
      exitReason,
      holdingBars: exitIndex - entryIdx,
      slDistancePct: Number(((slDistance / rawEntryPrice) * 100).toFixed(4)),
      grossPnL: Number(grossPnL.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      slippageCost: Number(slippageCost.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      rMultiple: Number(rMultiple.toFixed(3)),
      isTpHit: exitReason === 'TAKE_PROFIT',
      isSlHit: exitReason === 'STOP_LOSS' || exitReason === 'INTRABAR_COLLISION_SL',
      isGrossWin: grossPnL > 0,
      isNetWin: netPnL > 0
    });
  }

  return trades;
}

// ============================================================================
// 6. MULTI-CONCEPT METRIC AGGREGATOR (SEPARATES GROSS WIN RATE & TP HIT RATE)
// ============================================================================
function computeDetailedMetrics(trades, totalCandles) {
  const n = trades.length;
  if (n === 0) {
    return {
      trades: 0,
      tpHitRate: 0,
      slHitRate: 0,
      grossTradeWinRate: 0,
      netTradeWinRate: 0,
      timeExitPositiveRate: 0,
      grossPnL: 0,
      totalFees: 0,
      totalSlippage: 0,
      netPnL: 0,
      profitFactorGross: 0,
      profitFactorNet: 0,
      grossExpectancy: 0,
      feeExpectancy: 0,
      netExpectancy: 0,
      medianR: 0,
      maxDrawdownNet: 0,
      sustainableFrictionPct: 0
    };
  }

  const tpHits = trades.filter(t => t.isTpHit).length;
  const slHits = trades.filter(t => t.isSlHit).length;
  const grossWins = trades.filter(t => t.isGrossWin).length;
  const netWins = trades.filter(t => t.isNetWin).length;

  const timeExitTrades = trades.filter(t => t.exitReason === 'TIME_EXIT');
  const timeExitPos = timeExitTrades.filter(t => t.isGrossWin).length;

  const totalGrossPnL = trades.reduce((s, t) => s + t.grossPnL, 0);
  const totalFees = trades.reduce((s, t) => s + t.totalFees, 0);
  const totalSlippage = trades.reduce((s, t) => s + t.slippageCost, 0);
  const totalNetPnL = trades.reduce((s, t) => s + t.netPnL, 0);

  const grossGain = trades.filter(t => t.grossPnL > 0).reduce((s, t) => s + t.grossPnL, 0);
  const grossLoss = Math.abs(trades.filter(t => t.grossPnL <= 0).reduce((s, t) => s + t.grossPnL, 0));
  const profitFactorGross = grossLoss > 0 ? Number((grossGain / grossLoss).toFixed(2)) : (grossGain > 0 ? 10 : 0);

  const netGain = trades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0);
  const netLoss = Math.abs(trades.filter(t => t.netPnL <= 0).reduce((s, t) => s + t.netPnL, 0));
  const profitFactorNet = netLoss > 0 ? Number((netGain / netLoss).toFixed(2)) : (netGain > 0 ? 10 : 0);

  const rList = trades.map(t => t.rMultiple).sort((a, b) => a - b);
  const medianR = rList[Math.floor(n / 2)];

  // Net Max Drawdown
  let equity = 10000;
  let peak = equity;
  let maxDD = 0;
  for (const t of trades) {
    equity += t.netPnL;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  const grossExp = totalGrossPnL / n;
  const sustainableFrictionPct = (grossExp / 1000) * 100;

  return {
    trades: n,
    tpHitRate: Number(((tpHits / n) * 100).toFixed(2)),
    slHitRate: Number(((slHits / n) * 100).toFixed(2)),
    grossTradeWinRate: Number(((grossWins / n) * 100).toFixed(2)),
    netTradeWinRate: Number(((netWins / n) * 100).toFixed(2)),
    timeExitPositiveRate: timeExitTrades.length > 0 ? Number(((timeExitPos / timeExitTrades.length) * 100).toFixed(2)) : 0,
    grossPnL: Number(totalGrossPnL.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    totalSlippage: Number(totalSlippage.toFixed(2)),
    netPnL: Number(totalNetPnL.toFixed(2)),
    profitFactorGross,
    profitFactorNet,
    grossExpectancy: Number(grossExp.toFixed(3)),
    feeExpectancy: Number((totalFees / n).toFixed(3)),
    netExpectancy: Number((totalNetPnL / n).toFixed(3)),
    medianR: Number(medianR.toFixed(3)),
    maxDrawdownNet: Number(maxDD.toFixed(2)),
    sustainableFrictionPct: Number(sustainableFrictionPct.toFixed(4))
  };
}

// ============================================================================
// 7. STATISTICAL VALIDATION (BOOTSTRAP & RANDOMIZATION PERMUTATION)
// ============================================================================
function runBootstrap(trades, iterations = 2000) {
  if (!trades || trades.length < 5) return { ci95Low: 0, ci95High: 0, ci99Low: 0, ci99High: 0 };

  const expectancies = [];
  const n = trades.length;

  for (let b = 0; b < iterations; b++) {
    let sumNet = 0;
    for (let i = 0; i < n; i++) {
      const randIdx = Math.floor(Math.random() * n);
      sumNet += trades[randIdx].netPnL;
    }
    expectancies.push(sumNet / n);
  }

  expectancies.sort((a, b) => a - b);

  return {
    ci95Low: Number(expectancies[Math.floor(iterations * 0.025)].toFixed(3)),
    ci95High: Number(expectancies[Math.floor(iterations * 0.975)].toFixed(3)),
    ci99Low: Number(expectancies[Math.floor(iterations * 0.005)].toFixed(3)),
    ci99High: Number(expectancies[Math.floor(iterations * 0.995)].toFixed(3))
  };
}

function runPermutationTest(candles, signalCount, baseExecConfig, iterations = 1000) {
  const randomNetExp = [];

  for (let b = 0; b < iterations; b++) {
    const randomSignals = [];
    for (let i = 0; i < signalCount; i++) {
      const randIdx = Math.floor(Math.random() * (candles.length - 60)) + 30;
      const isLong = Math.random() > 0.5;
      const c = candles[randIdx];
      randomSignals.push({
        index: randIdx,
        openTime: c.openTime,
        closeTime: c.closeTime,
        direction: isLong ? 'LONG' : 'SHORT',
        closePrice: c.close,
        openPriceNext: candles[randIdx + 1] ? candles[randIdx + 1].open : c.close,
        candle: c,
        localAtr: c.high - c.low,
        swingLowSetup: c.low,
        swingHighSetup: c.high
      });
    }

    const t = simulateTradesExecution(candles, randomSignals, baseExecConfig);
    const m = computeDetailedMetrics(t, candles.length);
    randomNetExp.push(m.netExpectancy);
  }

  randomNetExp.sort((a, b) => a - b);
  return randomNetExp;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================
async function main() {
  console.log('='.repeat(75));
  console.log('🏛️ EXP-V5-TF-001: WYCKOFF ABD MULTI-TIMEFRAME SURVIVAL TEST');
  console.log('='.repeat(75));

  const outputDir = resolve(__dirname, '../results/v5_multitimeframe');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  console.log(`Source Dataset: BTCUSDT M1 90d | Hash: ${datasetSha256}`);
  console.log(`Total M1 Candles: ${dataset1mCandles.length}`);

  // Reconstruct Timeframes
  console.log('\n--- 1. CANDLE RECONSTRUCTION & AUDIT ---');
  const tf5m = aggregateCandles(dataset1mCandles, 5);
  const tf15m = aggregateCandles(dataset1mCandles, 15);
  const tf1h = aggregateCandles(dataset1mCandles, 60);

  console.log(`Aggregated 5m Candles : ${tf5m.length} (Expected: ~${129600 / 5})`);
  console.log(`Aggregated 15m Candles: ${tf15m.length} (Expected: ~${129600 / 15})`);
  console.log(`Aggregated 1h Candles : ${tf1h.length} (Expected: ~${129600 / 60})`);

  // Partitions
  const p5m = partitionDataset(tf5m);
  const p15m = partitionDataset(tf15m);
  const p1h = partitionDataset(tf1h);

  console.log(`\nPartitions Summary (IS / VAL / OOS):`);
  console.log(`  - 5m  : IS=${p5m.is.length} | VAL=${p5m.val.length} | OOS=${p5m.oos.length}`);
  console.log(`  - 15m : IS=${p15m.is.length} | VAL=${p15m.val.length} | OOS=${p15m.oos.length}`);
  console.log(`  - 1h  : IS=${p1h.is.length} | VAL=${p1h.val.length} | OOS=${p1h.oos.length}`);

  // ==========================================================================
  // CAMADA 1: SIGNAL-LEVEL TRAJECTORY ANALYSIS
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('📡 CAMADA 1 — SIGNAL-LEVEL FORWARD TRAJECTORY EVALUATION (IN-SAMPLE)');
  console.log('='.repeat(75));

  const sig5m_IS = extractSignals(p5m.is);
  const sig15m_IS = extractSignals(p15m.is);
  const sig1h_IS = extractSignals(p1h.is);

  console.log(`In-Sample Raw V5 ABD Signals:`);
  console.log(`  - 5m  : ${sig5m_IS.length} signals (LONG: ${sig5m_IS.filter(s => s.direction === 'LONG').length}, SHORT: ${sig5m_IS.filter(s => s.direction === 'SHORT').length})`);
  console.log(`  - 15m : ${sig15m_IS.length} signals (LONG: ${sig15m_IS.filter(s => s.direction === 'LONG').length}, SHORT: ${sig15m_IS.filter(s => s.direction === 'SHORT').length})`);
  console.log(`  - 1h  : ${sig1h_IS.length} signals (LONG: ${sig1h_IS.filter(s => s.direction === 'LONG').length}, SHORT: ${sig1h_IS.filter(s => s.direction === 'SHORT').length})`);

  // Forward horizons for each TF
  const traj5m = evaluateSignalTrajectory(p5m.is, sig5m_IS, [3, 6, 12, 24, 48], '5m'); // 15m, 30m, 60m, 120m, 240m
  const traj15m = evaluateSignalTrajectory(p15m.is, sig15m_IS, [2, 4, 8, 16, 32], '15m'); // 30m, 60m, 120m, 240m, 480m
  const traj1h = evaluateSignalTrajectory(p1h.is, sig1h_IS, [2, 4, 8, 12, 24], '1h'); // 2h, 4h, 8h, 12h, 24h

  console.log('\n--- 5m Signal Trajectory ---');
  for (const [k, v] of Object.entries(traj5m)) {
    console.log(`  ${k.padEnd(8)} -> MFE Mean: ${v.mfeMeanPct}% | MAE Mean: ${v.maeMeanPct}% | MFE/MAE: ${v.mfeMaeRatio}x | PosRet: ${v.positiveReturnPct}% | MeanRet: ${v.meanReturnPct}% | MFE-First: ${v.mfeFirstPct}%`);
  }

  console.log('\n--- 15m Signal Trajectory ---');
  for (const [k, v] of Object.entries(traj15m)) {
    console.log(`  ${k.padEnd(8)} -> MFE Mean: ${v.mfeMeanPct}% | MAE Mean: ${v.maeMeanPct}% | MFE/MAE: ${v.mfeMaeRatio}x | PosRet: ${v.positiveReturnPct}% | MeanRet: ${v.meanReturnPct}% | MFE-First: ${v.mfeFirstPct}%`);
  }

  console.log('\n--- 1h Signal Trajectory ---');
  for (const [k, v] of Object.entries(traj1h)) {
    console.log(`  ${k.padEnd(8)} -> MFE Mean: ${v.mfeMeanPct}% | MAE Mean: ${v.maeMeanPct}% | MFE/MAE: ${v.mfeMaeRatio}x | PosRet: ${v.positiveReturnPct}% | MeanRet: ${v.meanReturnPct}% | MFE-First: ${v.mfeFirstPct}%`);
  }

  // ==========================================================================
  // CAMADA 2: EXECUTION-LEVEL ANALYSIS (CONTROLLED MATRIX)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('⚙️ CAMADA 2 — EXECUTION MATRIX EVALUATION (IN-SAMPLE)');
  console.log('='.repeat(75));

  const slAtrOptions = [0.75, 1.0, 1.5, 2.0];
  const tpROptions = [1.5, 2.0, 2.5, 3.0];
  const tfConfigs = [
    { name: '5m', candles: p5m.is, signals: sig5m_IS, timeExitBars: 12 },
    { name: '15m', candles: p15m.is, signals: sig15m_IS, timeExitBars: 8 },
    { name: '1h', candles: p1h.is, signals: sig1h_IS, timeExitBars: 6 }
  ];

  const executionResultsByTf = {};

  for (const tfc of tfConfigs) {
    const tfResults = [];
    for (const sl of slAtrOptions) {
      for (const tp of tpROptions) {
        // Run with standard Fee + Slippage
        const trades = simulateTradesExecution(tfc.candles, tfc.signals, {
          slType: 'ATR',
          slMultiplier: sl,
          tpRMultiplier: tp,
          timeExitBars: tfc.timeExitBars,
          costScenario: 'FEE_AND_SLIPPAGE'
        });
        const m = computeDetailedMetrics(trades, tfc.candles.length);
        tfResults.push({
          params: { slMultiplier: sl, tpRMultiplier: tp, timeExitBars: tfc.timeExitBars },
          metrics: m,
          trades
        });
      }
    }
    // Also test Structural Swing Invalidation Stop
    const swingTrades = simulateTradesExecution(tfc.candles, tfc.signals, {
      slType: 'SWING',
      tpRMultiplier: 2.0,
      timeExitBars: tfc.timeExitBars,
      costScenario: 'FEE_AND_SLIPPAGE'
    });
    const mSwing = computeDetailedMetrics(swingTrades, tfc.candles.length);
    tfResults.push({
      params: { slType: 'SWING', tpRMultiplier: 2.0, timeExitBars: tfc.timeExitBars },
      metrics: mSwing,
      trades: swingTrades
    });

    // Sort by Net Expectancy
    tfResults.sort((a, b) => b.metrics.netExpectancy - a.metrics.netExpectancy);
    executionResultsByTf[tfc.name] = tfResults;

    console.log(`\n--- Top 3 Execution Configurations for ${tfc.name} (IS) ---`);
    for (let i = 0; i < Math.min(3, tfResults.length); i++) {
      const item = tfResults[i];
      const p = item.params;
      const m = item.metrics;
      console.log(`  #${i + 1} | ${p.slType === 'SWING' ? 'SWING STOP' : `SL: ${p.slMultiplier} ATR`}, TP: ${p.tpRMultiplier}R -> Trades: ${m.trades} | TPHit: ${m.tpHitRate}% | GrossWR: ${m.grossTradeWinRate}% | NetWR: ${m.netTradeWinRate}% | GrossExp: $${m.grossExpectancy} | FeeExp: $${m.feeExpectancy} | NetExp: $${m.netExpectancy} | NetPnL: $${m.netPnL}`);
    }
  }

  // ==========================================================================
  // 3. COST DECOMPOSITION (ZERO COST vs FEE ONLY vs FEE+SLIPPAGE vs STRESS)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('💳 COST DECOMPOSITION ON BEST CONFIGURATION PER TIMEFRAME');
  console.log('='.repeat(75));

  const costScenarios = ['ZERO_COST', 'FEE_ONLY', 'FEE_AND_SLIPPAGE', 'STRESS'];
  const costDecompByTf = {};

  for (const tfc of tfConfigs) {
    const bestConfig = executionResultsByTf[tfc.name][0].params;
    costDecompByTf[tfc.name] = {};
    console.log(`\n--- ${tfc.name} Cost Breakdown (Config: ${JSON.stringify(bestConfig)}) ---`);
    for (const cs of costScenarios) {
      const trades = simulateTradesExecution(tfc.candles, tfc.signals, { ...bestConfig, costScenario: cs });
      const m = computeDetailedMetrics(trades, tfc.candles.length);
      costDecompByTf[tfc.name][cs] = m;
      console.log(`  ${cs.padEnd(18)} -> NetPnL: $${m.netPnL.toString().padStart(8)} | NetExp: $${m.netExpectancy.toString().padStart(7)} | PF_Net: ${m.profitFactorNet} | NetWR: ${m.netTradeWinRate}%`);
    }
  }

  // ==========================================================================
  // 4. STATISTICAL SIGNIFICANCE (BOOTSTRAP & RANDOM PERMUTATION ON BEST TF)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🎲 STATISTICAL VALIDATION (BOOTSTRAP & PERMUTATION)');
  console.log('='.repeat(75));

  const statisticalResults = {};
  for (const tfc of tfConfigs) {
    const bestItem = executionResultsByTf[tfc.name][0];
    const bs = runBootstrap(bestItem.trades, 2000);
    const permDist = runPermutationTest(tfc.candles, tfc.signals.length, bestItem.params, 500);
    const higherCount = permDist.filter(e => e >= bestItem.metrics.netExpectancy).length;
    const pValue = Number((higherCount / permDist.length).toFixed(4));
    const randomMedian = permDist[Math.floor(permDist.length / 2)];

    statisticalResults[tfc.name] = { bootstrap: bs, pValue, randomMedian };
    console.log(`\n--- ${tfc.name} Statistical Significance ---`);
    console.log(`  Observed Net Expectancy : $${bestItem.metrics.netExpectancy}`);
    console.log(`  Bootstrap CI95          : [$${bs.ci95Low}, $${bs.ci95High}]`);
    console.log(`  Bootstrap CI99          : [$${bs.ci99Low}, $${bs.ci99High}]`);
    console.log(`  Random Permutation p-val: ${pValue} (Median Random: $${randomMedian.toFixed(3)}) -> ${pValue < 0.05 ? 'SIGNIFICANT p < 0.05 ✅' : 'NOT SIGNIFICANT ❌'}`);
  }

  // ==========================================================================
  // 5. TEMPORAL ROBUSTNESS (4 IN-SAMPLE SUB-BLOCKS)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('📅 TEMPORAL ROBUSTNESS (4 IN-SAMPLE SUB-BLOCKS)');
  console.log('='.repeat(75));

  const temporalBlocksByTf = {};
  for (const tfc of tfConfigs) {
    const bestConfig = executionResultsByTf[tfc.name][0].params;
    const blockSize = Math.floor(tfc.candles.length / 4);
    temporalBlocksByTf[tfc.name] = [];
    console.log(`\n--- ${tfc.name} Temporal Sub-Blocks ---`);
    for (let b = 0; b < 4; b++) {
      const blockCandles = tfc.candles.slice(b * blockSize, (b + 1) * blockSize);
      const blockSignals = extractSignals(blockCandles);
      const blockTrades = simulateTradesExecution(blockCandles, blockSignals, { ...bestConfig, costScenario: 'FEE_AND_SLIPPAGE' });
      const m = computeDetailedMetrics(blockTrades, blockCandles.length);
      temporalBlocksByTf[tfc.name].push({ block: b + 1, ...m });
      console.log(`  Block ${b + 1} (${blockCandles.length} candles) -> Trades: ${m.trades} | GrossWR: ${m.grossTradeWinRate}% | NetWR: ${m.netTradeWinRate}% | GrossExp: $${m.grossExpectancy} | NetExp: $${m.netExpectancy} | NetPnL: $${m.netPnL}`);
    }
  }

  // ==========================================================================
  // 6. PARAMETER SENSITIVITY (NEIGHBORHOOD SURFACE ON BEST TF)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🗺️ PARAMETER SENSITIVITY SURFACE (Z-Score x Pierce ATR)');
  console.log('='.repeat(75));

  const zOptions = [1.25, 1.50, 1.75, 2.00];
  const pOptions = [0.25, 0.50, 0.75, 1.00];
  const sensitivityMapByTf = {};

  for (const tfc of tfConfigs) {
    const bestConfig = executionResultsByTf[tfc.name][0].params;
    sensitivityMapByTf[tfc.name] = [];
    console.log(`\n--- ${tfc.name} Parameter Sensitivity Surface ---`);
    for (const z of zOptions) {
      for (const p of pOptions) {
        const sigs = extractSignals(tfc.candles, { volumeZScore: z, minPierceATR: p });
        const trades = simulateTradesExecution(tfc.candles, sigs, { ...bestConfig, costScenario: 'FEE_AND_SLIPPAGE' });
        const m = computeDetailedMetrics(trades, tfc.candles.length);
        sensitivityMapByTf[tfc.name].push({ z, p, signals: sigs.length, ...m });
        console.log(`  Z: ${z.toFixed(2)}, Pierce: ${p.toFixed(2)} ATR -> Sigs: ${String(sigs.length).padStart(3)} | Trades: ${String(m.trades).padStart(3)} | GrossWR: ${m.grossTradeWinRate}% | NetWR: ${m.netTradeWinRate}% | GrossExp: $${m.grossExpectancy} | NetExp: $${m.netExpectancy}`);
      }
    }
  }

  // ==========================================================================
  // 7. VALIDATION SPLIT CONFIRMATION (20% VAL)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🔬 VALIDATION SPLIT CONFIRMATION (20% VAL)');
  console.log('='.repeat(75));

  const valResultsByTf = {};
  for (const tfc of [
    { name: '5m', candles: p5m.val },
    { name: '15m', candles: p15m.val },
    { name: '1h', candles: p1h.val }
  ]) {
    const bestConfig = executionResultsByTf[tfc.name][0].params;
    const valSignals = extractSignals(tfc.candles);
    const valTrades = simulateTradesExecution(tfc.candles, valSignals, { ...bestConfig, costScenario: 'FEE_AND_SLIPPAGE' });
    const m = computeDetailedMetrics(valTrades, tfc.candles.length);
    valResultsByTf[tfc.name] = { signals: valSignals.length, ...m };
    console.log(`  ${tfc.name.padEnd(5)} -> Sigs: ${valSignals.length} | Trades: ${m.trades} | GrossWR: ${m.grossTradeWinRate}% | NetWR: ${m.netTradeWinRate}% | GrossExp: $${m.grossExpectancy} | NetExp: $${m.netExpectancy} | NetPnL: $${m.netPnL}`);
  }

  // ==========================================================================
  // 8. ONE-TIME OUT-OF-SAMPLE BLIND EVALUATION (20% OOS)
  // ==========================================================================
  console.log('\n' + '='.repeat(75));
  console.log('🔒 ONE-TIME OUT-OF-SAMPLE BLIND EVALUATION (20% OOS)');
  console.log('='.repeat(75));

  const oosResultsByTf = {};
  for (const tfc of [
    { name: '5m', candles: p5m.oos },
    { name: '15m', candles: p15m.oos },
    { name: '1h', candles: p1h.oos }
  ]) {
    const bestConfig = executionResultsByTf[tfc.name][0].params;
    const oosSignals = extractSignals(tfc.candles);
    const oosTrades = simulateTradesExecution(tfc.candles, oosSignals, { ...bestConfig, costScenario: 'FEE_AND_SLIPPAGE' });
    const m = computeDetailedMetrics(oosTrades, tfc.candles.length);
    oosResultsByTf[tfc.name] = { signals: oosSignals.length, ...m };
    console.log(`  ${tfc.name.padEnd(5)} -> Sigs: ${oosSignals.length} | Trades: ${m.trades} | GrossWR: ${m.grossTradeWinRate}% | NetWR: ${m.netTradeWinRate}% | GrossExp: $${m.grossExpectancy} | NetExp: $${m.netExpectancy} | NetPnL: $${m.netPnL}`);
  }

  // ==========================================================================
  // 9. EXPORT TRADE LEDGER CSV (FIRST 20 TRADES & ALL TRADES FOR BEST TF)
  // ==========================================================================
  const allIsTrades = executionResultsByTf['15m'][0].trades;
  const csvHeader = 'trade_id,timestamp,timeframe,side,entry_price,stop_price,target_price,exit_price,exit_reason,holding_bars,gross_pnl,fees,slippage,net_pnl,r_multiple,is_tp_hit,is_sl_hit\n';
  const csvRows = allIsTrades.map((t, idx) => 
    `${idx + 1},${t.timestamp},15m,${t.direction},${t.entryPrice},${t.stopPrice},${t.targetPrice},${t.exitPrice},${t.exitReason},${t.holdingBars},${t.grossPnL},${t.totalFees},${t.slippageCost},${t.netPnL},${t.rMultiple},${t.isTpHit},${t.isSlHit}`
  ).join('\n');
  writeFileSync(resolve(outputDir, 'trade_ledger.csv'), csvHeader + csvRows);

  // Save JSON artifacts
  writeFileSync(resolve(outputDir, 'signal_level_results.json'), JSON.stringify({ tf5m: traj5m, tf15m: traj15m, tf1h: traj1h }, null, 2));
  writeFileSync(resolve(outputDir, 'execution_results.json'), JSON.stringify(executionResultsByTf, null, 2));
  writeFileSync(resolve(outputDir, 'oos_results.json'), JSON.stringify(oosResultsByTf, null, 2));

  // Determine Final Classification
  let finalClassification = 'E — REJECTED';
  let finalVerdictSummary = 'NO MULTI-TIMEFRAME ALPHA DETECTED';

  const anyTfNetProfitable = Object.values(executionResultsByTf).some(r => r[0].metrics.netExpectancy > 0);
  const anyTfGrossProfitable = Object.values(executionResultsByTf).some(r => r[0].metrics.grossExpectancy > 0);

  if (anyTfNetProfitable) {
    finalClassification = 'A — SURVIVES AS EXECUTION-GRADE ALPHA';
    finalVerdictSummary = 'SURVIVES';
  } else if (anyTfGrossProfitable) {
    finalClassification = 'C — GROSS EDGE / EXECUTION FAILURE';
    finalVerdictSummary = 'GROSS EDGE PRESENT, BUT OVERWHELMED BY FRICTION';
  } else {
    finalClassification = 'D — NO STATISTICAL EDGE';
    finalVerdictSummary = 'NO STATISTICAL OR GROSS EDGE IN RAW SIGNAL';
  }

  // Manifest
  const manifest = {
    experimentId: 'EXP-V5-TF-001',
    timestamp: new Date().toISOString(),
    dataset: 'BTCUSDT_1m_90d.json',
    datasetSha256,
    m1CandlesTotal: dataset1mCandles.length,
    aggregatedTimeframes: {
      '5m': tf5m.length,
      '15m': tf15m.length,
      '1h': tf1h.length
    },
    hypothesis: {
      provider: 'V5 Wyckoff ABD',
      rules: 'Volume Anomaly Z >= 1.50 AND Swing Pierce >= 0.50 ATR AND Reversal Close (POC Filter C = OFF)'
    },
    signalLevel: { traj5m, traj15m, traj1h },
    executionLevel: executionResultsByTf,
    costDecomposition: costDecompByTf,
    statisticalValidation: statisticalResults,
    temporalRobustness: temporalBlocksByTf,
    parameterSensitivity: sensitivityMapByTf,
    validationSplit: valResultsByTf,
    outOfSample: oosResultsByTf,
    classification: finalClassification,
    verdict: finalVerdictSummary
  };

  writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ EXP-V5-TF-001 Complete. Manifest saved to ${resolve(outputDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error(`\n❌ Fatal error in multi-timeframe suite:`, err);
  process.exit(1);
});

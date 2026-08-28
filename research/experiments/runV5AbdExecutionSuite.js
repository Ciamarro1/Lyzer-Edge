import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { ReplayDataIngestor } from '../replay/replayDataIngestor.js';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';
import { StructuralBoundaryEngine } from '../../packages/lyzer-shared/src/providers/v2_snd_snr.js';
import { MarketProfileEngine } from '../../packages/lyzer-shared/src/providers/v6_market_profile.js';
import { TapeReadingEngine } from '../../packages/lyzer-shared/src/providers/v7_tape_reading.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION & TEMPORAL SPLIT
// ============================================================================
const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
const ingestorMaster = new ReplayDataIngestor(datasetPath, { symbol: 'BTCUSDT' });
const split = ingestorMaster.computeTemporalSplit({ is: 0.6, val: 0.2, oos: 0.2 });

const datasetBuffer = readFileSync(datasetPath);
const datasetHash = crypto.createHash('sha256').update(datasetBuffer).digest('hex').substring(0, 16);

// ============================================================================
// 2. SIGNAL EXTRACTION (LOOKAHEAD-FREE FORENSIC AUDIT)
// ============================================================================
function extractSignals(candles, config = {}) {
  const v5Config = {
    lookback: config.lookback || 30,
    volumeZScore: config.volumeZScore !== undefined ? config.volumeZScore : 1.5,
    minPierceATR: config.minPierceATR !== undefined ? config.minPierceATR : 0.5,
    pocProximity: 0.003,
    requireVolume: config.requireVolume !== false,
    requirePierce: config.requirePierce !== false,
    requirePOC: false, // FROZEN RULE: POC proximity filter C is permanently removed
    requireReversal: config.requireReversal !== false,
  };

  const v5Engine = new WyckoffVolumeProfileEngine(v5Config);
  const v2Engine = new StructuralBoundaryEngine({ lookback: 30, distanceThreshold: 0.005 });
  const v6Engine = new MarketProfileEngine({ lookback: 30, binSize: 10.0, valueAreaPct: 0.70 });
  const v7Engine = new TapeReadingEngine({ period: 10, cvdLookback: 5 });

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
      // Calculate local ATR on prior candles
      const priorCandles = lookbackBuffer.slice(0, -1);
      const ranges = priorCandles.map(c => c.high - c.low);
      const localAtr = ranges.reduce((s, r) => s + r, 0) / Math.max(1, ranges.length);

      // Extract confluence filters for ablation
      const narV2 = v2Engine.reconstruct(mtf);
      const narV6 = v6Engine.reconstruct(mtf);
      const narV7 = v7Engine.reconstruct(mtf);

      const v2Match = (nar.signal === 'LONG' && narV2.signal === 'long') || (nar.signal === 'SHORT' && narV2.signal === 'short');
      const v6Match = (nar.signal === 'LONG' && narV6.signal === 'long') || (nar.signal === 'SHORT' && narV6.signal === 'short');
      const v7Match = (nar.signal === 'LONG' && narV7.signal === 'long') || (nar.signal === 'SHORT' && narV7.signal === 'short');

      signals.push({
        index: i,
        timestamp: candle.openTime || candle.timestamp,
        direction: nar.signal,
        entryPrice: candle.close,
        localAtr,
        candle,
        confluence: {
          v2: v2Match,
          v6: v6Match,
          v7: v7Match
        }
      });
    }
  }

  return signals;
}

// ============================================================================
// 3. FORWARD TRAJECTORY EVALUATOR (10m, 30m, 60m, 120m)
// ============================================================================
function evaluateTrajectory(candles, signals) {
  const horizons = [10, 30, 60, 120];
  const summary = {};

  for (const h of horizons) {
    const mfeList = [];
    const maeList = [];
    const retList = [];

    for (const sig of signals) {
      const idx = sig.index;
      const entry = sig.entryPrice;
      const isLong = sig.direction === 'LONG';
      const end = Math.min(candles.length - 1, idx + h);
      if (end <= idx) continue;

      let maxFav = 0;
      let maxAdv = 0;

      for (let f = idx + 1; f <= end; f++) {
        const c = candles[f];
        if (isLong) {
          const fav = (c.high - entry) / entry;
          const adv = (entry - c.low) / entry;
          if (fav > maxFav) maxFav = fav;
          if (adv > maxAdv) maxAdv = adv;
        } else {
          const fav = (entry - c.low) / entry;
          const adv = (c.high - entry) / entry;
          if (fav > maxFav) maxFav = fav;
          if (adv > maxAdv) maxAdv = adv;
        }
      }

      const finalPrice = candles[end].close;
      const netRet = isLong ? (finalPrice - entry) / entry : (entry - finalPrice) / entry;

      mfeList.push(maxFav * 100);
      maeList.push(maxAdv * 100);
      retList.push(netRet * 100);
    }

    const n = mfeList.length;
    if (n === 0) {
      summary[`${h}m`] = { count: 0, mfeMean: 0, maeMean: 0, mfeMaeRatio: 0, posReturnRate: 0, meanReturn: 0, medianReturn: 0 };
      continue;
    }

    retList.sort((a, b) => a - b);
    const mfeMean = mfeList.reduce((s, v) => s + v, 0) / n;
    const maeMean = maeList.reduce((s, v) => s + v, 0) / n;
    const meanRet = retList.reduce((s, v) => s + v, 0) / n;
    const medianRet = retList[Math.floor(n / 2)];
    const posCount = retList.filter(r => r > 0).length;

    summary[`${h}m`] = {
      count: n,
      mfeMeanPct: Number(mfeMean.toFixed(3)),
      maeMeanPct: Number(maeMean.toFixed(3)),
      mfeMaeRatio: maeMean > 0 ? Number((mfeMean / maeMean).toFixed(2)) : 10.0,
      posReturnRate: Number(((posCount / n) * 100).toFixed(2)),
      meanReturnPct: Number(meanRet.toFixed(3)),
      medianReturnPct: Number(medianRet.toFixed(3))
    };
  }

  return summary;
}

// ============================================================================
// 4. DETERMINISTIC EXECUTION SIMULATOR (PESSIMISTIC INTRABAR COLLISION)
// ============================================================================
function simulateTrades(candles, signals, execConfig = {}) {
  const {
    slAtrMult = 0.75,
    tpRMult = 1.5,
    timeExitMinutes = 30,
    cooldownMinutes = 0,
    costScenario = 'BASE', // 'BASE', 'STRESS', 'ADVERSARIAL'
    filterFn = null
  } = execConfig;

  // Cost Models
  let takerFeePct = 0.001; // 0.1% per leg = 0.2% roundtrip
  let slippagePct = 0.0002; // 0.02% per leg = 0.04% roundtrip
  if (costScenario === 'STRESS' || costScenario === 'ADVERSARIAL') {
    slippagePct = 0.0005; // 0.05% per leg = 0.10% roundtrip slippage
  }

  const trades = [];
  let lastExitIndex = -1;

  for (const sig of signals) {
    if (filterFn && !filterFn(sig)) continue;

    // Apply Cooldown Protection
    if (cooldownMinutes > 0 && sig.index < lastExitIndex + cooldownMinutes) {
      continue;
    }

    const entryIdx = sig.index;
    const isLong = sig.direction === 'LONG';
    const rawEntryPrice = sig.entryPrice;
    
    // Apply Entry Slippage (Pessimistic)
    const entryPrice = isLong ? rawEntryPrice * (1 + slippagePct) : rawEntryPrice * (1 - slippagePct);
    const slDistance = Math.max(rawEntryPrice * 0.001, sig.localAtr * slAtrMult);
    const stopPrice = isLong ? (rawEntryPrice - slDistance) : (rawEntryPrice + slDistance);
    const targetPrice = isLong ? (rawEntryPrice + slDistance * tpRMult) : (rawEntryPrice - slDistance * tpRMult);

    let exitPrice = null;
    let exitReason = null;
    let exitIndex = null;

    const maxHorizon = Math.min(candles.length - 1, entryIdx + timeExitMinutes);

    for (let f = entryIdx + 1; f <= maxHorizon; f++) {
      const c = candles[f];

      if (isLong) {
        const hitSL = c.low <= stopPrice;
        const hitTP = c.high >= targetPrice;

        // ADVERSARIAL RULE: In case of intrabar collision where candle touches BOTH SL and TP, SL WINS!
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

      // Time Exit check
      if (f === maxHorizon) {
        exitPrice = isLong ? c.close * (1 - slippagePct) : c.close * (1 + slippagePct);
        exitReason = 'TIME_EXIT';
        exitIndex = f;
        break;
      }
    }

    if (exitPrice === null && entryIdx < candles.length - 1) {
      const lastC = candles[candles.length - 1];
      exitPrice = isLong ? lastC.close * (1 - slippagePct) : lastC.close * (1 + slippagePct);
      exitReason = 'END_OF_DATA';
      exitIndex = candles.length - 1;
    }

    if (exitPrice !== null) {
      lastExitIndex = exitIndex;
      const notional = 1000; // $1,000 position
      const priceRet = isLong ? (exitPrice - entryPrice) / entryPrice : (entryPrice - exitPrice) / entryPrice;
      const grossPnL = notional * priceRet;
      
      const totalFees = notional * takerFeePct * 2; // Entry + Exit fees
      const slippageCost = notional * (slippagePct * 2);
      const netPnL = grossPnL - totalFees;
      const rMultiple = slDistance > 0 ? ((isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice)) / slDistance) : 0;

      trades.push({
        signalId: sig.index,
        entryTimestamp: sig.timestamp,
        exitTimestamp: candles[exitIndex].openTime || candles[exitIndex].timestamp,
        direction: sig.direction,
        entryPrice: Number(entryPrice.toFixed(2)),
        exitPrice: Number(exitPrice.toFixed(2)),
        stopPrice: Number(stopPrice.toFixed(2)),
        targetPrice: Number(targetPrice.toFixed(2)),
        holdingTimeMinutes: exitIndex - entryIdx,
        exitReason,
        grossPnL: Number(grossPnL.toFixed(2)),
        totalFees: Number(totalFees.toFixed(2)),
        slippageCost: Number(slippageCost.toFixed(2)),
        netPnL: Number(netPnL.toFixed(2)),
        rMultiple: Number(rMultiple.toFixed(3)),
      });
    }
  }

  return trades;
}

// ============================================================================
// 5. METRIC AGGREGATOR
// ============================================================================
function computeTradeMetrics(trades, totalCandles = 77760) {
  if (!trades || trades.length === 0) {
    return {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      lossRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnL: 0,
      profitFactor: 0,
      expectancy: 0,
      avgTrade: 0,
      medianTrade: 0,
      avgWinner: 0,
      avgLoser: 0,
      rMean: 0,
      rMedian: 0,
      maxDrawdown: 0,
      maxConsecutiveLosses: 0,
      maxConsecutiveWins: 0,
      avgHoldingMinutes: 0,
      returnPerTradePct: 0,
      returnPerHourPct: 0
    };
  }

  const n = trades.length;
  const wins = trades.filter(t => t.netPnL > 0);
  const losses = trades.filter(t => t.netPnL <= 0);

  const grossProfit = wins.reduce((s, t) => s + t.netPnL, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));
  const netPnL = grossProfit - grossLoss;
  const winRate = (wins.length / n) * 100;
  const lossRate = (losses.length / n) * 100;
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 10.0 : 0);
  const expectancy = netPnL / n;

  const avgWinner = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoser = losses.length > 0 ? grossLoss / losses.length : 0;

  const pnlList = trades.map(t => t.netPnL).sort((a, b) => a - b);
  const medianTrade = pnlList[Math.floor(n / 2)];

  const rList = trades.map(t => t.rMultiple).sort((a, b) => a - b);
  const rMean = rList.reduce((s, v) => s + v, 0) / n;
  const rMedian = rList[Math.floor(n / 2)];

  // Drawdown & Streaks
  let equity = 10000;
  let peak = equity;
  let maxDD = 0;
  let curWins = 0, maxWins = 0;
  let curLoss = 0, maxLoss = 0;

  for (const t of trades) {
    equity += t.netPnL;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;

    if (t.netPnL > 0) {
      curWins++;
      curLoss = 0;
      if (curWins > maxWins) maxWins = curWins;
    } else {
      curLoss++;
      curWins = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }

  const totalHolding = trades.reduce((s, t) => s + t.holdingTimeMinutes, 0);
  const avgHoldingMinutes = totalHolding / n;
  const totalHours = totalCandles / 60;
  const returnPerHourPct = (netPnL / 10000) / totalHours * 100;

  return {
    trades: n,
    wins: wins.length,
    losses: losses.length,
    winRate: Number(winRate.toFixed(2)),
    lossRate: Number(lossRate.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    expectancy: Number(expectancy.toFixed(3)),
    avgTrade: Number((netPnL / n).toFixed(2)),
    medianTrade: Number(medianTrade.toFixed(2)),
    avgWinner: Number(avgWinner.toFixed(2)),
    avgLoser: Number(avgLoser.toFixed(2)),
    rMean: Number(rMean.toFixed(3)),
    rMedian: Number(rMedian.toFixed(3)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    maxConsecutiveLosses: maxLoss,
    maxConsecutiveWins: maxWins,
    avgHoldingMinutes: Number(avgHoldingMinutes.toFixed(1)),
    returnPerTradePct: Number(((expectancy / 1000) * 100).toFixed(3)),
    returnPerHourPct: Number(returnPerHourPct.toFixed(4))
  };
}

// ============================================================================
// 6. STATISTICAL VALIDATION: BOOTSTRAP & RANDOMIZATION PERMUTATION
// ============================================================================
function runBootstrap(trades, iterations = 1000) {
  if (!trades || trades.length < 5) return { ci95Low: 0, ci95High: 0, pfLow: 0, pfHigh: 0 };

  const expectancies = [];
  const pfs = [];
  const n = trades.length;

  for (let b = 0; b < iterations; b++) {
    const sample = [];
    for (let i = 0; i < n; i++) {
      const randIdx = Math.floor(Math.random() * n);
      sample.push(trades[randIdx]);
    }
    const m = computeTradeMetrics(sample);
    expectancies.push(m.expectancy);
    pfs.push(m.profitFactor);
  }

  expectancies.sort((a, b) => a - b);
  pfs.sort((a, b) => a - b);

  return {
    expCi95Low: Number(expectancies[Math.floor(iterations * 0.025)].toFixed(3)),
    expCi95High: Number(expectancies[Math.floor(iterations * 0.975)].toFixed(3)),
    pfCi95Low: Number(pfs[Math.floor(iterations * 0.025)].toFixed(2)),
    pfCi95High: Number(pfs[Math.floor(iterations * 0.975)].toFixed(2))
  };
}

function runRandomizationTest(candles, signalCount, baseExecConfig, iterations = 500) {
  const randomMetrics = [];

  for (let b = 0; b < iterations; b++) {
    const randomSignals = [];
    for (let i = 0; i < signalCount; i++) {
      const randIdx = Math.floor(Math.random() * (candles.length - 120)) + 30;
      const isLong = Math.random() > 0.5;
      const c = candles[randIdx];
      randomSignals.push({
        index: randIdx,
        timestamp: c.openTime || c.timestamp,
        direction: isLong ? 'LONG' : 'SHORT',
        entryPrice: c.close,
        localAtr: c.high - c.low,
        candle: c,
        confluence: {}
      });
    }

    const t = simulateTrades(candles, randomSignals, baseExecConfig);
    const m = computeTradeMetrics(t, candles.length);
    randomMetrics.push(m.expectancy);
  }

  randomMetrics.sort((a, b) => a - b);
  return randomMetrics;
}

// ============================================================================
// MAIN EXPERIMENT PIPELINE
// ============================================================================
async function main() {
  console.log('='.repeat(75));
  console.log('🏛️ EXP-V5-ABD-EXECUTION-003: EXECUTION-GRADE VALIDATION & BLIND OOS');
  console.log('='.repeat(75));

  const outputDir = resolve(__dirname, '../results/v5_abd_execution');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // 1. INGEST DATASETS FOR IS, VAL, OOS
  const isIngestor = new ReplayDataIngestor(datasetPath, {
    symbol: 'BTCUSDT',
    startTime: split.is.startTime,
    endTime: split.is.endTime
  });
  const isCandles = isIngestor.candles;

  const valIngestor = new ReplayDataIngestor(datasetPath, {
    symbol: 'BTCUSDT',
    startTime: split.val.startTime,
    endTime: split.val.endTime
  });
  const valCandles = valIngestor.candles;

  const oosIngestor = new ReplayDataIngestor(datasetPath, {
    symbol: 'BTCUSDT',
    startTime: split.oos.startTime,
    endTime: split.oos.endTime
  });
  const oosCandles = oosIngestor.candles;

  console.log(`Dataset Audited: BTCUSDT M1 90d (Hash: ${datasetHash})`);
  console.log(`Partitioning: IS=${isCandles.length} candles | VAL=${valCandles.length} candles | OOS=${oosCandles.length} candles`);

  // 2. EXTRACT FROZEN V5 ABD SIGNALS (IN-SAMPLE)
  const isSignalsAll = extractSignals(isCandles, { requireVolume: true, requirePierce: true, requireReversal: true });
  const isSignalsLong = isSignalsAll.filter(s => s.direction === 'LONG');
  const isSignalsShort = isSignalsAll.filter(s => s.direction === 'SHORT');

  console.log(`\n📊 SIGNAL-LEVEL DISCOVERY (IN-SAMPLE 60%):`);
  console.log(`Total V5 ABD Signals: ${isSignalsAll.length} (LONG: ${isSignalsLong.length} | SHORT: ${isSignalsShort.length})`);

  // Trajectory Evaluation
  const trajAll = evaluateTrajectory(isCandles, isSignalsAll);
  const trajLong = evaluateTrajectory(isCandles, isSignalsLong);
  const trajShort = evaluateTrajectory(isCandles, isSignalsShort);

  console.log(`Forward Trajectory 30m:`);
  console.log(`  - ALL   : MFE ${trajAll['30m']?.mfeMeanPct}% | MAE ${trajAll['30m']?.maeMeanPct}% | MFE/MAE ${trajAll['30m']?.mfeMaeRatio}x | PosRet ${trajAll['30m']?.posReturnRate}%`);
  console.log(`  - LONG  : MFE ${trajLong['30m']?.mfeMeanPct}% | MAE ${trajLong['30m']?.maeMeanPct}% | MFE/MAE ${trajLong['30m']?.mfeMaeRatio}x | PosRet ${trajLong['30m']?.posReturnRate}%`);
  console.log(`  - SHORT : MFE ${trajShort['30m']?.mfeMeanPct}% | MAE ${trajShort['30m']?.maeMeanPct}% | MFE/MAE ${trajShort['30m']?.mfeMaeRatio}x | PosRet ${trajShort['30m']?.posReturnRate}%`);

  // 3. EXECUTION GRID (SL x TP x TimeExit)
  console.log('\n' + '='.repeat(75));
  console.log('⚙️ EXECUTION MATRIX (IN-SAMPLE: 360 SIGNALS)');
  console.log('='.repeat(75));

  const slAtrOptions = [0.5, 0.75, 1.0];
  const tpROptions = [1.0, 1.5, 2.0, 2.5];
  const timeExitOptions = [10, 15, 30, 60];

  const executionGridResults = [];

  for (const sl of slAtrOptions) {
    for (const tp of tpROptions) {
      for (const te of timeExitOptions) {
        const tradesBase = simulateTrades(isCandles, isSignalsAll, { slAtrMult: sl, tpRMult: tp, timeExitMinutes: te, costScenario: 'BASE' });
        const tradesStress = simulateTrades(isCandles, isSignalsAll, { slAtrMult: sl, tpRMult: tp, timeExitMinutes: te, costScenario: 'STRESS' });
        const tradesAdv = simulateTrades(isCandles, isSignalsAll, { slAtrMult: sl, tpRMult: tp, timeExitMinutes: te, costScenario: 'ADVERSARIAL' });

        const mBase = computeTradeMetrics(tradesBase, isCandles.length);
        const mStress = computeTradeMetrics(tradesStress, isCandles.length);
        const mAdv = computeTradeMetrics(tradesAdv, isCandles.length);

        executionGridResults.push({
          params: { slAtrMult: sl, tpRMult: tp, timeExitMinutes: te },
          base: mBase,
          stress: mStress,
          adversarial: mAdv,
          tradesBase
        });
      }
    }
  }

  // Sort by BASE Net Expectancy
  executionGridResults.sort((a, b) => b.base.expectancy - a.base.expectancy);

  console.log('\nTop 5 Execution Configurations (IS):');
  for (let i = 0; i < Math.min(5, executionGridResults.length); i++) {
    const r = executionGridResults[i];
    const p = r.params;
    console.log(`  #${i + 1} | SL: ${p.slAtrMult} ATR, TP: ${p.tpRMult}R, TimeExit: ${p.timeExitMinutes}m`);
    console.log(`      BASE        -> Trades: ${r.base.trades} | WR: ${r.base.winRate}% | PF: ${r.base.profitFactor} | NetPnL: $${r.base.netPnL} | Exp: $${r.base.expectancy} | MaxDD: $${r.base.maxDrawdown}`);
    console.log(`      STRESS      -> Trades: ${r.stress.trades} | WR: ${r.stress.winRate}% | PF: ${r.stress.profitFactor} | NetPnL: $${r.stress.netPnL} | Exp: $${r.stress.expectancy}`);
    console.log(`      ADVERSARIAL -> Trades: ${r.adversarial.trades} | WR: ${r.adversarial.winRate}% | PF: ${r.adversarial.profitFactor} | NetPnL: $${r.adversarial.netPnL} | Exp: $${r.adversarial.expectancy}`);
  }

  const frozenBestExec = executionGridResults[0];

  // 4. LONG VS SHORT DECOMPOSITION (ON BEST EXECUTION CONFIG)
  const tradesLong = simulateTrades(isCandles, isSignalsLong, { ...frozenBestExec.params, costScenario: 'BASE' });
  const tradesShort = simulateTrades(isCandles, isSignalsShort, { ...frozenBestExec.params, costScenario: 'BASE' });
  const mLong = computeTradeMetrics(tradesLong, isCandles.length);
  const mShort = computeTradeMetrics(tradesShort, isCandles.length);

  console.log('\n' + '='.repeat(75));
  console.log('⚖️ LONG VS SHORT DECOMPOSITION:');
  console.log(`LONG  -> Trades: ${mLong.trades} | WR: ${mLong.winRate}% | PF: ${mLong.profitFactor} | NetPnL: $${mLong.netPnL} | Exp: $${mLong.expectancy} | MaxDD: $${mLong.maxDrawdown}`);
  console.log(`SHORT -> Trades: ${mShort.trades} | WR: ${mShort.winRate}% | PF: ${mShort.profitFactor} | NetPnL: $${mShort.netPnL} | Exp: $${mShort.expectancy} | MaxDD: $${mShort.maxDrawdown}`);

  // 5. COOLDOWN & OVERLAPPING SIGNALS
  console.log('\n' + '='.repeat(75));
  console.log('⏱️ COOLDOWN & OVERLAPPING SIGNALS ANALYSIS:');
  const cooldowns = [0, 5, 15];
  const cooldownResults = {};
  for (const cd of cooldowns) {
    const t = simulateTrades(isCandles, isSignalsAll, { ...frozenBestExec.params, cooldownMinutes: cd, costScenario: 'BASE' });
    const m = computeTradeMetrics(t, isCandles.length);
    cooldownResults[`cd_${cd}m`] = m;
    console.log(`Cooldown ${cd}m -> Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | NetPnL: $${m.netPnL} | Exp: $${m.expectancy}`);
  }

  // 6. ABLATION OF CONFLUENCES (V2, V6, V7)
  console.log('\n' + '='.repeat(75));
  console.log('🧩 CONFLUENCE ABLATION SUITE:');
  const ablations = [
    { name: 'V5_ABD_ONLY', filter: () => true },
    { name: 'V5_ABD + V2', filter: s => s.confluence.v2 },
    { name: 'V5_ABD + V6', filter: s => s.confluence.v6 },
    { name: 'V5_ABD + V7', filter: s => s.confluence.v7 },
    { name: 'V5_ABD + V2 + V6', filter: s => s.confluence.v2 && s.confluence.v6 },
    { name: 'V5_ABD + V2 + V7', filter: s => s.confluence.v2 && s.confluence.v7 },
    { name: 'V5_ABD + V6 + V7', filter: s => s.confluence.v6 && s.confluence.v7 },
    { name: 'V5_ABD + V2 + V6 + V7', filter: s => s.confluence.v2 && s.confluence.v6 && s.confluence.v7 }
  ];

  const ablationResults = [];
  for (const ab of ablations) {
    const t = simulateTrades(isCandles, isSignalsAll, { ...frozenBestExec.params, filterFn: ab.filter, costScenario: 'BASE' });
    const m = computeTradeMetrics(t, isCandles.length);
    const retention = Number(((m.trades / Math.max(1, isSignalsAll.length)) * 100).toFixed(1));
    ablationResults.push({ name: ab.name, retentionPct: retention, ...m });
    console.log(`  ${ab.name.padEnd(25)} -> Trades: ${String(m.trades).padStart(3)} (${String(retention).padStart(5)}%) | PF: ${String(m.profitFactor).padStart(4)} | Exp: $${String(m.expectancy).padStart(6)} | NetPnL: $${m.netPnL}`);
  }

  // 7. LOCAL PARAMETER SENSITIVITY (NEIGHBORHOOD MAP)
  console.log('\n' + '='.repeat(75));
  console.log('🗺️ LOCAL PARAMETER SENSITIVITY (STABILITY MAP):');
  const zOptions = [1.25, 1.50, 1.75, 2.00];
  const pOptions = [0.25, 0.50, 0.75, 1.00];
  const sensitivityMap = [];

  for (const z of zOptions) {
    for (const p of pOptions) {
      const sigs = extractSignals(isCandles, { volumeZScore: z, minPierceATR: p, requireVolume: true, requirePierce: true, requireReversal: true });
      const t = simulateTrades(isCandles, sigs, { ...frozenBestExec.params, costScenario: 'BASE' });
      const m = computeTradeMetrics(t, isCandles.length);
      sensitivityMap.push({ z, p, signals: sigs.length, ...m });
      console.log(`  Z: ${z.toFixed(2)}, Pierce: ${p.toFixed(2)} ATR -> Sigs: ${String(sigs.length).padStart(4)} | Trades: ${String(m.trades).padStart(3)} | WR: ${m.winRate}% | PF: ${m.profitFactor} | Exp: $${m.expectancy}`);
    }
  }

  // 8. TEMPORAL ROBUSTNESS / WALK-FORWARD BLOCKS (IS 4 BLOCKS)
  console.log('\n' + '='.repeat(75));
  console.log('📅 TEMPORAL ROBUSTNESS (4 IN-SAMPLE SUB-BLOCKS):');
  const blockSize = Math.floor(isCandles.length / 4);
  const blockResults = [];
  for (let b = 0; b < 4; b++) {
    const blockCandles = isCandles.slice(b * blockSize, (b + 1) * blockSize);
    const blockSigs = extractSignals(blockCandles, { requireVolume: true, requirePierce: true, requireReversal: true });
    const t = simulateTrades(blockCandles, blockSigs, { ...frozenBestExec.params, costScenario: 'BASE' });
    const m = computeTradeMetrics(t, blockCandles.length);
    blockResults.push({ block: b + 1, ...m });
    console.log(`  Block ${b + 1} (${blockCandles.length} candles) -> Trades: ${m.trades} | WR: ${m.winRate}% | PF: ${m.profitFactor} | NetPnL: $${m.netPnL} | Exp: $${m.expectancy}`);
  }

  // 9. STATISTICAL BOOTSTRAP & RANDOMIZATION TEST
  console.log('\n' + '='.repeat(75));
  console.log('🎲 STATISTICAL SIGNIFICANCE (BOOTSTRAP & RANDOMIZATION PERMUTATION):');
  const bootstrap = runBootstrap(frozenBestExec.tradesBase, 1000);
  console.log(`Bootstrap 95% Confidence Interval:`);
  console.log(`  - Expectancy CI95 : [$${bootstrap.expCi95Low}, $${bootstrap.expCi95High}]`);
  console.log(`  - Profit Factor CI: [${bootstrap.pfCi95Low}, ${bootstrap.pfCi95High}]`);

  const randomExpDist = runRandomizationTest(isCandles, isSignalsAll.length, frozenBestExec.params, 500);
  const higherCount = randomExpDist.filter(e => e >= frozenBestExec.base.expectancy).length;
  const empiricalPValue = Number((higherCount / randomExpDist.length).toFixed(4));
  const randomMedianExp = randomExpDist[Math.floor(randomExpDist.length / 2)];

  console.log(`Random Permutation Test (500 runs):`);
  console.log(`  - Observed V5 ABD Expectancy : $${frozenBestExec.base.expectancy}`);
  console.log(`  - Random Median Expectancy  : $${randomMedianExp.toFixed(3)}`);
  console.log(`  - Empirical p-value         : ${empiricalPValue} (${empiricalPValue < 0.01 ? 'STATISTICALLY SIGNIFICANT p < 0.01 ✅' : 'NOT SIGNIFICANT ❌'})`);

  // 10. VALIDATION SEGMENT CONFIRMATION (20% VAL: 25,920 CANDLES)
  console.log('\n' + '='.repeat(75));
  console.log('🔬 VALIDATION SEGMENT CONFIRMATION (20% VAL: 25,920 CANDLES):');
  const valSignalsAll = extractSignals(valCandles, { requireVolume: true, requirePierce: true, requireReversal: true });
  const valTrades = simulateTrades(valCandles, valSignalsAll, { ...frozenBestExec.params, costScenario: 'BASE' });
  const valMetrics = computeTradeMetrics(valTrades, valCandles.length);
  const valTraj = evaluateTrajectory(valCandles, valSignalsAll);

  console.log(`VAL Signals: ${valSignalsAll.length}`);
  console.log(`VAL Trajectory 30m: MFE ${valTraj['30m']?.mfeMeanPct}% | MAE ${valTraj['30m']?.maeMeanPct}% | PosRet ${valTraj['30m']?.posReturnRate}%`);
  console.log(`VAL Trade Execution -> Trades: ${valMetrics.trades} | WR: ${valMetrics.winRate}% | PF: ${valMetrics.profitFactor} | NetPnL: $${valMetrics.netPnL} | Exp: $${valMetrics.expectancy} | MaxDD: $${valMetrics.maxDrawdown}`);

  // 11. ONE-TIME OUT-OF-SAMPLE BLIND TEST (20% OOS: 25,920 CANDLES)
  console.log('\n' + '='.repeat(75));
  console.log('🔒 ONE-TIME OUT-OF-SAMPLE BLIND TEST (20% OOS: 25,920 CANDLES):');
  const oosSignalsAll = extractSignals(oosCandles, { requireVolume: true, requirePierce: true, requireReversal: true });
  const oosTrades = simulateTrades(oosCandles, oosSignalsAll, { ...frozenBestExec.params, costScenario: 'BASE' });
  const oosMetrics = computeTradeMetrics(oosTrades, oosCandles.length);
  const oosTraj = evaluateTrajectory(oosCandles, oosSignalsAll);

  console.log(`OOS Signals: ${oosSignalsAll.length}`);
  console.log(`OOS Trajectory 30m: MFE ${oosTraj['30m']?.mfeMeanPct}% | MAE ${oosTraj['30m']?.maeMeanPct}% | PosRet ${oosTraj['30m']?.posReturnRate}%`);
  console.log(`OOS Trade Execution -> Trades: ${oosMetrics.trades} | WR: ${oosMetrics.winRate}% | PF: ${oosMetrics.profitFactor} | NetPnL: $${oosMetrics.netPnL} | Exp: $${oosMetrics.expectancy} | MaxDD: $${oosMetrics.maxDrawdown}`);

  // 12. BITWISE DETERMINISTIC INTEGRITY CHECK
  const isSignalsRun2 = extractSignals(isCandles, { requireVolume: true, requirePierce: true, requireReversal: true });
  const isTradesRun2 = simulateTrades(isCandles, isSignalsRun2, { ...frozenBestExec.params, costScenario: 'BASE' });
  const isMetricsRun2 = computeTradeMetrics(isTradesRun2, isCandles.length);
  const bitwisePass = JSON.stringify(frozenBestExec.base) === JSON.stringify(isMetricsRun2);
  console.log(`\n🛡️ Bitwise Reproducibility Check: ${bitwisePass ? 'PASS (100% BITWISE IDENTICAL) ✅' : 'FAIL ❌'}`);

  // 13. CLASSIFICATION & VERDICT DETERMINATION
  let classification = 'E — REJECTED';
  let decision = 'REJECT';

  const isProfitable = frozenBestExec.base.netPnL > 0 && frozenBestExec.base.expectancy > 0;
  const valProfitable = valMetrics.netPnL > 0 && valMetrics.expectancy > 0;
  const oosProfitable = oosMetrics.netPnL > 0 && oosMetrics.expectancy > 0;

  if (isProfitable && valProfitable && oosProfitable && empiricalPValue < 0.05) {
    classification = 'A — CONFIRMED EXECUTION-GRADE ALPHA';
    decision = 'ADVANCE TO CONSTITUTIONAL INTEGRATION';
  } else if (isProfitable && (valProfitable || oosProfitable)) {
    classification = 'B — PROMISING BUT NOT YET CONFIRMED';
    decision = 'HOLD FOR FURTHER RESEARCH';
  } else if (trajAll['30m']?.mfeMaeRatio >= 1.5 && (!isProfitable || !valProfitable)) {
    classification = 'C — SIGNAL ALPHA WITHOUT TRADE ALPHA';
    decision = 'REFORMULATE EXECUTION (SL/TP/FEES OVERWHELM SIGNAL)';
  } else {
    classification = 'E — REJECTED';
    decision = 'REJECT';
  }

  // 14. SAVE MANIFEST & SUMMARY
  const manifest = {
    experimentId: 'EXP-V5-ABD-EXECUTION-003',
    timestamp: new Date().toISOString(),
    dataset: 'BTCUSDT_1m_90d.json',
    datasetHash,
    partition: split,
    frozenHypothesis: {
      provider: 'V5 Wyckoff Volume Profile (Decoupled ABD)',
      rule: 'Volume Anomaly Z >= 1.5 AND Swing Pierce >= 0.5 ATR AND Reversal Close',
      removedConditions: ['POC proximity filter C']
    },
    bestExecutionConfig: frozenBestExec.params,
    results: {
      trajectory: { is: trajAll, val: valTraj, oos: oosTraj },
      tradeExecution: {
        is: frozenBestExec.base,
        isStress: frozenBestExec.stress,
        isAdversarial: frozenBestExec.adversarial,
        val: valMetrics,
        oos: oosMetrics
      },
      longVsShort: { long: mLong, short: mShort },
      cooldown: cooldownResults,
      ablation: ablationResults,
      sensitivityMap,
      temporalBlocks: blockResults,
      bootstrap,
      randomization: { empiricalPValue, observedExp: frozenBestExec.base.expectancy, randomMedianExp },
      bitwisePass
    },
    classification,
    decision
  };

  writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Suite finished. Manifest saved to ${resolve(outputDir, 'manifest.json')}`);
}

main().catch(err => {
  console.error(`\n❌ Fatal execution suite error:`, err);
  process.exit(1);
});

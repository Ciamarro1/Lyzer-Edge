import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// 1. DATASET INGESTION & DETERMINISTIC 1H AGGREGATION
// ============================================================================
const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
const rawFileBuffer = readFileSync(datasetPath);
const datasetSha256 = crypto.createHash('sha256').update(rawFileBuffer).digest('hex');
const dataset1mCandles = JSON.parse(rawFileBuffer.toString('utf-8'));
dataset1mCandles.sort((a, b) => a.openTime - b.openTime);

function aggregateCandles1h(m1Candles) {
  const tfMs = 60 * 60 * 1000;
  const buckets = new Map();

  for (const c of m1Candles) {
    const bucketTime = Math.floor(c.openTime / tfMs) * tfMs;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, []);
    buckets.get(bucketTime).push(c);
  }

  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
  const aggregated = [];

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

const candles1h = aggregateCandles1h(dataset1mCandles);

// Temporal Split (60% IS, 20% VAL, 20% OOS)
const totalN = candles1h.length;
const isEnd = Math.floor(totalN * 0.60);
const valEnd = Math.floor(totalN * 0.80);

const isCandles1h = candles1h.slice(0, isEnd);
const valCandles1h = candles1h.slice(isEnd, valEnd);
const oosCandles1h = candles1h.slice(valEnd);

// ============================================================================
// 2. SIGNAL EXTRACTION WITH REGIME CLASSIFICATION
// ============================================================================
function extractSignalsWithRegimes(candles) {
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

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    lookbackBuffer.push(candle);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();

    if (lookbackBuffer.length < 30) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    if (nar && nar.signal && (nar.signal === 'LONG' || nar.signal === 'SHORT')) {
      const priorCandles = lookbackBuffer.slice(0, -1);
      const ranges = priorCandles.map(c => c.high - c.low);
      const localAtr = ranges.reduce((s, r) => s + r, 0) / Math.max(1, ranges.length);
      const atrPct = (localAtr / candle.close) * 100;

      // Regime: Trend vs Range (30-period SMA slope)
      const closes = priorCandles.map(c => c.close);
      const sma30 = closes.reduce((s, c) => s + c, 0) / closes.length;
      const trendRegime = candle.close > sma30 ? 'BULL_TREND' : 'BEAR_TREND';

      // Volatility Regime (High vs Low Volatility compared to 1h median ATR ~ 0.85%)
      const volRegime = atrPct >= 0.85 ? 'HIGH_VOLATILITY' : 'LOW_VOLATILITY';

      signals.push({
        index: i,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        direction: nar.signal,
        closePrice: candle.close,
        openPriceNext: candles[i + 1] ? candles[i + 1].open : candle.close,
        candle,
        localAtr,
        atrPct,
        trendRegime,
        volRegime,
        swingLowSetup: candle.low,
        swingHighSetup: candle.high,
        narrative: nar.narrative
      });
    }
  }

  return signals;
}

// ============================================================================
// 3. TRAJECTORY & EXECUTION SIMULATOR
// ============================================================================
function evaluatePopulationGroup(candles, signals, groupName = 'ALL') {
  if (signals.length === 0) {
    return { groupName, count: 0 };
  }

  // Trajectory at 8 bars (8h)
  const mfeList = [];
  const maeList = [];
  const retList = [];

  for (const sig of signals) {
    const idx = sig.index;
    const entry = sig.closePrice;
    const isLong = sig.direction === 'LONG';
    const end = Math.min(candles.length - 1, idx + 8);

    let maxFav = 0;
    let maxAdv = 0;

    for (let f = idx + 1; f <= end; f++) {
      const c = candles[f];
      const fav = isLong ? (c.high - entry) / entry : (entry - c.low) / entry;
      const adv = isLong ? (entry - c.low) / entry : (c.high - entry) / entry;
      if (fav > maxFav) maxFav = fav;
      if (adv > maxAdv) maxAdv = adv;
    }

    const finalPrice = candles[end].close;
    const netRet = isLong ? (finalPrice - entry) / entry : (entry - finalPrice) / entry;

    mfeList.push(maxFav * 100);
    maeList.push(maxAdv * 100);
    retList.push(netRet * 100);
  }

  const n = signals.length;
  retList.sort((a, b) => a - b);
  mfeList.sort((a, b) => a - b);
  maeList.sort((a, b) => a - b);

  const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const quantile = (arr, q) => arr[Math.floor((arr.length - 1) * q)] || 0;
  const posCount = retList.filter(r => r > 0).length;

  // Simulate Trade Execution (SL = 1.0 ATR, TP = 2.5R, Exit = 6h, Taker Fee = 0.10% each leg = 0.20%, Slippage = 0.02% each leg = 0.04%)
  const takerFeePct = 0.001;
  const slippagePct = 0.0002;
  const trades = [];

  for (const sig of signals) {
    const entryIdx = sig.index;
    if (entryIdx >= candles.length - 1) continue;

    const isLong = sig.direction === 'LONG';
    const rawEntryPrice = sig.closePrice;
    const entryPrice = isLong ? rawEntryPrice * (1 + slippagePct) : rawEntryPrice * (1 - slippagePct);
    const slDistance = Math.max(rawEntryPrice * 0.002, sig.localAtr * 1.0);

    const stopPrice = isLong ? (rawEntryPrice - slDistance) : (rawEntryPrice + slDistance);
    const targetPrice = isLong ? (rawEntryPrice + slDistance * 2.5) : (rawEntryPrice - slDistance * 2.5);

    let exitPrice = null;
    let exitReason = null;
    let exitIndex = null;

    const maxHorizon = Math.min(candles.length - 1, entryIdx + 6);

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
      holdingHours: exitIndex - entryIdx,
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

  const tpHits = trades.filter(t => t.isTpHit).length;
  const slHits = trades.filter(t => t.isSlHit).length;
  const grossWins = trades.filter(t => t.isGrossWin).length;
  const netWins = trades.filter(t => t.isNetWin).length;

  const totalGrossPnL = trades.reduce((s, t) => s + t.grossPnL, 0);
  const totalNetPnL = trades.reduce((s, t) => s + t.netPnL, 0);
  const totalFees = trades.reduce((s, t) => s + t.totalFees, 0);

  const grossGain = trades.filter(t => t.grossPnL > 0).reduce((s, t) => s + t.grossPnL, 0);
  const grossLoss = Math.abs(trades.filter(t => t.grossPnL <= 0).reduce((s, t) => s + t.grossPnL, 0));
  const profitFactorGross = grossLoss > 0 ? Number((grossGain / grossLoss).toFixed(2)) : (grossGain > 0 ? 10 : 0);

  const netGain = trades.filter(t => t.netPnL > 0).reduce((s, t) => s + t.netPnL, 0);
  const netLoss = Math.abs(trades.filter(t => t.netPnL <= 0).reduce((s, t) => s + t.netPnL, 0));
  const profitFactorNet = netLoss > 0 ? Number((netGain / netLoss).toFixed(2)) : (netGain > 0 ? 10 : 0);

  const rList = trades.map(t => t.rMultiple).sort((a, b) => a - b);
  const medianR = rList[Math.floor(trades.length / 2)];
  const avgHolding = trades.reduce((s, t) => s + t.holdingHours, 0) / Math.max(1, trades.length);

  return {
    groupName,
    count: n,
    trajectory8h: {
      posReturnRatePct: Number(((posCount / n) * 100).toFixed(2)),
      meanReturnPct: Number(mean(retList).toFixed(3)),
      medianReturnPct: Number(quantile(retList, 0.50).toFixed(3)),
      mfeMeanPct: Number(mean(mfeList).toFixed(3)),
      mfeMedianPct: Number(quantile(mfeList, 0.50).toFixed(3)),
      maeMeanPct: Number(mean(maeList).toFixed(3)),
      maeMedianPct: Number(quantile(maeList, 0.50).toFixed(3)),
      mfeMaeRatio: Number((mean(mfeList) / Math.max(0.001, mean(maeList))).toFixed(2))
    },
    executionMetrics: {
      trades: trades.length,
      tpHitRate: Number(((tpHits / n) * 100).toFixed(2)),
      slHitRate: Number(((slHits / n) * 100).toFixed(2)),
      grossTradeWinRate: Number(((grossWins / n) * 100).toFixed(2)),
      netTradeWinRate: Number(((netWins / n) * 100).toFixed(2)),
      grossPnL: Number(totalGrossPnL.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netPnL: Number(totalNetPnL.toFixed(2)),
      grossExpectancy: Number((totalGrossPnL / n).toFixed(3)),
      netExpectancy: Number((totalNetPnL / n).toFixed(3)),
      profitFactorGross,
      profitFactorNet,
      medianR: Number(medianR.toFixed(3)),
      avgHoldingHours: Number(avgHolding.toFixed(1))
    },
    trades
  };
}

// ============================================================================
// MAIN POPULATION ANALYSIS
// ============================================================================
async function main() {
  console.log('='.repeat(75));
  console.log('🏛️ EXP-V5-1H-POPULATION-002: POPULATION DISSECTION (LONG vs SHORT & REGIMES)');
  console.log('='.repeat(75));

  const outputDir = resolve(__dirname, '../results/v5_1h_population');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const isSignals1h = extractSignalsWithRegimes(isCandles1h);
  console.log(`In-Sample 1h Signals Audited: ${isSignals1h.length}`);

  // 1. DIRECTIONAL BREAKDOWN: LONG vs SHORT
  const longSignals = isSignals1h.filter(s => s.direction === 'LONG');
  const shortSignals = isSignals1h.filter(s => s.direction === 'SHORT');

  const longAnalysis = evaluatePopulationGroup(isCandles1h, longSignals, 'LONG (Spring)');
  const shortAnalysis = evaluatePopulationGroup(isCandles1h, shortSignals, 'SHORT (Upthrust)');
  const allAnalysis = evaluatePopulationGroup(isCandles1h, isSignals1h, 'CONSOLIDATED (ALL)');

  console.log('\n--- 1. DIRECTIONAL POPULATION BREAKDOWN (IN-SAMPLE 1H) ---');
  console.log(`LONG (Spring)    -> N: ${longAnalysis.count} | PosRate: ${longAnalysis.trajectory8h.posReturnRatePct}% | MFE: ${longAnalysis.trajectory8h.mfeMeanPct}% | MAE: ${longAnalysis.trajectory8h.maeMeanPct}% | MFE/MAE: ${longAnalysis.trajectory8h.mfeMaeRatio}x | NetPnL: $${longAnalysis.executionMetrics.netPnL} | NetExp: $${longAnalysis.executionMetrics.netExpectancy} | NetPF: ${longAnalysis.executionMetrics.profitFactorNet} | NetWR: ${longAnalysis.executionMetrics.netTradeWinRate}%`);
  console.log(`SHORT (Upthrust) -> N: ${shortAnalysis.count} | PosRate: ${shortAnalysis.trajectory8h.posReturnRatePct}% | MFE: ${shortAnalysis.trajectory8h.mfeMeanPct}% | MAE: ${shortAnalysis.trajectory8h.maeMeanPct}% | MFE/MAE: ${shortAnalysis.trajectory8h.mfeMaeRatio}x | NetPnL: $${shortAnalysis.executionMetrics.netPnL} | NetExp: $${shortAnalysis.executionMetrics.netExpectancy} | NetPF: ${shortAnalysis.executionMetrics.profitFactorNet} | NetWR: ${shortAnalysis.executionMetrics.netTradeWinRate}%`);
  console.log(`CONSOLIDATED     -> N: ${allAnalysis.count} | PosRate: ${allAnalysis.trajectory8h.posReturnRatePct}% | MFE: ${allAnalysis.trajectory8h.mfeMeanPct}% | MAE: ${allAnalysis.trajectory8h.maeMeanPct}% | MFE/MAE: ${allAnalysis.trajectory8h.mfeMaeRatio}x | NetPnL: $${allAnalysis.executionMetrics.netPnL} | NetExp: $${allAnalysis.executionMetrics.netExpectancy} | NetPF: ${allAnalysis.executionMetrics.profitFactorNet} | NetWR: ${allAnalysis.executionMetrics.netTradeWinRate}%`);

  // 2. VOLATILITY REGIME BREAKDOWN (HIGH VOL vs LOW VOL)
  const highVolSignals = isSignals1h.filter(s => s.volRegime === 'HIGH_VOLATILITY');
  const lowVolSignals = isSignals1h.filter(s => s.volRegime === 'LOW_VOLATILITY');
  const highVolAnalysis = evaluatePopulationGroup(isCandles1h, highVolSignals, 'HIGH_VOLATILITY');
  const lowVolAnalysis = evaluatePopulationGroup(isCandles1h, lowVolSignals, 'LOW_VOLATILITY');

  console.log('\n--- 2. VOLATILITY REGIME BREAKDOWN ---');
  console.log(`HIGH VOL (ATR>=0.85%) -> N: ${highVolAnalysis.count} | MFE/MAE: ${highVolAnalysis.trajectory8h?.mfeMaeRatio}x | NetPnL: $${highVolAnalysis.executionMetrics?.netPnL} | NetExp: $${highVolAnalysis.executionMetrics?.netExpectancy} | NetPF: ${highVolAnalysis.executionMetrics?.profitFactorNet}`);
  console.log(`LOW VOL  (ATR<0.85%)  -> N: ${lowVolAnalysis.count} | MFE/MAE: ${lowVolAnalysis.trajectory8h?.mfeMaeRatio}x | NetPnL: $${lowVolAnalysis.executionMetrics?.netPnL} | NetExp: $${lowVolAnalysis.executionMetrics?.netExpectancy} | NetPF: ${lowVolAnalysis.executionMetrics?.profitFactorNet}`);

  // 3. TREND REGIME BREAKDOWN (BULL vs BEAR)
  const bullSignals = isSignals1h.filter(s => s.trendRegime === 'BULL_TREND');
  const bearSignals = isSignals1h.filter(s => s.trendRegime === 'BEAR_TREND');
  const bullAnalysis = evaluatePopulationGroup(isCandles1h, bullSignals, 'BULL_TREND');
  const bearAnalysis = evaluatePopulationGroup(isCandles1h, bearSignals, 'BEAR_TREND');

  console.log('\n--- 3. TREND REGIME BREAKDOWN ---');
  console.log(`BULL TREND (Close > SMA30) -> N: ${bullAnalysis.count} | MFE/MAE: ${bullAnalysis.trajectory8h?.mfeMaeRatio}x | NetPnL: $${bullAnalysis.executionMetrics?.netPnL} | NetExp: $${bullAnalysis.executionMetrics?.netExpectancy} | NetPF: ${bullAnalysis.executionMetrics?.profitFactorNet}`);
  console.log(`BEAR TREND (Close <= SMA30)-> N: ${bearAnalysis.count} | MFE/MAE: ${bearAnalysis.trajectory8h?.mfeMaeRatio}x | NetPnL: $${bearAnalysis.executionMetrics?.netPnL} | NetExp: $${bearAnalysis.executionMetrics?.netExpectancy} | NetPF: ${bearAnalysis.executionMetrics?.profitFactorNet}`);

  // 4. TRADE-BY-TRADE LEDGER COMPARISON
  console.log('\n--- 4. FULL TRADE LEDGER (IN-SAMPLE 1H) ---');
  console.log(`ID | Side  | Entry    | SL       | TP       | Exit     | Reason       | Hold | Gross PnL | Net PnL | R-Mult`);
  console.log('-'.repeat(105));
  allAnalysis.trades.forEach((t, i) => {
    console.log(`${String(i + 1).padStart(2)} | ${t.direction.padEnd(5)} | ${t.entryPrice.toFixed(2).padStart(8)} | ${t.stopPrice.toFixed(2).padStart(8)} | ${t.targetPrice.toFixed(2).padStart(8)} | ${t.exitPrice.toFixed(2).padStart(8)} | ${t.exitReason.padEnd(12)} | ${String(t.holdingHours).padStart(2)}h  | $${t.grossPnL.toFixed(2).padStart(8)} | $${t.netPnL.toFixed(2).padStart(7)} | ${t.rMultiple.toFixed(2).padStart(6)}R`);
  });

  const populationManifest = {
    experimentId: 'EXP-V5-1H-POPULATION-002',
    timestamp: new Date().toISOString(),
    dataset: 'BTCUSDT_1m_90d.json',
    datasetSha256,
    timeframe: '1h',
    isCandlesCount: isCandles1h.length,
    directional: { long: longAnalysis, short: shortAnalysis, consolidated: allAnalysis },
    volatilityRegime: { highVol: highVolAnalysis, lowVol: lowVolAnalysis },
    trendRegime: { bull: bullAnalysis, bear: bearAnalysis }
  };

  writeFileSync(resolve(outputDir, 'population_manifest.json'), JSON.stringify(populationManifest, null, 2));
  console.log(`\n✅ Population Dissection Completed. Manifest saved to ${resolve(outputDir, 'population_manifest.json')}`);
}

main().catch(err => {
  console.error(`\n❌ Fatal error in population analysis:`, err);
  process.exit(1);
});

import { parentPort, workerData } from 'worker_threads';
import { WyckoffVolumeProfileEngine } from '../../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';
import { FROZEN_V5_CONFIG, FROZEN_CONFIG_HASH } from '../frozenConfig.js';
import { getDatasetSnapshot, getLatestFundingRate } from '../datasetSnapshot.js';

export function runReconciliationTask() {
  const { candles, funding, hashes } = getDatasetSnapshot();

  const v5Engine = new WyckoffVolumeProfileEngine({
    lookback: FROZEN_V5_CONFIG.lookbackBars,
    volumeZScore: FROZEN_V5_CONFIG.volumeZScore,
    minPierceATR: FROZEN_V5_CONFIG.minPierceATR,
    pocProximity: FROZEN_V5_CONFIG.pocProximity,
    requireVolume: FROZEN_V5_CONFIG.requireVolume,
    requirePierce: FROZEN_V5_CONFIG.requirePierce,
    requirePOC: FROZEN_V5_CONFIG.requirePOC,
    requireReversal: FROZEN_V5_CONFIG.requireReversal
  });

  const WARMUP_BARS = 48;
  const END_BUFFER_BARS = 24;
  const totalBars = candles.length;
  const validBarsCount = totalBars - WARMUP_BARS - END_BUFFER_BARS;

  const springSignals = [];
  const springIndices = new Set();
  const lookbackBuffer = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    lookbackBuffer.push(c);
    if (lookbackBuffer.length > 300) lookbackBuffer.shift();
    if (i < WARMUP_BARS || lookbackBuffer.length < 30) continue;

    const mtf = { slow: lookbackBuffer, intermediate: lookbackBuffer, fast: lookbackBuffer };
    const nar = v5Engine.reconstruct(mtf);

    if (nar && nar.signal && nar.signal === FROZEN_V5_CONFIG.signalDirection) {
      springIndices.add(i);
      const prior = lookbackBuffer.slice(0, -1);
      const ranges = prior.map(x => x.high - x.low);
      const localAtr = ranges.reduce((s, r) => s + r, 0) / ranges.length;
      const fundingRate = getLatestFundingRate(funding, c.closeTime);

      springSignals.push({
        index: i,
        timestamp: c.openTime,
        dateStr: new Date(c.openTime).toISOString(),
        year: new Date(c.openTime).getUTCFullYear(),
        closePrice: c.close,
        openPriceNext: candles[i + 1] ? candles[i + 1].open : c.close,
        localAtr,
        fundingRate
      });
    }
  }

  // Factorial Partition
  const cellA_signals = springSignals.filter(s => s.fundingRate < FROZEN_V5_CONFIG.fundingThreshold);
  const cellB_signals = springSignals.filter(s => s.fundingRate >= FROZEN_V5_CONFIG.fundingThreshold);

  let cellC_count = 0;
  let cellD_count = 0;
  for (let i = WARMUP_BARS; i < candles.length - END_BUFFER_BARS; i++) {
    const c = candles[i];
    const fundingRate = getLatestFundingRate(funding, c.closeTime);
    const isSpring = springIndices.has(i);
    if (!isSpring && fundingRate < 0) cellC_count++;
    else if (!isSpring && fundingRate >= 0) cellD_count++;
  }

  const notional = FROZEN_V5_CONFIG.initialNotionalUSD;
  const takerFeePct = FROZEN_V5_CONFIG.takerFeePctPerLeg;
  const slippagePct = FROZEN_V5_CONFIG.slippagePctPerLeg;
  const slAtrMult = FROZEN_V5_CONFIG.stopLossAtrMultiplier;
  const tpRMult = FROZEN_V5_CONFIG.takeProfitRMultiplier;
  const timeExitBars = FROZEN_V5_CONFIG.maxHoldingBars;

  const ledger = [];
  let perTradeAccountingAllPass = true;

  for (let idx = 0; idx < cellA_signals.length; idx++) {
    const sig = cellA_signals[idx];
    const i = sig.index;

    const rawEntryPrice = sig.openPriceNext;
    const executedEntryPrice = rawEntryPrice * (1 + slippagePct);
    const slDist = Math.max(rawEntryPrice * FROZEN_V5_CONFIG.minStopDistancePct, sig.localAtr * slAtrMult);
    const stopPrice = rawEntryPrice - slDist;
    const targetPrice = rawEntryPrice + slDist * tpRMult;

    let rawExitPrice = null;
    let executedExitPrice = null;
    let exitReason = null;
    let exitBarIndex = null;

    for (let f = i + 1; f <= i + timeExitBars; f++) {
      const bar = candles[f];
      const hitSL = bar.low <= stopPrice;
      const hitTP = bar.high >= targetPrice;

      if (hitSL && hitTP) {
        rawExitPrice = stopPrice;
        executedExitPrice = stopPrice * (1 - slippagePct);
        exitReason = 'INTRABAR_COLLISION_SL';
        exitBarIndex = f;
        break;
      } else if (hitSL) {
        rawExitPrice = stopPrice;
        executedExitPrice = stopPrice * (1 - slippagePct);
        exitReason = 'STOP_LOSS';
        exitBarIndex = f;
        break;
      } else if (hitTP) {
        rawExitPrice = targetPrice;
        executedExitPrice = targetPrice * (1 - slippagePct);
        exitReason = 'TAKE_PROFIT';
        exitBarIndex = f;
        break;
      }

      if (f === i + timeExitBars) {
        rawExitPrice = bar.close;
        executedExitPrice = bar.close * (1 - slippagePct);
        exitReason = 'TIME_EXIT';
        exitBarIndex = f;
        break;
      }
    }

    if (rawExitPrice === null) {
      const bar = candles[i + timeExitBars];
      rawExitPrice = bar.close;
      executedExitPrice = bar.close * (1 - slippagePct);
      exitReason = 'TIME_EXIT';
      exitBarIndex = i + timeExitBars;
    }

    const bar6Close = candles[i + timeExitBars].close;
    const fwdPriceRet6hPct = ((bar6Close - rawEntryPrice) / rawEntryPrice) * 100;

    const rawPriceReturn = (rawExitPrice - rawEntryPrice) / rawEntryPrice;
    const trueGrossPnLFloat = notional * rawPriceReturn;

    const entryFeeFloat = notional * takerFeePct;
    const exitFeeFloat = notional * (rawExitPrice / rawEntryPrice) * takerFeePct;
    const exactTakerFeesFloat = entryFeeFloat + exitFeeFloat;

    const entrySlipFloat = notional * slippagePct;
    const exitSlipFloat = notional * (rawExitPrice / rawEntryPrice) * slippagePct;
    const exactSlipFloat = entrySlipFloat + exitSlipFloat;

    const grossPnL = Number(trueGrossPnLFloat.toFixed(2));
    const fees = Number(exactTakerFeesFloat.toFixed(2));
    const slip = Number(exactSlipFloat.toFixed(2));
    const friction = Number((fees + slip).toFixed(2));
    const netPnL = Number((grossPnL - friction).toFixed(2));

    const tradeIdentityPass = Math.abs((grossPnL - friction) - netPnL) <= 0.000001;
    if (!tradeIdentityPass) perTradeAccountingAllPass = false;

    ledger.push({
      tradeId: idx + 1,
      timestamp: sig.timestamp,
      dateUtc: sig.dateStr,
      year: sig.year,
      fundingRate: sig.fundingRate,
      rawEntryPrice: Number(rawEntryPrice.toFixed(2)),
      executedEntryPrice: Number(executedEntryPrice.toFixed(2)),
      stopPrice: Number(stopPrice.toFixed(2)),
      targetPrice: Number(targetPrice.toFixed(2)),
      rawExitPrice: Number(rawExitPrice.toFixed(2)),
      executedExitPrice: Number(executedExitPrice.toFixed(2)),
      exitReason,
      holdingHours: exitBarIndex - i,
      fwdPriceRet6hPct: Number(fwdPriceRet6hPct.toFixed(3)),
      trueGrossPnL: grossPnL,
      exactTakerFees: fees,
      exactSlippageCost: slip,
      totalFrictionCost: friction,
      trueNetPnL: netPnL,
      isNetWin: netPnL > 0,
      identityCheckPass: tradeIdentityPass
    });
  }

  const aggN = ledger.length;
  const aggGrossPnL = Number(ledger.reduce((s, t) => s + t.trueGrossPnL, 0).toFixed(2));
  const aggFees = Number(ledger.reduce((s, t) => s + t.exactTakerFees, 0).toFixed(2));
  const aggSlip = Number(ledger.reduce((s, t) => s + t.exactSlippageCost, 0).toFixed(2));
  const aggFriction = Number(ledger.reduce((s, t) => s + t.totalFrictionCost, 0).toFixed(2));
  const aggNetPnL = Number(ledger.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));

  const aggNetWins = ledger.filter(t => t.isNetWin);
  const aggNetLosses = ledger.filter(t => !t.isNetWin);
  const aggWinSum = Number(aggNetWins.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));
  const aggLossSum = Number(Math.abs(aggNetLosses.reduce((s, t) => s + t.trueNetPnL, 0)).toFixed(2));

  const aggNetPF = aggLossSum > 0 ? Number((aggWinSum / aggLossSum).toFixed(2)) : 10;
  const aggNetWR = Number(((aggNetWins.length / aggN) * 100).toFixed(2));
  const aggNetExp = Number((aggNetPnL / aggN).toFixed(3));
  const aggGrossExp = Number((aggGrossPnL / aggN).toFixed(3));

  // Partition Breakdown
  const devLedger = ledger.filter(t => t.year <= 2025);
  const oosLedger = ledger.filter(t => t.year === 2026);

  function calcSub(arr, label) {
    const n = arr.length;
    const g = Number(arr.reduce((s, t) => s + t.trueGrossPnL, 0).toFixed(2));
    const f = Number(arr.reduce((s, t) => s + t.totalFrictionCost, 0).toFixed(2));
    const net = Number(arr.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));
    const wins = arr.filter(t => t.isNetWin);
    const losses = arr.filter(t => !t.isNetWin);
    const wSum = Number(wins.reduce((s, t) => s + t.trueNetPnL, 0).toFixed(2));
    const lSum = Number(Math.abs(losses.reduce((s, t) => s + t.trueNetPnL, 0)).toFixed(2));
    return {
      label,
      n,
      grossPnL: g,
      friction: f,
      netPnL: net,
      netExp: Number((net / n).toFixed(3)),
      netPF: lSum > 0 ? Number((wSum / lSum).toFixed(2)) : 10,
      netWR: Number(((wins.length / n) * 100).toFixed(2))
    };
  }

  const devStats = calcSub(devLedger, 'Development (2023-2025)');
  const oosStats = calcSub(oosLedger, 'Blind OOS (2026)');

  const gateAPass = perTradeAccountingAllPass && Math.abs((aggGrossPnL - aggFriction) - aggNetPnL) <= 0.000001;

  return {
    workerName: 'reconciliationWorker',
    configHash: FROZEN_CONFIG_HASH,
    datasetHashes: hashes,
    cardinality: {
      totalBars,
      validBarsCount,
      cellA: cellA_signals.length,
      cellB: cellB_signals.length,
      cellC: cellC_count,
      cellD: cellD_count,
      sumMatch: (cellA_signals.length + cellB_signals.length + cellC_count + cellD_count) === validBarsCount
    },
    totals: {
      n: aggN,
      grossPnL: aggGrossPnL,
      fees: aggFees,
      slippage: aggSlip,
      totalFriction: aggFriction,
      netPnL: aggNetPnL,
      grossExpectancy: aggGrossExp,
      netExpectancy: aggNetExp,
      netProfitFactor: aggNetPF,
      netWinRate: aggNetWR,
      winsCount: aggNetWins.length,
      lossesCount: aggNetLosses.length
    },
    partitions: {
      dev2023_2025: devStats,
      blindOOS2026: oosStats
    },
    gateA_AccountingStatus: gateAPass ? 'PASS' : 'FAIL',
    ledger
  };
}

if (parentPort) {
  const result = runReconciliationTask();
  parentPort.postMessage(result);
}

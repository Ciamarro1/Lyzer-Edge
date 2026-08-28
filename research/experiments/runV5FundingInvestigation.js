import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WyckoffVolumeProfileEngine } from '../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function getCausalHTF(candlesHTF, t) {
  return candlesHTF.filter(c => c.closeTime <= t);
}

function computeSMA(arr, period) {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((s, c) => s + c.close, 0) / period;
}

function getLatestFundingRate(fundingList, t) {
  let latest = null;
  for (const f of fundingList) {
    if (f.fundingTime <= t) latest = f;
    else break;
  }
  return latest ? latest.fundingRate : 0.0001;
}

function extractSignals(all1h, allFunding) {
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

      const currentFunding = getLatestFundingRate(allFunding, t);
      let fundingRegime = 'NEUTRAL';
      if (currentFunding < 0) fundingRegime = 'NEGATIVE_DISCOUNT';
      else if (currentFunding > 0.0002) fundingRegime = 'ELEVATED_PREMIUM';

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
        currentFunding,
        fundingRegime
      });
    }
  }

  return signals;
}

function simulateExecution(allCandles, signals) {
  const takerFeePct = 0.001;
  const slippagePct = 0.0002;
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
      fundingRegime: sig.fundingRegime,
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

const allSignals = extractSignals(candles1h, fundingRates);
const allTrades = simulateExecution(candles1h, allSignals);

const negFundingTrades = allTrades.filter(t => t.fundingRegime === 'NEGATIVE_DISCOUNT');

console.log('='.repeat(75));
console.log('🔎 DEEP DIVE: NEGATIVE FUNDING REGIME (SHORT SQUEEZE & SHORT OVERCROWDING)');
console.log('='.repeat(75));

const years = [2023, 2024, 2025, 2026];
for (const yr of years) {
  const yrTrades = negFundingTrades.filter(t => t.year === yr);
  const m = computeMetrics(yrTrades);
  console.log(`Year ${yr} (Negative Funding) -> N: ${String(m.trades).padStart(2)} | NetPnL: $${String(m.netPnL).padStart(7)} | NetExp: $${String(m.netExp).padStart(6)} | NetPF: ${m.netPF} | NetWR: ${m.netWR}% | 6h Ret: ${m.meanForwardRet6hPct}%`);
}

// Market Baseline return during Negative Funding
const negFundingMarketReturns = [];
for (let i = 0; i < candles1h.length - 6; i++) {
  const c = candles1h[i];
  const f = getLatestFundingRate(fundingRates, c.closeTime);
  if (f < 0) {
    const entry = candles1h[i + 1].open;
    const exit = candles1h[i + 6].close;
    const ret = ((exit - entry) / entry) * 100;
    negFundingMarketReturns.push(ret);
  }
}

const mktMeanNegFundingRet = negFundingMarketReturns.length > 0 ? (negFundingMarketReturns.reduce((s, v) => s + v, 0) / negFundingMarketReturns.length) : 0;
const mNegOverall = computeMetrics(negFundingTrades);

console.log('\n--- Incremental Information Test in Negative Funding ---');
console.log(`Total Market 1h candles with Negative Funding : ${negFundingMarketReturns.length} (${((negFundingMarketReturns.length / candles1h.length) * 100).toFixed(1)}% of time)`);
console.log(`E[Return_6h | Market during Negative Funding] : +${mktMeanNegFundingRet.toFixed(3)}%`);
console.log(`E[Return_6h | Spring during Negative Funding] : +${mNegOverall.meanForwardRet6hPct}%`);
console.log(`Incremental Edge (Spring over Market)         : +${(mNegOverall.meanForwardRet6hPct - mktMeanNegFundingRet).toFixed(3)}% (+${((mNegOverall.meanForwardRet6hPct - mktMeanNegFundingRet) * 10).toFixed(2)} bps)`);


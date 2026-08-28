import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { ReplayDataIngestor } from '../replay/replayDataIngestor.js';
import { ExecutionSimulator } from '../replay/executionSimulator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function computeDirectionalMetrics(trades) {
  if (!trades || trades.length === 0) {
    return {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnL: 0,
      profitFactor: 0,
      expectancy: 0,
      maxDrawdown: 0,
      mfeMean: 0,
      mfeMedian: 0,
      mfeP25: 0,
      mfeP75: 0,
      mfeP90: 0,
      maeMean: 0,
      maeMedian: 0,
      dhr020: 0,
      dhr050: 0,
      dhr100: 0,
      pctMfeLt020: 100,
      pctMfeGe020: 0,
      pctMfeGe050: 0,
      pctMfeGe100: 0,
      compositeScore: 0,
      sampleTier: 'LOW-SAMPLE'
    };
  }

  const total = trades.length;
  const wins = trades.filter(t => t.netPnL > 0);
  const losses = trades.filter(t => t.netPnL <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.netPnL, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));
  const netPnL = grossProfit - grossLoss;
  const winRate = (wins.length / total) * 100;
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 10.0 : 0);
  const expectancy = netPnL / total;

  // Max Drawdown
  let equity = 10000;
  let peak = equity;
  let maxDD = 0;
  for (const t of trades) {
    equity += (t.netPnL || 0);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) maxDD = dd;
  }

  // Calculate MFE and MAE in R-units for each trade
  const mfeRList = [];
  const maeRList = [];

  let countGe020 = 0;
  let countGe050 = 0;
  let countGe100 = 0;

  for (const t of trades) {
    const entryPrice = t.entryPrice || 1;
    const stopLoss = t.initialStopLoss || t.stopLoss || entryPrice * 0.99;
    const riskDistance = Math.abs(entryPrice - stopLoss);
    const riskDistPct = riskDistance / entryPrice;

    // Trade MFE and MAE
    const rawMfePct = t.mfe || 0;
    const rawMaePct = Math.abs(t.mae || 0);

    const mfeR = riskDistPct > 0 ? (rawMfePct / riskDistPct) : 0;
    const maeR = riskDistPct > 0 ? (rawMaePct / riskDistPct) : 0;

    mfeRList.push(mfeR);
    maeRList.push(maeR);

    if (mfeR >= 0.20) countGe020++;
    if (mfeR >= 0.50) countGe050++;
    if (mfeR >= 1.00) countGe100++;
  }

  mfeRList.sort((a, b) => a - b);
  maeRList.sort((a, b) => a - b);

  const quantile = (arr, q) => {
    if (arr.length === 0) return 0;
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    }
    return arr[base];
  };

  const mfeMean = mfeRList.reduce((s, v) => s + v, 0) / total;
  const mfeMedian = quantile(mfeRList, 0.50);
  const mfeP25 = quantile(mfeRList, 0.25);
  const mfeP75 = quantile(mfeRList, 0.75);
  const mfeP90 = quantile(mfeRList, 0.90);

  const maeMean = maeRList.reduce((s, v) => s + v, 0) / total;
  const maeMedian = quantile(maeRList, 0.50);

  const dhr020 = (countGe020 / total) * 100;
  const dhr050 = (countGe050 / total) * 100;
  const dhr100 = (countGe100 / total) * 100;

  const pctMfeLt020 = ((total - countGe020) / total) * 100;
  const pctMfeGe020 = dhr020;
  const pctMfeGe050 = dhr050;
  const pctMfeGe100 = dhr100;

  // Sample confidence tier
  let sampleTier = 'LOW-SAMPLE';
  let sampleMultiplier = 0.5;
  if (total >= 100) {
    sampleTier = 'HIGH-CONFIDENCE';
    sampleMultiplier = 1.0;
  } else if (total >= 30) {
    sampleTier = 'MEDIUM-CONFIDENCE';
    sampleMultiplier = 0.85;
  }

  // Composite Robustness Score:
  // Combines DHR 0.50R, DHR 0.20R, Profit Factor, Expectancy, and Sample Size
  const clampedPF = Math.min(2.5, Math.max(0, profitFactor));
  const compositeScore = (
    (dhr050 * 0.35) +
    (dhr020 * 0.20) +
    (clampedPF * 20.0 * 0.25) +
    (Math.max(-10, Math.min(10, expectancy * 50)) * 0.20)
  ) * sampleMultiplier;

  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    winRate: Number(winRate.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    netPnL: Number(netPnL.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    expectancy: Number(expectancy.toFixed(4)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    mfeMean: Number(mfeMean.toFixed(3)),
    mfeMedian: Number(mfeMedian.toFixed(3)),
    mfeP25: Number(mfeP25.toFixed(3)),
    mfeP75: Number(mfeP75.toFixed(3)),
    mfeP90: Number(mfeP90.toFixed(3)),
    maeMean: Number(maeMean.toFixed(3)),
    maeMedian: Number(maeMedian.toFixed(3)),
    dhr020: Number(dhr020.toFixed(2)),
    dhr050: Number(dhr050.toFixed(2)),
    dhr100: Number(dhr100.toFixed(2)),
    pctMfeLt020: Number(pctMfeLt020.toFixed(2)),
    pctMfeGe020: Number(pctMfeGe020.toFixed(2)),
    pctMfeGe050: Number(pctMfeGe050.toFixed(2)),
    pctMfeGe100: Number(pctMfeGe100.toFixed(2)),
    compositeScore: Number(compositeScore.toFixed(2)),
    sampleTier
  };
}

export async function runGridJob(job) {
  const { providerId, params, segment = 'is', enableShorts = false } = job;

  const allProviders = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'];
  const disabledList = allProviders.filter(p => p !== providerId.toLowerCase());

  process.env.DISABLED_PROVIDERS = disabledList.join(',');
  process.env.FAST_TF = '1m';
  process.env.INTERMEDIATE_TF = '1m';
  process.env.SLOW_TF = '1m';
  process.env.ARL_MODE = 'SIMULATION';
  process.env.FAST_REPLAY = 'true';
  process.env.COURT_SECRET_KEY = 'REPLAY_SECRET_MOCK';
  if (enableShorts) {
    process.env.ALLOW_SHORTS = 'true';
    process.env.SHORT_ENABLED = 'true';
  } else {
    process.env.ALLOW_SHORTS = 'false';
    process.env.SHORT_ENABLED = 'false';
  }

  const streamEnginePath = resolve(__dirname, '../../lyzer edge/backend/streamEngine.js');
  const { StreamEngine } = await import(pathToFileURL(streamEnginePath).href);

  const datasetPath = resolve(__dirname, '../datasets/BTCUSDT_1m_90d.json');
  const ingestorMaster = new ReplayDataIngestor(datasetPath, { symbol: 'BTCUSDT' });
  const split = ingestorMaster.computeTemporalSplit({ is: 0.6, val: 0.2, oos: 0.2 });

  const bounds = split[segment];
  const ingestor = new ReplayDataIngestor(datasetPath, {
    symbol: 'BTCUSDT',
    startTime: bounds.startTime,
    endTime: bounds.endTime,
  });

  const execSim = new ExecutionSimulator({
    takerFeePct: 0.001,
    slippagePct: 0.0002,
  });

  const engine = new StreamEngine({
    mode: 'SIMULATION',
    symbol: 'BTCUSDT',
    interval: '1m',
    stabilizationWindowMs: 0,
    providerConfigs: {
      [providerId.toLowerCase()]: params
    }
  });

  engine.isRunning = true;
  engine.execution = null;

  // Warmup 500 candles
  const warmupCandles = ingestor.getWarmupCandles(500);
  for (const c of warmupCandles) {
    engine.updateMtfCandles(c);
    try { await engine.processCandle(c, 0); } catch (_) {}
  }
  engine.tradeHistory = [];
  engine.activePosition = null;

  const t0 = performance.now();
  let candleCount = 0;

  while (ingestor.hasNext()) {
    const candle = ingestor.next();
    if (!candle) break;
    candleCount++;
    engine.updateMtfCandles(candle);
    try {
      await engine.processCandle(candle, candleCount);
    } catch (_) {}
  }

  // Force close any remaining open position at the final candle
  if (engine.activePosition && ingestor.candles.length > 0) {
    const lastCandle = ingestor.candles[ingestor.candles.length - 1];
    const pos = engine.activePosition;
    const exitPrice = lastCandle.close;
    engine.tradeHistory.push({
      ...pos,
      exitPrice,
      exitReason: 'END_OF_SIMULATION',
      exitTimestamp: Math.floor((lastCandle.openTime || lastCandle.timestamp) / 1000),
      closeTime: lastCandle.openTime || lastCandle.timestamp
    });
    engine.activePosition = null;
  }

  const t1 = performance.now();
  const runtimeMs = t1 - t0;

  // Apply execution costs
  const tradesWithCosts = engine.tradeHistory.map(t => {
    const notional = t.notional || t.size || 100;
    const pnl = execSim.calculatePnL({
      direction: t.direction,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice || t.entryPrice,
      notional,
      scaleOutHistory: t.scaleOutHistory
    });
    return {
      ...t,
      ...pnl,
      entryTime: t.timestamp || t.openTime,
      exitTime: t.closeTime || t.exitTimestamp,
    };
  });

  const metrics = computeDirectionalMetrics(tradesWithCosts);

  return {
    jobId: job.id,
    provider: providerId.toUpperCase(),
    params,
    segment,
    enableShorts,
    runtimeMs,
    candlesProcessed: candleCount,
    metrics
  };
}

if (process.send) {
  process.on('message', async (msg) => {
    try {
      const res = await runGridJob(msg);
      process.send({ success: true, result: res }, () => {
        setTimeout(() => process.exit(0), 50);
      });
    } catch (err) {
      process.send({ success: false, error: err.message, stack: err.stack }, () => {
        setTimeout(() => process.exit(1), 50);
      });
    }
  });
}

import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const edgeDir = path.resolve(__dirname, '../../');

// Load base environment
dotenv.config({ path: path.join(edgeDir, '.env') });
process.env.ARL_MODE = 'SIMULATION';
process.env.SHADOW_TRADING_ENABLED = 'false';
process.env.MOL_STABILIZATION_WINDOW_MS = '0';
process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'default_secret_key_for_eca_court_must_be_set_in_production_32bytes';

const SYMBOL = 'BTCUSDT';
const DATASET_HOURS = 45.12;
const ACTIVE_CANDLE_COUNT = Math.round(DATASET_HOURS * 60); // 2707 candles
const WARMUP_CANDLES = 500;
const INITIAL_WALLET = 10000;

// Dynamic imports
const { StreamEngine } = await import('../streamEngine.js');
const { ExchangeExecution } = await import('../exchangeExecution.js');
const { OpenMobiusFeatureEngine } = await import('../../src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusFeatureEngine.js');

const originalLog = console.log;
const originalError = console.error;

function muteEngineLogs() {
  console.log = function (...args) {
    if (typeof args[0] === 'string' && (
      args[0].includes('[ENGINE]') ||
      args[0].includes('[TELEGRAM]') ||
      args[0].includes('[ECA]') ||
      args[0].includes('[SCALP]') ||
      args[0].includes('[SNIPER]') ||
      args[0].includes('[DEBUG]') ||
      args[0].includes('[STREAM]') ||
      args[0].includes('[DB]') ||
      args[0].includes('[gRPC')
    )) {
      return;
    }
    originalLog.apply(console, args);
  };

  console.error = function (...args) {
    if (typeof args[0] === 'string' && (
      args[0].includes('[DB]') ||
      args[0].includes('[CAUSAL_MEMORY]') ||
      args[0].includes('SQLITE_CONSTRAINT')
    )) {
      return;
    }
    originalError.apply(console, args);
  };
}

function unmuteLogs() {
  console.log = originalLog;
  console.error = originalError;
}

// 1. Data Ingestion Protocol
async function fetchBinanceFallback(symbol, limit) {
  return new Promise((resolve, reject) => {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=${limit}`;
    originalLog(`[DATA] Fetching ${limit} candles from Binance API: ${url}`);
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Binance HTTP ${res.statusCode}: ${data}`));
        const parsed = JSON.parse(data);
        const candles = parsed.map(k => ({
          openTime: k[0],
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closed: true
        }));
        resolve(candles);
      });
    }).on('error', reject);
  });
}

async function loadRailwayDataset() {
  const localCandidates = [
    path.join(edgeDir, '.data', `${SYMBOL}_1m_10d.json`),
    path.join(edgeDir, '.data', `${SYMBOL}_1m_25d.json`),
    path.join(rootDir, `historical_data_${SYMBOL}.json`)
  ];

  let rawCandles = null;
  for (const p of localCandidates) {
    if (existsSync(p)) {
      originalLog(`[DATA] Loading local dataset from ${p}...`);
      const fileData = readFileSync(p, 'utf8');
      rawCandles = JSON.parse(fileData);
      break;
    }
  }

  if (!rawCandles || rawCandles.length < (WARMUP_CANDLES + ACTIVE_CANDLE_COUNT)) {
    originalLog(`[DATA] Local dataset insufficient. Fetching from Binance...`);
    rawCandles = await fetchBinanceFallback(SYMBOL, WARMUP_CANDLES + ACTIVE_CANDLE_COUNT);
  }

  const allCandles = rawCandles.map(c => ({
    openTime: c.openTime || c.timestamp,
    timestamp: c.timestamp || c.openTime,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: Number(c.volume || 0),
    closed: true
  }));

  const totalRequired = WARMUP_CANDLES + ACTIVE_CANDLE_COUNT;
  const sliced = allCandles.slice(0, totalRequired);
  originalLog(`[DATA] Loaded ${sliced.length} total candles: ${WARMUP_CANDLES} warmup + ${ACTIVE_CANDLE_COUNT} active (${DATASET_HOURS}h)`);
  return {
    warmupCandles: sliced.slice(0, WARMUP_CANDLES),
    activeCandles: sliced.slice(WARMUP_CANDLES)
  };
}

// 2. Statistical Metrics Calculator
function computeMetrics(trades, datasetHours = DATASET_HOURS) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRatePct: 0,
      netPnlPct: 0,
      netPnlUsd: 0,
      profitFactor: 0,
      expectancyPct: 0,
      expectancyUsd: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      avgHoldingMinutes: 0,
      tradesPerDay: 0,
      avgMfePct: 0,
      avgMaePct: 0
    };
  }

  let wins = 0;
  let losses = 0;
  let grossGain = 0;
  let grossLoss = 0;
  let netPnlPct = 0;
  let netPnlUsd = 0;
  let totalHoldingMinutes = 0;
  let totalMfe = 0;
  let totalMae = 0;

  let peakWallet = INITIAL_WALLET;
  let currentWallet = INITIAL_WALLET;
  let maxDrawdownUsd = 0;
  let maxDrawdownPct = 0;
  const pnlList = [];

  for (const t of trades) {
    const pnl = t.pnl || 0;
    pnlList.push(pnl);
    const tradeUsd = INITIAL_WALLET * pnl;
    currentWallet += tradeUsd;
    netPnlPct += pnl;
    netPnlUsd += tradeUsd;

    if (currentWallet > peakWallet) peakWallet = currentWallet;
    const ddUsd = peakWallet - currentWallet;
    const ddPct = peakWallet > 0 ? (ddUsd / peakWallet) : 0;
    if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

    if (pnl > 0) {
      wins++;
      grossGain += tradeUsd;
    } else {
      losses++;
      grossLoss += Math.abs(tradeUsd);
    }

    totalHoldingMinutes += (t.holdingMinutes || 15);
    totalMfe += (t.mfe || 0);
    totalMae += (t.mae || 0);
  }

  const winRatePct = (wins / trades.length) * 100;
  const profitFactor = grossLoss > 0 ? (grossGain / grossLoss) : (grossGain > 0 ? 99.99 : 0);
  const expectancyPct = netPnlPct / trades.length;
  const expectancyUsd = netPnlUsd / trades.length;

  const meanRet = expectancyPct;
  const varRet = pnlList.reduce((acc, p) => acc + Math.pow(p - meanRet, 2), 0) / (trades.length > 1 ? trades.length - 1 : 1);
  const stdRet = Math.sqrt(varRet);
  const tradesPerDay = (trades.length / datasetHours) * 24;
  const sharpeRatio = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(tradesPerDay * 365) : 0;

  return {
    totalTrades: trades.length,
    wins,
    losses,
    winRatePct,
    netPnlPct: netPnlPct * 100,
    netPnlUsd,
    profitFactor,
    expectancyPct: expectancyPct * 100,
    expectancyUsd,
    maxDrawdownPct: maxDrawdownPct * 100,
    sharpeRatio,
    avgHoldingMinutes: totalHoldingMinutes / trades.length,
    tradesPerDay,
    avgMfePct: (totalMfe / trades.length) * 100,
    avgMaePct: (totalMae / trades.length) * 100
  };
}

// 3. World Replay Execution Harness
async function runReplayWorld({
  worldName,
  warmupCandles,
  activeCandles,
  worldConfig
}) {
  muteEngineLogs();

  // Apply environment configuration for this world
  process.env.ENABLE_TIME_EXIT_ALPHA = worldConfig.enableTimeExit ? 'true' : 'false';
  process.env.TIME_EXIT_MINUTES = String(worldConfig.timeExitMinutes || 15);
  process.env.DISABLED_PROVIDERS = worldConfig.disabledProviders || 'v1,v3';
  process.env.TRG_THRESHOLD = String(worldConfig.trgThreshold || 0.30);
  process.env.RESIDUAL_CONSENSUS_LIMIT = String(worldConfig.consensusLimit || 0.1);
  process.env.LHDS_VETO_LIMIT = String(worldConfig.lhdsVetoLimit || 0.95);
  process.env.ONTOLOGICAL_COLLAPSE_TRG = String(worldConfig.ontologicalCollapseTrg || 0.7);

  const engine = new StreamEngine({ symbol: SYMBOL, mode: 'SIMULATION' });
  engine.execution = new ExchangeExecution('MOCK_KEY', 'MOCK_SECRET', true);
  engine.execution.placeOrder = async () => ({ status: 'FILLED' });
  engine.causalMemoryDB = { recordTick: async () => {}, recordState: async () => {}, recordOrder: async () => {} };

  const mobiusFeatures = new OpenMobiusFeatureEngine(500);

  // Hook into dampener & court for World C & D filters
  const originalCanOpenTrade = engine.dampener.canOpenTrade.bind(engine.dampener);
  engine.dampener.canOpenTrade = (symbol, currentCandleIdx, context) => {
    const candle = engine.candles[engine.candles.length - 1] || activeCandles[0];
    const ts = candle.openTime || candle.timestamp || Date.now();
    const date = new Date(ts);
    const hour = date.getUTCHours();
    const isGoldenHour = (hour >= 8 && hour <= 12) || (hour >= 19 && hour <= 21);
    const isAsianNight = hour >= 0 && hour < 8;

    // Mundo C Filter: Low Liquidity Night & Off-peak floor 0.48
    if (worldConfig.regimeFilter) {
      if (isAsianNight) {
        return { permitted: false, reason: 'FILTER_LOW_LIQUIDITY_NIGHT' };
      }
      if (!isGoldenHour && !isAsianNight) {
        const trg = context.trg || 0;
        if (trg < (worldConfig.offPeakFloor || 0.48)) {
          return { permitted: false, reason: 'FILTER_OFF_PEAK_FLOOR_048' };
        }
      }
    }

    // Mundo D Filter: Dealing Range (Premium/Discount Equilibrium)
    if (worldConfig.dealingRangeFilter) {
      const range50 = mobiusFeatures.getDealingRange(50);
      if (range50 && range50.equilibrium > 0) {
        if (context.entrySide === 'LONG' && candle.close > range50.equilibrium) {
          return { permitted: false, reason: 'VETO_BUY_IN_PREMIUM' };
        }
        if (context.entrySide === 'SHORT' && candle.close < range50.equilibrium) {
          return { permitted: false, reason: 'VETO_SELL_IN_DISCOUNT' };
        }
      }
    }

    // Default dampener logic
    return originalCanOpenTrade(symbol, currentCandleIdx, context);
  };

  // Trajectory tracker for MFE Capture Matrix
  const tradeTrajectories = new Map();
  let currentActiveTradeRef = null;

  engine.on('trade_closed', (trade) => {
    if (trade && trade.id && tradeTrajectories.has(trade.id)) {
      const traj = tradeTrajectories.get(trade.id);
      traj.closedAt = trade.closedAt;
      traj.exitPrice = trade.exitPrice;
      traj.exitReason = trade.exitReason;
      traj.finalPnl = trade.pnl;
    }
  });

  // Warmup Phase
  for (const c of warmupCandles) {
    const tickEvent = { ...c, timestamp: c.openTime, closed: true };
    mobiusFeatures.pushCandle(c.open, c.high, c.low, c.close, c.volume);
    engine.updateMtfCandles(tickEvent);
    await engine.processCandle(tickEvent, engine.tickCounter, true);
  }

  engine.ingestor = { onTick: () => {} };
  engine.ingestor.onTick = (candle) => {
    engine.checkTickPositionExit(candle);
  };

  // Active Execution Phase
  for (let i = 0; i < activeCandles.length; i++) {
    const candle = activeCandles[i];
    const tickEvent = { ...candle, timestamp: candle.openTime, closed: true };
    engine.tickCounter++;
    mobiusFeatures.pushCandle(candle.open, candle.high, candle.low, candle.close, candle.volume);
    engine.updateMtfCandles(tickEvent);

    // Track active position trajectory
    if (engine.activePosition) {
      const pos = engine.activePosition;
      if (!tradeTrajectories.has(pos.id)) {
        tradeTrajectories.set(pos.id, {
          tradeId: pos.id,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          entryTime: pos.timestamp,
          holdingCandles: 0,
          peakMfeR: 0,
          snapshots: {}
        });
      }

      const traj = tradeTrajectories.get(pos.id);
      traj.holdingCandles++;
      const currentCandleM = traj.holdingCandles;

      const riskDist = Math.abs(pos.entryPrice - (pos.initialStopLoss || pos.stopLoss)) || (pos.entryPrice * 0.0025);
      const favorable = pos.direction === 'LONG' ? (candle.high - pos.entryPrice) : (pos.entryPrice - candle.low);
      const mfeR = riskDist > 0 ? Math.max(0, favorable / riskDist) : 0;
      if (mfeR > traj.peakMfeR) traj.peakMfeR = mfeR;

      if ([5, 10, 15, 20, 30].includes(currentCandleM)) {
        const closePnl = pos.direction === 'LONG' ? (candle.close - pos.entryPrice) : (pos.entryPrice - candle.close);
        const pnlR = riskDist > 0 ? (closePnl / riskDist) : 0;
        traj.snapshots[currentCandleM] = {
          mfeR: traj.peakMfeR,
          pnlR,
          closePrice: candle.close
        };
      }

      // Hybrid Exit Policy time cap enforcement if configured
      if (worldConfig.hybridTimeCap && traj.holdingCandles >= worldConfig.hybridTimeCap) {
        pos.exitReason = `HYBRID_TIME_CAP_${worldConfig.hybridTimeCap}M`;
      }
    }

    await engine.processCandle(tickEvent, engine.tickCounter, false);
    engine.ingestor.onTick(tickEvent);
  }

  unmuteLogs();

  // Attach trajectory to trade history
  const enrichedTrades = engine.tradeHistory.map(t => {
    const traj = tradeTrajectories.get(t.id);
    return {
      ...t,
      holdingMinutes: traj ? traj.holdingCandles : (t.holdingMinutes || 15),
      trajectory: traj ? traj.snapshots : {}
    };
  });

  const metrics = computeMetrics(enrichedTrades, DATASET_HOURS);
  return {
    worldName,
    config: worldConfig,
    trades: enrichedTrades,
    metrics
  };
}

// 4. MFE Capture Ratio Matrix Processor
function computeMfeCaptureMatrix(allWorldTrades) {
  const windows = [5, 10, 15, 20, 30];
  const matrix = {};

  for (const w of windows) {
    matrix[w] = {
      windowMin: w,
      sampleCount: 0,
      totalPeakMfeR: 0,
      totalRealizedPnlR: 0,
      captureRatios: [],
      peakReachedCount: 0,
      reversalFrom1RCount: 0,
      countAtLeast1R: 0
    };
  }

  for (const t of allWorldTrades) {
    if (!t.trajectory) continue;
    const finalMfeR = t.mfe ? (t.mfe / 0.0025) : 1.0;

    for (const w of windows) {
      const snap = t.trajectory[w];
      if (snap) {
        const m = matrix[w];
        m.sampleCount++;
        const peakMfeR = snap.mfeR || 0;
        const pnlR = snap.pnlR || 0;

        m.totalPeakMfeR += peakMfeR;
        m.totalRealizedPnlR += pnlR;

        const ratio = peakMfeR > 0 ? Math.max(0, Math.min(1.0, pnlR / peakMfeR)) : (pnlR > 0 ? 1.0 : 0);
        m.captureRatios.push(ratio);

        if (peakMfeR >= finalMfeR * 0.90) {
          m.peakReachedCount++;
        }

        if (peakMfeR >= 1.0) { // >= 1.0R favorable
          m.countAtLeast1R++;
          if (pnlR <= 0.1) { // reversed back to breakeven or loss
            m.reversalFrom1RCount++;
          }
        }
      }
    }
  }

  const result = {};
  for (const w of windows) {
    const m = matrix[w];
    const n = m.sampleCount || 1;
    const avgPeakMfeR = m.totalPeakMfeR / n;
    const avgRealizedPnlR = m.totalRealizedPnlR / n;
    const avgCaptureRatio = m.captureRatios.length > 0
      ? (m.captureRatios.reduce((a, b) => a + b, 0) / m.captureRatios.length) * 100
      : 0;
    const peakReachedPct = (m.peakReachedCount / n) * 100;
    const reversalRatePct = m.countAtLeast1R > 0 ? (m.reversalFrom1RCount / m.countAtLeast1R) * 100 : 0;

    result[`${w}m`] = {
      windowMinutes: w,
      sampleSize: m.sampleCount,
      avgPeakMfeR,
      avgRealizedPnlR,
      mfeCaptureRatioPct: avgCaptureRatio,
      peakReachedBeforeWindowPct: peakReachedPct,
      reversalRateFrom1RPct: reversalRatePct
    };
  }

  return result;
}

// 5. Main Execution Orchestration
async function main() {
  originalLog(`\n========================================================================================`);
  originalLog(`🏛️  LYZER LABS — FORENSIC REPLAY V2: 5 CAUSAL WORLDS & MFE CAPTURE ARCHITECTURE`);
  originalLog(`   Dataset: Railway Production Forward (45.12h / 64 Baseline Trades Target)`);
  originalLog(`========================================================================================\n`);

  const { warmupCandles, activeCandles } = await loadRailwayDataset();

  // Define the 5 Causal Worlds + Variations
  const worldConfigs = {
    MundoA: {
      worldTitle: 'Mundo A (Baseline Railway)',
      enableTimeExit: true,
      timeExitMinutes: 15,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.20, // Permeable veto baseline
      consensusLimit: 0.40,
      lhdsVetoLimit: 0.99,
      regimeFilter: false,
      dealingRangeFilter: false
    },
    MundoB: {
      worldTitle: 'Mundo B (Time Exit 15m Corrigido)',
      enableTimeExit: true,
      timeExitMinutes: 15,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30, // Sovereign VETO
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: false,
      dealingRangeFilter: false
    },
    MundoC: {
      worldTitle: 'Mundo C (B + Regime)',
      enableTimeExit: true,
      timeExitMinutes: 15,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: false
    },
    MundoD: {
      worldTitle: 'Mundo D (C + Dealing Range)',
      enableTimeExit: true,
      timeExitMinutes: 15,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Time10m: {
      worldTitle: 'Mundo E (Time Exit 10m)',
      enableTimeExit: true,
      timeExitMinutes: 10,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Time15m: {
      worldTitle: 'Mundo E (Time Exit 15m)',
      enableTimeExit: true,
      timeExitMinutes: 15,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Time20m: {
      worldTitle: 'Mundo E (Time Exit 20m)',
      enableTimeExit: true,
      timeExitMinutes: 20,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Time30m: {
      worldTitle: 'Mundo E (Time Exit 30m)',
      enableTimeExit: true,
      timeExitMinutes: 30,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Dynamic: {
      worldTitle: 'Mundo E (Dynamic TP/SL 33/33/34%)',
      enableTimeExit: false, // Pure Dynamic Scale-Out & Trailing Stop
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    },
    MundoE_Hybrid: {
      worldTitle: 'Mundo E (Híbrido Dynamic + 20m Cap)',
      enableTimeExit: false,
      hybridTimeCap: 20,
      disabledProviders: 'v1,v3',
      trgThreshold: 0.30,
      consensusLimit: 0.10,
      lhdsVetoLimit: 0.95,
      regimeFilter: true,
      offPeakFloor: 0.48,
      dealingRangeFilter: true
    }
  };

  const results = {};

  for (const [wKey, cfg] of Object.entries(worldConfigs)) {
    originalLog(`[REPLAY] Running ${cfg.worldTitle}...`);
    const res = await runReplayWorld({
      worldName: wKey,
      warmupCandles,
      activeCandles,
      worldConfig: cfg
    });
    results[wKey] = res;
    originalLog(`  -> ${wKey}: ${res.metrics.totalTrades} trades | WR: ${res.metrics.winRatePct.toFixed(2)}% | Net PnL: ${res.metrics.netPnlPct.toFixed(2)}% | PF: ${res.metrics.profitFactor.toFixed(2)} | MaxDD: ${res.metrics.maxDrawdownPct.toFixed(2)}% | Sharpe: ${res.metrics.sharpeRatio.toFixed(2)}`);
  }

  // --- 3. CAUSAL DECOMPOSITION COMPUTATION ---
  const mA = results.MundoA.metrics;
  const mB = results.MundoB.metrics;
  const mC = results.MundoC.metrics;
  const mD = results.MundoD.metrics;
  const mE_Best = results.MundoE_Hybrid.metrics;

  const causalDecomposition = {
    delta_VETO_B_minus_A: {
      step: 'Mundo B - Mundo A (Efeito do VETO Soberano / Infraestrutura)',
      deltaTrades: mB.totalTrades - mA.totalTrades,
      deltaWinRatePct: mB.winRatePct - mA.winRatePct,
      deltaNetPnlPct: mB.netPnlPct - mA.netPnlPct,
      deltaProfitFactor: mB.profitFactor - mA.profitFactor,
      deltaMaxDrawdownPct: mB.maxDrawdownPct - mA.maxDrawdownPct,
      deltaExpectancyUsd: mB.expectancyUsd - mA.expectancyUsd,
      deltaSharpe: mB.sharpeRatio - mA.sharpeRatio
    },
    delta_REGIME_C_minus_B: {
      step: 'Mundo C - Mundo B (Efeito do Filtro de Regime & Off-Peak Floor)',
      deltaTrades: mC.totalTrades - mB.totalTrades,
      deltaWinRatePct: mC.winRatePct - mB.winRatePct,
      deltaNetPnlPct: mC.netPnlPct - mB.netPnlPct,
      deltaProfitFactor: mC.profitFactor - mB.profitFactor,
      deltaMaxDrawdownPct: mC.maxDrawdownPct - mB.maxDrawdownPct,
      deltaExpectancyUsd: mC.expectancyUsd - mB.expectancyUsd,
      deltaSharpe: mC.sharpeRatio - mB.sharpeRatio
    },
    delta_DEALING_RANGE_D_minus_C: {
      step: 'Mundo D - Mundo C (Efeito do Dealing Range / Premium-Discount)',
      deltaTrades: mD.totalTrades - mC.totalTrades,
      deltaWinRatePct: mD.winRatePct - mC.winRatePct,
      deltaNetPnlPct: mD.netPnlPct - mC.netPnlPct,
      deltaProfitFactor: mD.profitFactor - mC.profitFactor,
      deltaMaxDrawdownPct: mD.maxDrawdownPct - mC.maxDrawdownPct,
      deltaExpectancyUsd: mD.expectancyUsd - mC.expectancyUsd,
      deltaSharpe: mD.sharpeRatio - mC.sharpeRatio
    },
    delta_EXIT_POLICY_E_minus_D: {
      step: 'Mundo E (Híbrido) - Mundo D (Efeito da Política de Saída Híbrida)',
      deltaTrades: mE_Best.totalTrades - mD.totalTrades,
      deltaWinRatePct: mE_Best.winRatePct - mD.winRatePct,
      deltaNetPnlPct: mE_Best.netPnlPct - mD.netPnlPct,
      deltaProfitFactor: mE_Best.profitFactor - mD.profitFactor,
      deltaMaxDrawdownPct: mE_Best.maxDrawdownPct - mD.maxDrawdownPct,
      deltaExpectancyUsd: mE_Best.expectancyUsd - mD.expectancyUsd,
      deltaSharpe: mE_Best.sharpeRatio - mD.sharpeRatio
    }
  };

  // --- 4. MFE CAPTURE RATIO MATRIX COMPUTATION ---
  const allReplayedTrades = [
    ...results.MundoA.trades,
    ...results.MundoB.trades,
    ...results.MundoC.trades,
    ...results.MundoD.trades
  ];
  const mfeMatrix = computeMfeCaptureMatrix(allReplayedTrades);

  // --- 5. FORMATTED REPORT TO CONSOLE ---
  originalLog(`\n========================================================================================`);
  originalLog(`📊 1. COMPARATIVE PERFORMANCE MATRIX ACROSS 5 CAUSAL WORLDS`);
  originalLog(`========================================================================================`);
  console.table({
    'Mundo A (Baseline Railway)': {
      Trades: mA.totalTrades,
      'Win Rate': `${mA.winRatePct.toFixed(2)}%`,
      'Net PnL': `${mA.netPnlPct.toFixed(2)}%`,
      PF: mA.profitFactor.toFixed(2),
      'Max DD': `${mA.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: mA.sharpeRatio.toFixed(2),
      Expectancy: `$${mA.expectancyUsd.toFixed(2)}`
    },
    'Mundo B (Time Exit 15m Corrigido)': {
      Trades: mB.totalTrades,
      'Win Rate': `${mB.winRatePct.toFixed(2)}%`,
      'Net PnL': `${mB.netPnlPct.toFixed(2)}%`,
      PF: mB.profitFactor.toFixed(2),
      'Max DD': `${mB.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: mB.sharpeRatio.toFixed(2),
      Expectancy: `$${mB.expectancyUsd.toFixed(2)}`
    },
    'Mundo C (B + Regime)': {
      Trades: mC.totalTrades,
      'Win Rate': `${mC.winRatePct.toFixed(2)}%`,
      'Net PnL': `${mC.netPnlPct.toFixed(2)}%`,
      PF: mC.profitFactor.toFixed(2),
      'Max DD': `${mC.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: mC.sharpeRatio.toFixed(2),
      Expectancy: `$${mC.expectancyUsd.toFixed(2)}`
    },
    'Mundo D (C + Dealing Range)': {
      Trades: mD.totalTrades,
      'Win Rate': `${mD.winRatePct.toFixed(2)}%`,
      'Net PnL': `${mD.netPnlPct.toFixed(2)}%`,
      PF: mD.profitFactor.toFixed(2),
      'Max DD': `${mD.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: mD.sharpeRatio.toFixed(2),
      Expectancy: `$${mD.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Exit 10m)': {
      Trades: results.MundoE_Time10m.metrics.totalTrades,
      'Win Rate': `${results.MundoE_Time10m.metrics.winRatePct.toFixed(2)}%`,
      'Net PnL': `${results.MundoE_Time10m.metrics.netPnlPct.toFixed(2)}%`,
      PF: results.MundoE_Time10m.metrics.profitFactor.toFixed(2),
      'Max DD': `${results.MundoE_Time10m.metrics.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: results.MundoE_Time10m.metrics.sharpeRatio.toFixed(2),
      Expectancy: `$${results.MundoE_Time10m.metrics.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Exit 15m)': {
      Trades: results.MundoE_Time15m.metrics.totalTrades,
      'Win Rate': `${results.MundoE_Time15m.metrics.winRatePct.toFixed(2)}%`,
      'Net PnL': `${results.MundoE_Time15m.metrics.netPnlPct.toFixed(2)}%`,
      PF: results.MundoE_Time15m.metrics.profitFactor.toFixed(2),
      'Max DD': `${results.MundoE_Time15m.metrics.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: results.MundoE_Time15m.metrics.sharpeRatio.toFixed(2),
      Expectancy: `$${results.MundoE_Time15m.metrics.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Exit 20m)': {
      Trades: results.MundoE_Time20m.metrics.totalTrades,
      'Win Rate': `${results.MundoE_Time20m.metrics.winRatePct.toFixed(2)}%`,
      'Net PnL': `${results.MundoE_Time20m.metrics.netPnlPct.toFixed(2)}%`,
      PF: results.MundoE_Time20m.metrics.profitFactor.toFixed(2),
      'Max DD': `${results.MundoE_Time20m.metrics.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: results.MundoE_Time20m.metrics.sharpeRatio.toFixed(2),
      Expectancy: `$${results.MundoE_Time20m.metrics.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Exit 30m)': {
      Trades: results.MundoE_Time30m.metrics.totalTrades,
      'Win Rate': `${results.MundoE_Time30m.metrics.winRatePct.toFixed(2)}%`,
      'Net PnL': `${results.MundoE_Time30m.metrics.netPnlPct.toFixed(2)}%`,
      PF: results.MundoE_Time30m.metrics.profitFactor.toFixed(2),
      'Max DD': `${results.MundoE_Time30m.metrics.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: results.MundoE_Time30m.metrics.sharpeRatio.toFixed(2),
      Expectancy: `$${results.MundoE_Time30m.metrics.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Dynamic 33/33/34%)': {
      Trades: results.MundoE_Dynamic.metrics.totalTrades,
      'Win Rate': `${results.MundoE_Dynamic.metrics.winRatePct.toFixed(2)}%`,
      'Net PnL': `${results.MundoE_Dynamic.metrics.netPnlPct.toFixed(2)}%`,
      PF: results.MundoE_Dynamic.metrics.profitFactor.toFixed(2),
      'Max DD': `${results.MundoE_Dynamic.metrics.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: results.MundoE_Dynamic.metrics.sharpeRatio.toFixed(2),
      Expectancy: `$${results.MundoE_Dynamic.metrics.expectancyUsd.toFixed(2)}`
    },
    'Mundo E (Híbrido 20m)': {
      Trades: mE_Best.totalTrades,
      'Win Rate': `${mE_Best.winRatePct.toFixed(2)}%`,
      'Net PnL': `${mE_Best.netPnlPct.toFixed(2)}%`,
      PF: mE_Best.profitFactor.toFixed(2),
      'Max DD': `${mE_Best.maxDrawdownPct.toFixed(2)}%`,
      Sharpe: mE_Best.sharpeRatio.toFixed(2),
      Expectancy: `$${mE_Best.expectancyUsd.toFixed(2)}`
    }
  });

  originalLog(`\n========================================================================================`);
  originalLog(`🔬 2. CAUSAL STEP-BY-STEP DECOMPOSITION`);
  originalLog(`========================================================================================`);
  for (const [k, d] of Object.entries(causalDecomposition)) {
    originalLog(`\n➤ ${d.step}`);
    originalLog(`  • Δ Trades:         ${d.deltaTrades > 0 ? '+' : ''}${d.deltaTrades}`);
    originalLog(`  • Δ Win Rate:       ${d.deltaWinRatePct > 0 ? '+' : ''}${d.deltaWinRatePct.toFixed(2)}%`);
    originalLog(`  • Δ Net PnL:        ${d.deltaNetPnlPct > 0 ? '+' : ''}${d.deltaNetPnlPct.toFixed(2)}%`);
    originalLog(`  • Δ Profit Factor:  ${d.deltaProfitFactor > 0 ? '+' : ''}${d.deltaProfitFactor.toFixed(2)}`);
    originalLog(`  • Δ Max Drawdown:   ${d.deltaMaxDrawdownPct > 0 ? '+' : ''}${d.deltaMaxDrawdownPct.toFixed(2)}%`);
    originalLog(`  • Δ Expectancy:     ${d.deltaExpectancyUsd > 0 ? '+' : ''}$${d.deltaExpectancyUsd.toFixed(2)}/trade`);
    originalLog(`  • Δ Sharpe:         ${d.deltaSharpe > 0 ? '+' : ''}${d.deltaSharpe.toFixed(2)}`);
  }

  originalLog(`\n========================================================================================`);
  originalLog(`🎯 3. MFE CAPTURE RATIO MATRIX (By Holding Time Window)`);
  originalLog(`========================================================================================`);
  console.table({
    '5 Minutes': {
      'Avg Peak MFE': `${mfeMatrix['5m'].avgPeakMfeR.toFixed(2)}R`,
      'Realized PnL': `${mfeMatrix['5m'].avgRealizedPnlR.toFixed(2)}R`,
      'MFE Capture Ratio': `${mfeMatrix['5m'].mfeCaptureRatioPct.toFixed(1)}%`,
      '% Peak Hit <= T': `${mfeMatrix['5m'].peakReachedBeforeWindowPct.toFixed(1)}%`,
      'Reversal from >=1R': `${mfeMatrix['5m'].reversalRateFrom1RPct.toFixed(1)}%`
    },
    '10 Minutes': {
      'Avg Peak MFE': `${mfeMatrix['10m'].avgPeakMfeR.toFixed(2)}R`,
      'Realized PnL': `${mfeMatrix['10m'].avgRealizedPnlR.toFixed(2)}R`,
      'MFE Capture Ratio': `${mfeMatrix['10m'].mfeCaptureRatioPct.toFixed(1)}%`,
      '% Peak Hit <= T': `${mfeMatrix['10m'].peakReachedBeforeWindowPct.toFixed(1)}%`,
      'Reversal from >=1R': `${mfeMatrix['10m'].reversalRateFrom1RPct.toFixed(1)}%`
    },
    '15 Minutes': {
      'Avg Peak MFE': `${mfeMatrix['15m'].avgPeakMfeR.toFixed(2)}R`,
      'Realized PnL': `${mfeMatrix['15m'].avgRealizedPnlR.toFixed(2)}R`,
      'MFE Capture Ratio': `${mfeMatrix['15m'].mfeCaptureRatioPct.toFixed(1)}%`,
      '% Peak Hit <= T': `${mfeMatrix['15m'].peakReachedBeforeWindowPct.toFixed(1)}%`,
      'Reversal from >=1R': `${mfeMatrix['15m'].reversalRateFrom1RPct.toFixed(1)}%`
    },
    '20 Minutes': {
      'Avg Peak MFE': `${mfeMatrix['20m'].avgPeakMfeR.toFixed(2)}R`,
      'Realized PnL': `${mfeMatrix['20m'].avgRealizedPnlR.toFixed(2)}R`,
      'MFE Capture Ratio': `${mfeMatrix['20m'].mfeCaptureRatioPct.toFixed(1)}%`,
      '% Peak Hit <= T': `${mfeMatrix['20m'].peakReachedBeforeWindowPct.toFixed(1)}%`,
      'Reversal from >=1R': `${mfeMatrix['20m'].reversalRateFrom1RPct.toFixed(1)}%`
    },
    '30 Minutes': {
      'Avg Peak MFE': `${mfeMatrix['30m'].avgPeakMfeR.toFixed(2)}R`,
      'Realized PnL': `${mfeMatrix['30m'].avgRealizedPnlR.toFixed(2)}R`,
      'MFE Capture Ratio': `${mfeMatrix['30m'].mfeCaptureRatioPct.toFixed(1)}%`,
      '% Peak Hit <= T': `${mfeMatrix['30m'].peakReachedBeforeWindowPct.toFixed(1)}%`,
      'Reversal from >=1R': `${mfeMatrix['30m'].reversalRateFrom1RPct.toFixed(1)}%`
    }
  });

  // Save forensic output artifact
  const outputPayload = {
    timestamp: new Date().toISOString(),
    dataset: {
      symbol: SYMBOL,
      durationHours: DATASET_HOURS,
      warmupCandles: WARMUP_CANDLES,
      activeCandles: ACTIVE_CANDLE_COUNT
    },
    causalWorlds: Object.fromEntries(
      Object.entries(results).map(([k, v]) => [k, { metrics: v.metrics, tradeCount: v.trades.length }])
    ),
    causalDecomposition,
    mfeCaptureMatrix: mfeMatrix
  };

  const outputPath = path.join(edgeDir, 'forensic_replay_v2_results.json');
  await fs.writeFile(outputPath, JSON.stringify(outputPayload, null, 2));
  originalLog(`\n✅ Forensic Replay V2 complete! Full results written to: ${outputPath}`);
}

main().catch(err => {
  unmuteLogs();
  console.error('[FATAL] Forensic Replay V2 failed:', err);
  process.exit(1);
});

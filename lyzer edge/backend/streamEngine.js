/**
 * ARL v3.3 Stream Engine
 * Connects simulated candle generation or live kline streams to ARL evolution.
 */

import EventEmitter from 'events';
import { generateUUIDv7 } from "../src/causal-memory/EventFactory.js";
import { EvSignalEngine } from "../../packages/lyzer-shared/src/engine/evSignalRedesign.js";
import { computeTradeEV } from "../../packages/lyzer-shared/src/engine/evProfiler.js";
import { EVAlphaResearchEngineV3_3 } from "./EVAlphaResearchEngineV3_3.js";
import { LiveDataIngestor } from "./liveDataIngestor.js";
import { ExchangeExecution } from "./exchangeExecution.js";
import { safeMerge } from "./utils/safeJson.js";
import { RegimeEngine } from "./regimeEngine.js";

import { RealityGapMonitor } from "./realityGapMonitor.js";
import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";
import { DynamicWeightMatrix } from "../../packages/lyzer-shared/src/engine/weightMatrix.js";
import { ConstitutionalCourt, court } from "../../packages/lyzer-constitution/src/eca/court.js";
import { LiquidityReconstructionEngine } from "../../packages/lyzer-shared/src/providers/v1_smc_ict.js";
import { StructuralBoundaryEngine } from "../../packages/lyzer-shared/src/providers/v2_snd_snr.js";
import { MomentumRsiEngine } from "../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js";
import { InstitutionalMarketCausalityEngine } from "../../packages/lyzer-shared/src/providers/v4_imce.js";
import { WyckoffVolumeProfileEngine } from "../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js";
import { MarketProfileEngine } from "../../packages/lyzer-shared/src/providers/v6_market_profile.js";
import { TapeReadingEngine } from "../../packages/lyzer-shared/src/providers/v7_tape_reading.js";
import { LiquidityEngine } from "../../packages/lyzer-shared/src/smc/liquidityEngine.js";
import { StructureEngine } from "../../packages/lyzer-shared/src/smc/structureEngine.js";
import { SmcEngineFacade } from "../../packages/lyzer-shared/src/smc/smcFacade.js";
import { analyze_dealing_range } from "../../packages/lyzer-shared/src/providers/openmobius/location.js";

import { EvidenceFusionEngine } from '../src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js';
import { OpenMobiusPatternEngine } from '../src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusPatternEngine.js';
import { OpenMobiusShadowObserver } from './openMobiusShadow.js';

// CSRL Subsystem Imports
import { ScaleNormalizer } from "../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { CrossScaleTensorGraph } from "../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js";
import { InvariantExtractor } from "../../packages/lyzer-shared/src/csrl/InvariantExtractor.js";
import { DivergenceDetector } from "../../packages/lyzer-shared/src/csrl/DivergenceDetector.js";
import { DualRealityMonitor } from "./dualRealityMonitor.js";
import { SpectrogramUI } from "./spectrogramUI.js";
import { sendTelegramAlert, formatTradeAlert, formatSystemAlert } from "./telegram.js";
import { recordTickReceived, recordTickDuration, recordCsrlDuration, recordCclistEvaluation, recordEcaEvaluation, recordSystemError, recordSignalGenerated, recordKernelEvaluated, recordBreakEvenTrade } from "../src/observability/index.js";
import { MicrostructureDampener } from "../../packages/lyzer-shared/src/engine/MicrostructureDampener.js";
import { DynamicSizing } from "../src/engine/sizing.js";
import { authorizeOrder } from './riskGatewayClient.js';

// C1 fix: Observer Dynamics Lab (Era 7.1) imports
import { MediaObserver } from "../../packages/lyzer-shared/src/observers/MediaObserver.js";
import { AnalystObserver } from "../../packages/lyzer-shared/src/observers/AnalystObserver.js";
import { LatencyMatrix } from "../../packages/lyzer-shared/src/observers/LatencyMatrix.js";

// H5 fix: Causal Reflection pipeline
import { CausalReflectionFacade } from "../src/causal-reflection/index.js";
import { db } from "./db.js";
import { ShadowLogger } from "./shadowLogger.js";

import crypto from 'crypto';

const signalEngine = new EvSignalEngine();
const trgThreshold = parseFloat(process.env.TRG_THRESHOLD || '0.30');
const trgExponent = parseFloat(process.env.TRG_EXPONENT || '2');
const consensusLimit = parseFloat(process.env.RESIDUAL_CONSENSUS_LIMIT || '0.1');
const lhdsVetoLimit = parseFloat(process.env.LHDS_VETO_LIMIT || '0.95');
const ontologicalCollapseTrg = parseFloat(process.env.ONTOLOGICAL_COLLAPSE_TRG || '0.7');

const cclistConfig = {
  dvfFloor: parseFloat(process.env.CCLIST_DVF_FLOOR || '0.1'),
  stressAccumulation: parseFloat(process.env.CCLIST_STRESS_ACCUMULATION || '0.002'),
  lethalIllusionLimit: parseFloat(process.env.CCLIST_LETHAL_ILLUSION_LIMIT || '0.9'),
  stressRelease: parseFloat(process.env.CCLIST_STRESS_RELEASE || '0.1'),
};
const molSclThreshold = parseInt(process.env.MOL_SCL_THRESHOLD || '3', 10);
const defaultDisabledProviders = (process.env.DISABLED_PROVIDERS !== undefined ? process.env.DISABLED_PROVIDERS : (process.env.NODE_ENV === 'test' ? '' : 'v1,v3')).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const shadowTradingEnabled = process.env.SHADOW_TRADING_ENABLED === 'true';

court.configure(cclistConfig, { sclThreshold: molSclThreshold, stabilizationWindowMs: process.env.ARL_MODE === 'SIMULATION' ? 0 : (parseFloat(process.env.MOL_STABILIZATION_WINDOW_MS) || 45000) });

/**
 * Fail-Closed Distance Validator
 * Validates that a decimal distance/fraction is strictly within the valid range (0.001, 0.15).
 * e.g., 0.008 = 0.8%, 0.015 = 1.5%.
 * Rejects values >= 0.15 (like 1.5 or 99.0) or <= 0.001 with a fatal configuration error.
 * No silent conversions (e.g. 99.0 -> 0.99 is forbidden).
 */
export function validateDistanceFraction(value, paramName = 'distance') {
  if (value === null || value === undefined || value === '') {
    throw new Error(
      `[FAIL-CLOSED] Fatal configuration error: ${paramName} is required and cannot be null/undefined.`
    );
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || !isFinite(num) || num < 0.001 || num > 0.15) {
    throw new Error(
      `[FAIL-CLOSED] Fatal configuration error: ${paramName} (${value}) is outside allowable decimal range (0.001, 0.15). Values must be decimal fractions (e.g. 0.008 for 0.8%, 0.015 for 1.5%). Raw percentages like 1.5 or 99.0 are strictly rejected.`
    );
  }
  return num;
}

/**
 * Fail-Closed Price Invariant Validator
 * Validates price structure invariants:
 * LONG:  StopLoss < EntryPrice < TakeProfit (if TP is set)
 * SHORT: TakeProfit < EntryPrice < StopLoss and TakeProfit > 0 (if TP is set)
 */
export function validatePriceInvariants(direction, entryPrice, stopLoss, takeProfit = null) {
  if (typeof entryPrice !== 'number' || isNaN(entryPrice) || !isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error(`[FAIL-CLOSED] Invalid entryPrice: ${entryPrice}. Must be positive finite number.`);
  }
  if (typeof stopLoss !== 'number' || isNaN(stopLoss) || !isFinite(stopLoss) || stopLoss <= 0) {
    throw new Error(`[FAIL-CLOSED] Invalid stopLoss: ${stopLoss}. Must be positive finite number.`);
  }

  const isLong = direction === 'LONG' || direction === 'BUY';
  const isShort = direction === 'SHORT' || direction === 'SELL';

  if (!isLong && !isShort) {
    throw new Error(`[FAIL-CLOSED] Invalid trade direction for price invariant validation: "${direction}"`);
  }

  if (isLong) {
    if (stopLoss >= entryPrice) {
      throw new Error(
        `[FAIL-CLOSED] Price invariant violated for LONG: StopLoss (${stopLoss}) must be strictly less than EntryPrice (${entryPrice}).`
      );
    }
    if (takeProfit !== null && takeProfit !== undefined) {
      if (typeof takeProfit !== 'number' || isNaN(takeProfit) || !isFinite(takeProfit) || takeProfit <= entryPrice) {
        throw new Error(
          `[FAIL-CLOSED] Price invariant violated for LONG: TakeProfit (${takeProfit}) must be strictly greater than EntryPrice (${entryPrice}). Invariant: SL (${stopLoss}) < Entry (${entryPrice}) < TP (${takeProfit}).`
        );
      }
    }
  } else if (isShort) {
    if (stopLoss <= entryPrice) {
      throw new Error(
        `[FAIL-CLOSED] Price invariant violated for SHORT: StopLoss (${stopLoss}) must be strictly greater than EntryPrice (${entryPrice}).`
      );
    }
    if (takeProfit !== null && takeProfit !== undefined) {
      if (typeof takeProfit !== 'number' || isNaN(takeProfit) || !isFinite(takeProfit) || takeProfit <= 0 || takeProfit >= entryPrice) {
        throw new Error(
          `[FAIL-CLOSED] Price invariant violated for SHORT: TakeProfit (${takeProfit}) must be strictly positive and less than EntryPrice (${entryPrice}). Invariant: TP (${takeProfit}) < Entry (${entryPrice}) < SL (${stopLoss}) and TP > 0.`
        );
      }
    }
  }
}

/**
 * Exit Policy Resolver & Validator
 */
export function getExitPolicyConfig(override = {}) {
  const envPolicy = process.env.EXIT_POLICY;
  const rawPolicy = (override.exitPolicy || envPolicy || (process.env.ENABLE_TIME_EXIT_ALPHA === 'true' ? 'TIME' : 'TIME')).toUpperCase();
  const validPolicies = ['TIME', 'DYNAMIC_TP', 'HYBRID_SCALE_OUT'];
  if (!validPolicies.includes(rawPolicy)) {
    throw new Error(
      `[FAIL-CLOSED] Fatal configuration error: Invalid EXIT_POLICY "${override.exitPolicy || envPolicy}". Must be one of: TIME, DYNAMIC_TP, HYBRID_SCALE_OUT.`
    );
  }

  const envMinutes = process.env.TIME_EXIT_MINUTES;
  const rawMinutes = override.timeExitMinutes !== undefined 
    ? override.timeExitMinutes 
    : (envMinutes !== undefined ? parseFloat(envMinutes) : 15);
  
  if (typeof rawMinutes !== 'number' || isNaN(rawMinutes) || !isFinite(rawMinutes) || rawMinutes <= 0) {
    throw new Error(
      `[FAIL-CLOSED] Fatal configuration error: Invalid TIME_EXIT_MINUTES "${override.timeExitMinutes !== undefined ? override.timeExitMinutes : envMinutes}". Must be a positive finite number.`
    );
  }

  if (process.env.SCALP_TP_PCT) {
    validateDistanceFraction(process.env.SCALP_TP_PCT, 'SCALP_TP_PCT');
  }
  if (process.env.SCALP_SL_PCT) {
    validateDistanceFraction(process.env.SCALP_SL_PCT, 'SCALP_SL_PCT');
  }

  return {
    policy: rawPolicy,
    timeExitMinutes: rawMinutes
  };
}

export class StreamEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.mode = config.mode || process.env.ARL_MODE || process.env.MODE || 'SIMULATION'; // SIMULATION | LIVE | TESTNET
    this.symbol = config.symbol || 'BTCUSDT';
    this.interval = config.interval || '1m';
    this.disabledProviders = new Set((config.disabledProviders || defaultDisabledProviders).map(p => p.toLowerCase()));

    const exitPolicyConfig = getExitPolicyConfig(config);
    this.exitPolicy = config.exitPolicy || exitPolicyConfig.policy;
    this.timeExitMinutes = config.timeExitMinutes !== undefined ? config.timeExitMinutes : exitPolicyConfig.timeExitMinutes;

    this.signalEngine = signalEngine;
    this.truthKernel = new TruthKernel({ trgThreshold, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg });
    this.weightMatrix = new DynamicWeightMatrix();
    
    // Global Constitutional Court is configured once in server.js
    // StreamEngine only references it.
    this.court = config.court || court;
    if (config.stabilizationWindowMs !== undefined && this.court && this.court.mol) {
      this.court.mol.stabilizationWindowMs = config.stabilizationWindowMs;
    }

    this.ecoEngine = new EVAlphaResearchEngineV3_3();
    this.extinctionEngine = this.ecoEngine.extinctionEngine;

    this.ingestor = null;
    this.execution = null;
    this.candles = [];
    this.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };
    this.setupMtfAliases();
    this.v1 = this.disabledProviders.has('v1') ? null : new LiquidityReconstructionEngine(config.providerConfigs?.v1);
    this.v2 = this.disabledProviders.has('v2') ? null : new StructuralBoundaryEngine(config.providerConfigs?.v2);
    this.v3 = this.disabledProviders.has('v3') ? null : new MomentumRsiEngine(config.providerConfigs?.v3);
    this.v4 = this.disabledProviders.has('v4') ? null : new InstitutionalMarketCausalityEngine(config.providerConfigs?.v4);
    this.v5 = this.disabledProviders.has('v5') ? null : new WyckoffVolumeProfileEngine(config.providerConfigs?.v5);
    this.v6 = this.disabledProviders.has('v6') ? null : new MarketProfileEngine(config.providerConfigs?.v6);
    this.v7 = this.disabledProviders.has('v7') ? null : new TapeReadingEngine(config.providerConfigs?.v7);
    this.smcLiquidity = new LiquidityEngine();
    this.smcStructure = new StructureEngine();
    this.smcFacade = new SmcEngineFacade();
    this.evidenceFusion = new EvidenceFusionEngine();
    this.openMobius = new OpenMobiusPatternEngine();
    this.v8Shadow = new OpenMobiusShadowObserver(this.symbol, this.interval);
    
    // CSRL Instance Initialization
    this.scaleNormalizer = new ScaleNormalizer();
    this.cstg = new CrossScaleTensorGraph();
    this.invariantExtractor = new InvariantExtractor();
    this.divergenceDetector = new DivergenceDetector();
    this.dualMonitor = new DualRealityMonitor();
    this.ui = new SpectrogramUI();
    this.dynamicSizing = new DynamicSizing();
    
    // C1 fix: Initialize Observers
    this.mediaObserver = new MediaObserver();
    this.analystObserver = new AnalystObserver();
    this.latencyMatrix = new LatencyMatrix();
    
    if (shadowTradingEnabled) {
      this.realityGapMonitor = new RealityGapMonitor(this.symbol);
    }

    this.isRunning = false;
    this.tradeHistory = [];
    this.activePosition = null;
    this.dampener = new MicrostructureDampener({ minHoldingCandles: 5, cooldownCandles: 5, atrBarrierMultiplier: 1.2, minRiskReward: 0.8 });
    this.regimeEngine = new RegimeEngine();

    this.connectionState = 'CONNECTED';
    this.liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
    this.maxDailyCapital = parseFloat(process.env.MAX_DAILY_CAPITAL || '0');
    this.dailyCapitalUsed = 0;

    this.globalEVMemory = {
      signalBuckets: {},
      regimeBuckets: {},
      governanceStats: { allowed: 0, rejected: 0, capacityConstrained: 0, cancelledLimit: 0 }
    };
  }

  async start() {
    this.isRunning = true;
    console.log(`[STREAM] Initializing StreamEngine in ${this.mode} mode for ${this.symbol}...`);
    await this.startLiveMode();
  }

  async startLiveMode() {
    this.ingestor = new LiveDataIngestor(this.symbol);

    // H5 fix: Initialize Reflection Facade and schedule Dream Cycle (every 12 hours)
    if (!this.reflectionFacade) {
      this.reflectionFacade = new CausalReflectionFacade(db);
      
      const scheduleDreamCycle = () => {
        this.reflectionTimeout = setTimeout(async () => {
          try {
            console.log(`[REFLECTION] Starting scheduled Causal Dream Cycle for ${this.symbol}...`);
            await this.reflectionFacade.runDreamCycle();
            console.log(`[REFLECTION] Scheduled Dream Cycle completed.`);
          } catch (err) {
            console.error(`[REFLECTION] Dream Cycle failed:`, err);
          } finally {
            scheduleDreamCycle(); // Schedule next tick only after completion
          }
        }, 12 * 60 * 60 * 1000); // 12 hours
      };
      
      scheduleDreamCycle();
    }

    console.log(`[STREAM] Fetching MTF closed candles for warmup for ${this.symbol}...`);
    this.mtfCandles = {};
    const tfLimits = {
      '1m': 500,
      '5m': 200,
      '15m': 100,
      '1h': 60,
      '4h': 50,
      '1d': 30
    };
    
    // Fallback standard warmup with optimized limits
    for (const [tf, lim] of Object.entries(tfLimits)) {
      const ing = new LiveDataIngestor(this.symbol, tf);
      this.mtfCandles[tf] = await ing.warmupCandles(lim);
      await new Promise(r => setTimeout(r, 100)); // Pace requests to avoid buffer congestion
    }
    this.setupMtfAliases();
    this.candles = this.mtfCandles['1m'];

    console.log(`[STREAM] Performing Deep Warmup (Cold Start Cure) for ${this.symbol}...`);
    try {
      // 1. Fetch exactly 3000 candles from Binance dynamically (approx 10 days of 5m)
      const deepIngestor = new LiveDataIngestor(this.symbol, '5m');
      const allCandles = await deepIngestor.deepWarmupCandles(3000);
      const warmupCandles = allCandles;
      console.log(`[STREAM] Loaded ${warmupCandles.length} historical candles. Warming up TruthKernel...`);
      for (const c of warmupCandles) {
        if (!c.closed) continue;
        const ohlcv = [c.openTime, c.open, c.high, c.low, c.close, c.volume];
        this.processCandle(ohlcv, c.openTime, c.openTime, c.openTime, true);
      }
      console.log(`[STREAM] Deep Warmup Complete. LHDS should now be stabilized.`);
    } catch (err) {
      console.warn(`[STREAM] Deep Warmup failed via network. Error: ${err.message}`);
    }

    // 2. Setup execution layer
    this.initializeExecution();

    // 2.5 Setup live tick emitter for real-time frontend UI updates & instant SL/TP guard
    this.ingestor.onTick = (candle) => {
      // Instant Tick-Level SL/TP Guard Check
      this.checkTickPositionExit(candle);
      this.emit('arl', { type: 'tick', symbol: this.symbol, market: candle, mode: this.mode });
    };

    // 3. Register WebSocket callbacks
    this.ingestor.onBookTicker = (book) => {
      this.currentBook = book;
    };

    this.ingestor.startWebSocket(
      async (candle) => {
        if (this.connectionState === 'FAILED' || this.connectionState === 'DEGRADED') {
          return;
        }
        
        this.updateMtfCandles(candle);
        
        const processStartTime = performance.now();
        try {
          await this.processCandle(candle, this.tickCounter);
          recordTickDuration(this.symbol, 'SUCCESS', (performance.now() - processStartTime) / 1000);
        } catch (e) {
          recordSystemError('StreamEngine', 'PROCESS_CANDLE_ERROR');
          recordTickDuration(this.symbol, 'FAIL', (performance.now() - processStartTime) / 1000);
          console.error('[STREAM] Error in processCandle:', e);
        }
      },
      (state) => {
        this.handleStateChange(state);
      }
    );

    console.log(`[STREAM] Live data ingestion active.`);
  }

  updateMtfCandles(candle) {
    this.tickCounter = (this.tickCounter || 0) + 1;
    candle.trace_id = generateUUIDv7();
    recordTickReceived(this.symbol, 'websocket');
    this.mtfCandles['1m'].push(candle);
    this.candles = this.mtfCandles['1m']; // Keep legacy alias in sync
    if (this.mtfCandles['1m'].length > 1500) {
      this.mtfCandles['1m'].shift();
    }

    const tfs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    for (const [tf, periodMs] of Object.entries(tfs)) {
      const list = this.mtfCandles[tf] || [];
      const bucketStart = candle.openTime - (candle.openTime % periodMs);

      if (list.length === 0) {
        list.push({
          openTime: bucketStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          closed: true
        });
        continue;
      }

      const lastCandle = list[list.length - 1];

      if (lastCandle.openTime === bucketStart) {
        // Update existing candle values
        lastCandle.high = Math.max(lastCandle.high, candle.high);
        lastCandle.low = Math.min(lastCandle.low, candle.low);
        lastCandle.close = candle.close;
        lastCandle.volume += candle.volume;
      } else if (bucketStart > lastCandle.openTime) {
        // Create a new closed candle
        list.push({
          openTime: bucketStart,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          closed: true
        });
        if (list.length > 500) {
          list.shift();
        }
      }
    }
  }

  setupMtfAliases() {
    Object.defineProperty(this.mtfCandles, 'fast', {
      get: () => this.mtfCandles['1m'] || [],
      configurable: true
    });
    Object.defineProperty(this.mtfCandles, 'intermediate', {
      get: () => this.mtfCandles['15m'] || [],
      configurable: true
    });
    Object.defineProperty(this.mtfCandles, 'slow', {
      get: () => this.mtfCandles['1h'] || [],
      configurable: true
    });
  }

  warmupSyntheticCandles(count = 110) {
    const basePrice = 50000;
    const now = Date.now();
    for (let i = count - 1; i >= 0; i--) {
      const openTime = now - i * 60000;
      const candle = {
        openTime,
        open: basePrice,
        high: basePrice + 10,
        low: basePrice - 10,
        close: basePrice + (Math.sin(i / 5) * 5),
        volume: 100,
        closed: true,
        timestamp: openTime
      };
      this.updateMtfCandles(candle);
    }
  }

  initializeExecution() {
    if (this.mode === 'TESTNET' || this.mode === 'LIVE') {
      const isTestnet = this.mode === 'TESTNET';
      
      if (this.mode === 'LIVE') {
        if (!this.liveTradingEnabled) {
          console.error('[RISK BLOCK] LIVE mode execution blocked: LIVE_TRADING_ENABLED is false/undefined.');
          this.execution = null;
          return;
        }
        if (this.maxDailyCapital <= 0) {
          console.error('[RISK BLOCK] LIVE mode execution blocked: MAX_DAILY_CAPITAL must be greater than 0.');
          this.execution = null;
          return;
        }
        if (shadowTradingEnabled || process.env.SHADOW_TRADING_ENABLED === 'true') {
          console.log('[SHADOW MODE] RealityGapMonitor active. Live exchange execution is blocked safely by shadow trading layer.');
          this.execution = null;
          return;
        }
      }

      this.execution = new ExchangeExecution(
        process.env.BINANCE_API_KEY,
        process.env.BINANCE_API_SECRET,
        isTestnet
      );
      console.log(`[STREAM] Execution layer initialized for ${this.mode}`);
    } else {
      this.execution = null;
    }
  }

  handleStateChange(state) {
    this.connectionState = state;
    console.log(`[STREAM] Connection state change received: ${state}`);
    sendTelegramAlert(formatSystemAlert(`Conexão ${this.symbol}`, `Status da conexão alterado para: <b>${state}</b>`))
      .catch(e => console.error('[TELEGRAM] Error sending system alert:', e.message));

    this.initializeExecution();
    if (state === 'CONNECTED') {
      console.log(`[STREAM] Live real data streaming active for ${this.symbol}`);
    } else {
      console.warn(`[STREAM] Connection degraded (${state}) for ${this.symbol}. Execution paused.`);
    }
  }

  checkTickPositionExit(candle) {
    if (!this.activePosition) return null;

    // TRACK MFE and MAE
    const pos = this.activePosition;
    if (pos.direction === 'LONG') {
        const mfe = (candle.high - pos.entryPrice) / pos.entryPrice;
        const mae = (candle.low - pos.entryPrice) / pos.entryPrice;
        pos.mfe = Math.max(pos.mfe || 0, mfe);
        pos.mae = Math.min(pos.mae || 0, mae);
    } else {
        const mfe = (pos.entryPrice - candle.low) / pos.entryPrice;
        const mae = (pos.entryPrice - candle.high) / pos.entryPrice;
        pos.mfe = Math.max(pos.mfe || 0, mfe);
        pos.mae = Math.min(pos.mae || 0, mae);
    }

    // Evaluate action from Regime Engine
    let action = this.regimeEngine.evaluate(pos, candle, this.mtfCandles);

    let closed = false;
    let exitPrice = 0;
    let exitReason = '';

    const price = candle.close;
    const high = candle.high || price;
    const low = candle.low || price;

    if (action.type === 'HOLD') {
      if (action.newStopLoss) {
        pos.stopLoss = action.newStopLoss;
      }
      
      // Basic Stop Loss check
      if (pos.direction === 'LONG' && low <= pos.stopLoss) {
          action = { type: 'EXIT_STOP' };
      } else if (pos.direction === 'SHORT' && high >= pos.stopLoss) {
          action = { type: 'EXIT_STOP' };
      } else if (pos.takeProfit && pos.direction === 'LONG' && high >= pos.takeProfit) {
          action = { type: 'EXIT_TAKE' };
      } else if (pos.takeProfit && pos.direction === 'SHORT' && low <= pos.takeProfit) {
          action = { type: 'EXIT_TAKE' };
      }
    }

    if (action.type === 'EXIT_STOP') {
      closed = true;
      exitPrice = pos.stopLoss || price;
      exitReason = 'STOP_LOSS';
    } else if (action.type === 'EXIT_TAKE') {
      closed = true;
      exitPrice = pos.takeProfit || price;
      exitReason = 'TAKE_PROFIT';
    } else if (action.type === 'EXIT_EXHAUSTION') {
      closed = true;
      exitPrice = price;
      exitReason = 'EXHAUSTION';
    }

    if (closed) {
      let rawPnl = pos.direction === 'LONG'
        ? (exitPrice - pos.entryPrice) / pos.entryPrice
        : (pos.entryPrice - exitPrice) / pos.entryPrice;

      // [Alpha de Liquidez] - Fee Structure Simulation
      // Entry was always LIMIT (Maker rebate = +0.01%)
      rawPnl += 0.0001; 
      
      if (exitReason === 'TAKE_PROFIT') {
        // TP exit is LIMIT (Maker rebate = +0.01%)
        rawPnl += 0.0001;
      } else {
        // SL or Break-Even exit is MARKET (Taker fee = -0.05%)
        rawPnl -= 0.0005;
      }

      const resolvedTrade = {
        id: pos.id,
        timestamp: pos.timestamp,
        symbol: this.symbol,
        direction: pos.direction,
        entryPrice: pos.entryPrice,
        exitPrice: exitPrice,
        pnl: rawPnl,
        mfe: pos.mfe || 0,
        mae: pos.mae || 0,
        initialStopLoss: pos.initialStopLoss || pos.stopLoss,
        status: 'closed',
        signal: pos.signal,
        regime: pos.regime,
        governanceDecision: pos.governanceDecision,
        wasRejected: false,
        reasonCodes: [exitReason],
        slippage: 0.0001,
        spread: 0.0001,
        distortionFactor: 1.0,
        timingOffset: 0,
        stopLoss: pos.stopLoss,
        takeProfit: pos.takeProfit
      };

      const ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
      const tradeWithEv = safeMerge({}, resolvedTrade, { ev });
      this.tradeHistory.push(tradeWithEv);
      if (this.tradeHistory.length > 500) this.tradeHistory.shift();

      this.ui.logEvent(`⚡ [TICK GUARD] Position CLOSED via ${exitReason} for ${this.symbol}. Exit: ${exitPrice}, PnL: ${(rawPnl * 100).toFixed(2)}%`);

      if (this.mode !== 'SIMULATION') {
        sendTelegramAlert(formatTradeAlert(this.symbol, resolvedTrade))
          .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));
      }

      if (shadowTradingEnabled && this.realityGapMonitor) {
        this.realityGapMonitor.logHypotheticalTrade(resolvedTrade);
      }

      if (this.execution) {
        const closeSide = pos.direction === 'LONG' ? 'SELL' : 'BUY';
        const closeQty = pos.quantity || 0.001;
        const exitType = exitReason === 'TAKE_PROFIT' ? 'LIMIT' : 'MARKET';
        const rules = this.getSymbolRules(exitPrice);

        // Governance Gate for Exits: Request signed permission token from Court
        const exitCourtState = {
          symbol: this.symbol,
          direction: closeSide,
          isExit: true,
          positionId: pos.id,
          pnl: rawPnl,
          trg: 1.0,
          currentDrawdown: this.dailyPnl ? Math.abs(Math.min(0, this.dailyPnl)) / (this.maxDailyCapital || 1000) : 0,
          currentSlippage: 0
        };
        const exitToken = this.court.requestPermission('EXIT_TRADE', exitCourtState, {
          eef: true,
          epistemic_authority: 'ALLOW',
          reason: exitReason
        });

        if (exitToken && exitToken.granted) {
          this.execution.placeOrder(this.symbol, closeSide, exitType, closeQty, exitPrice, rules, exitToken)
            .catch(e => console.error('[STREAM] Close order failed:', e.message));
        } else {
          console.warn(`[GOVERNANCE VETO] Court denied exit execution token for ${this.symbol}: ${exitToken?.reason}`);
        }
      }

      const outcome = exitReason === 'TAKE_PROFIT' || rawPnl > 0 ? 'PROFIT_TARGET' : (exitReason === 'STOP_LOSS' ? 'STOP_LOSS' : 'SCRATCH');
      this.dampener.recordTradeExit(this.symbol, this.tickCounter, outcome, exitReason);
      this.releaseDailyCapital(this.activePosition);
      
      // CSRL: Online Reinforcement Learning Feedback Loop (Regime-Isolated)
      if (this.evidenceFusion && pos.vectorMap) {
         const isWin = rawPnl > 0;
         const accuracyScore = isWin ? 1.0 : 0.0;
         const tradeRegime = pos.entryRegime || 'BALANCED';
         
         for (const v of pos.vectorMap) {
            if (v.sig && v.sig.signal && v.sig.signal !== 'flat' && v.sig.signal !== 'FLAT') {
                const isSigLong = String(v.sig.signal).toUpperCase().includes('LONG') || String(v.sig.signal).toUpperCase().includes('BUY');
                const isTradeLong = pos.direction === 'LONG';
                
                let weightKey = '';
                if (v.engine === 'v1') weightKey = 'LIQUIDITY_ENGINE';
                if (v.engine === 'v2') weightKey = 'LYZER_NATIVE';
                if (v.engine === 'v3') weightKey = 'VOLATILITY_ENGINE';
                if (v.engine === 'v4') weightKey = 'MACRO_REGIME';
                if (v.engine === 'v5') weightKey = 'WYCKOFF_VOLUME_ENGINE';
                if (v.engine === 'v6') weightKey = 'MARKET_PROFILE_ENGINE';
                if (v.engine === 'v7') weightKey = 'TAPE_READING_ENGINE';
                
                if (weightKey) {
                   if ((isSigLong && isTradeLong) || (!isSigLong && !isTradeLong)) {
                       this.evidenceFusion.updateSourcePerformance(weightKey, accuracyScore, tradeRegime);
                   } else {
                       this.evidenceFusion.updateSourcePerformance(weightKey, isWin ? 0.0 : 1.0, tradeRegime);
                   }
                }
            }
         }
      }

      this.activePosition = null;
      this.emit('state_changed');
      this.emit('arl', { type: 'arl', symbol: this.symbol, trade: tradeWithEv, mode: this.mode });
      return tradeWithEv;
    }

    return null;
  }

  calculateOpportunityScore(newCandle) {
    const historicalCandles = this.candles;
    const i = historicalCandles.length - 1;
    
    // ATR 14
    let atr14 = 0;
    let count = 0;
    for (let j = i - 13; j <= i; j++) {
        if (j >= 0 && historicalCandles[j]) {
            atr14 += (historicalCandles[j].high - historicalCandles[j].low);
            count++;
        }
    }
    const atr14_pct = count > 0 ? (atr14 / count) / newCandle.close : 0;

    // Vol Z
    const vol_arr = [];
    for (let j = i - 59; j <= i; j++) {
        if (j >= 0 && historicalCandles[j]) vol_arr.push(historicalCandles[j].volume);
    }
    const vol_mean = vol_arr.reduce((a, b) => a + b, 0) / (vol_arr.length || 1);
    const vol_std = vol_arr.length > 0 ? Math.sqrt(vol_arr.reduce((a, b) => a + Math.pow(b - vol_mean, 2), 0) / vol_arr.length) || 1 : 1;
    const volume_zscore = (newCandle.volume - vol_mean) / vol_std;

    // VWAP 24h
    let sumPv = 0, sumV = 0;
    for (let j = i - 1439; j <= i; j++) {
        if (j >= 0 && historicalCandles[j]) {
            const c = historicalCandles[j];
            sumPv += ((c.high + c.low + c.close) / 3) * c.volume;
            sumV += c.volume;
        }
    }
    const vwap = sumV > 0 ? sumPv / sumV : newCandle.close;
    const distance_vwap = (newCandle.close - vwap) / vwap;

    let oppScore = 0;
    if (atr14_pct >= 0.00055) oppScore++;
    if (volume_zscore >= 0.315) oppScore++;
    if (Math.abs(distance_vwap) >= 0.00963) oppScore++;

    return oppScore;
  }

  async processCandle(candle, index) {
    const processStartTime = performance.now();

    // C1 fix: Feed Era 7.1 Observers
    const syntheticSignal = candle.close > candle.open ? 1 : (candle.close < candle.open ? -1 : 0);
    this.mediaObserver.ingestNews({
      headline: `Market tick ${candle.close}`,
      sentiment: syntheticSignal, // Simple synthetic sentiment based on candle direction
      timestamp: candle.closeTime || Date.now()
    });
    this.analystObserver.registerAnalystOpinion({
      analystId: 'synthetic_analyst_1',
      targetPrice: syntheticSignal > 0 ? candle.close * 1.05 : (syntheticSignal < 0 ? candle.close * 0.95 : candle.close),
      recommendation: syntheticSignal === 1 ? 'BUY' : (syntheticSignal === -1 ? 'SELL' : 'HOLD'),
      timestamp: candle.closeTime || Date.now()
    });
    const mediaSentiment = this.mediaObserver.getCurrentSentiment();
    const analystConsensus = this.analystObserver.getConsensus();
    const analystSignal = analystConsensus.buyRatio > 0.5 ? 1 : (analystConsensus.sellRatio > 0.5 ? -1 : 0);
    
    const observerDivergence = this.latencyMatrix.evaluateDivergence({
      MARKET: syntheticSignal,
      MEDIA: mediaSentiment.netSentiment || syntheticSignal,
      ANALYSTS: analystSignal || syntheticSignal,
      AUTHORITY: syntheticSignal
    });

    // 1. Reconstruct reality via heterogeneous engines (SMC vs SNR vs MOMENTUM_RSI vs IMCE V4)
    //    Disabled providers skip reconstruction entirely — downstream is null-safe.
    const defaultNarrative = { signal: 'flat', confidence: 0, narrative: null, source: null, causalAnswers: null, explanationText: null, tradeDna: null };
    
    const fastTf = process.env.FAST_TF || '1m';
    const intermediateTf = process.env.INTERMEDIATE_TF || '15m';
    const slowTf = process.env.SLOW_TF || '1h';

    const mappedCandles = {
      fast: this.mtfCandles[fastTf] || this.mtfCandles['1m'],
      intermediate: this.mtfCandles[intermediateTf] || this.mtfCandles['15m'],
      slow: this.mtfCandles[slowTf] || this.mtfCandles['1h'],
      ...this.mtfCandles
    };

    const v1Narrative = this.disabledProviders.has('v1') ? defaultNarrative : this.v1.reconstruct(mappedCandles);
    const v2Narrative = this.disabledProviders.has('v2') ? defaultNarrative : this.v2.reconstruct(mappedCandles);
    const v3Narrative = this.disabledProviders.has('v3') ? defaultNarrative : this.v3.reconstruct(mappedCandles);
    const v4Narrative = this.disabledProviders.has('v4') ? defaultNarrative : this.v4.reconstruct(this.mtfCandles);
    const v5Narrative = this.disabledProviders.has('v5') ? defaultNarrative : this.v5.reconstruct(mappedCandles);
    const v6Narrative = this.disabledProviders.has('v6') ? defaultNarrative : this.v6.reconstruct(mappedCandles);
    const v7Narrative = this.disabledProviders.has('v7') ? defaultNarrative : this.v7.reconstruct(mappedCandles);

    // 1b. Full SMC Liquidity + Structure evaluation via SmcEngineFacade
    const smcResult = this.smcFacade.evaluate(this.mtfCandles);
    const smcStructureResult = smcResult.structure;
    const smcLiquidityResult = smcResult.liquidity;

    // Calculate ATR for Topographical Veto
    let topographicalAtr = 0;
    const topCandleList = (this.candles && this.candles.length >= 5) ? this.candles : (this.mtfCandles['1m'] || []);
    if (topCandleList.length >= 5) {
      const recent = topCandleList.slice(-14);
      let sumRange = 0;
      for (let i = 0; i < recent.length; i++) sumRange += (recent[i].high - recent[i].low);
      topographicalAtr = sumRange / recent.length;
    }

    // Calculate short vs long ATR ratio for dynamic volatility adaptation
    let atrRatio = 1.0;
    if (topCandleList.length >= 30) {
      const shortList = topCandleList.slice(-10);
      const longList = topCandleList.slice(-30);
      let sSum = 0, lSum = 0;
      for (let i = 0; i < shortList.length; i++) sSum += (shortList[i].high - shortList[i].low);
      for (let i = 0; i < longList.length; i++) lSum += (longList[i].high - longList[i].low);
      const shortAtr = sSum / shortList.length;
      const longAtr = lSum / longList.length;
      atrRatio = longAtr > 0 ? (shortAtr / longAtr) : 1.0;
    }

    // [Lyzer Guardian] SnR Topographical Proximity Check / Golden Zone Continuous Filter
    let distanceFromGoldenZone = Infinity;
    const currentPrice = candle.close;
    
    // Normalize SNR distance relative to ATR for the topographical risk penalty
    if (smcLiquidityResult && smcLiquidityResult.activeZones && smcLiquidityResult.activeZones.length > 0) {
        let minRawDist = Infinity;
        for (const zone of smcLiquidityResult.activeZones) {
            let d = 0;
            if (currentPrice < zone.lower_bound) {
                d = (zone.lower_bound - currentPrice) / currentPrice;
            } else if (currentPrice > zone.upper_bound) {
                d = (currentPrice - zone.upper_bound) / currentPrice;
            }
            if (d < minRawDist) minRawDist = d;
        }
        
        // Normalize the raw distance by the ATR percentage (e.g. 0 means inside the zone, 1.0 means 1 ATR away, etc.)
        const atrPct = topographicalAtr ? (topographicalAtr / currentPrice) : 0.0015;
        distanceFromGoldenZone = minRawDist / atrPct;
    }
    
    // Extract static S/R levels from V2 engine for legacy compatibility
    const v2Candles = this.mtfCandles[intermediateTf] || this.mtfCandles['1m'] || [];
    let srLevels = [];
    if (v2Candles.length >= 10) {
      let localMax = -Infinity, localMin = Infinity;
      for (let i = v2Candles.length - 10; i < v2Candles.length - 1; i++) {
        if (v2Candles[i].high > localMax) localMax = v2Candles[i].high;
        if (v2Candles[i].low < localMin) localMin = v2Candles[i].low;
      }
      srLevels = [
        { type: 'RESISTANCE', price: localMax },
        { type: 'SUPPORT', price: localMin }
      ];
    }

    // 1c. Dealing Range Segmentation (P_loc = (Price - Low) / (High - Low) * 100%)
    const dealingLookback = parseInt(process.env.DEALING_RANGE_LOOKBACK || '100', 10);
    const dealingCandleList = (this.candles && this.candles.length > 0)
      ? this.candles.slice(-Math.min(this.candles.length, dealingLookback))
      : (this.mtfCandles['1m'] || []);
    const dealingRange = analyze_dealing_range(dealingCandleList);

    let pLoc = 50.0;
    let dealingZone = 'EQUILIBRIUM';
    if (dealingRange && dealingRange.high > dealingRange.low) {
      pLoc = ((currentPrice - dealingRange.low) / (dealingRange.high - dealingRange.low)) * 100.0;
      dealingZone = pLoc < 50.0 ? 'DISCOUNT' : 'PREMIUM';
    } else if (dealingRange) {
      pLoc = 50.0;
      dealingZone = 'EQUILIBRIUM';
    }

    // Volume SMA20, Price SMA20 & Exhaustion Feature Extraction
    let sumVol20 = 0;
    let sumClose20 = 0;
    const volHistory = (this.candles && this.candles.length >= 2)
      ? this.candles.slice(-21, -1)
      : (this.candles || []);
    if (volHistory.length > 0) {
      for (let i = 0; i < volHistory.length; i++) {
        sumVol20 += (volHistory[i].volume || 0);
        sumClose20 += (volHistory[i].close || 0);
      }
    }
    // To match Exp 3 exactly, SMA20 includes the current candle
    const periodCount = volHistory.length > 0 ? volHistory.length + 1 : 1;
    const sma20Vol = (sumVol20 + (candle.volume || 0)) / periodCount;
    const sma20Close = (sumClose20 + (candle.close || 0)) / periodCount;
    const sma20DistancePct = sma20Close > 0 ? Math.abs(currentPrice - sma20Close) / sma20Close : 0;

    const candleRange = candle.high - candle.low;
    let isCandleExhaustion = false;
    if (v7Narrative && typeof v7Narrative.narrative === 'string' && v7Narrative.narrative.includes('Exhaustion')) {
      isCandleExhaustion = true;
    }

    // 2. CSRL Phase: Compute Structural Coherence Across Scales
    const csrlStart = performance.now();
    const alignedTensors = this.scaleNormalizer.alignScales(this.mtfCandles);
    const topology = this.cstg.buildTopology(alignedTensors);
    const invariants = this.invariantExtractor.extract(topology);
    let sds = 0.0;
    try {
      if (typeof this.divergenceDetector.calculateDivergence === 'function') {
        sds = this.divergenceDetector.calculateDivergence(topology, invariants);
      } else if (typeof this.divergenceDetector.detect === 'function') {
        sds = this.divergenceDetector.detect(topology);
      }
    } catch (csrlErr) {
      recordSystemError('StreamEngine', 'CSRL_ERROR');
      console.warn(`[STREAM] CSRL divergence calculation fallback for ${this.symbol}: ${csrlErr.message}`);
    }
    recordCsrlDuration(this.symbol, (performance.now() - csrlStart) / 1000);

    const v1Sig = this.disabledProviders.has('v1') ? { signal: 'flat', confidence: 0 } : { signal: v1Narrative.signal, confidence: v1Narrative.confidence };
    const v2Sig = this.disabledProviders.has('v2') ? { signal: 'flat', confidence: 0 } : { signal: v2Narrative.signal, confidence: v2Narrative.confidence };
    const v3Sig = this.disabledProviders.has('v3') ? { signal: 'flat', confidence: 0 } : { signal: v3Narrative.signal, confidence: v3Narrative.confidence };
    const v4Sig = this.disabledProviders.has('v4') ? { signal: 'flat', confidence: 0 } : { signal: v4Narrative.signal, confidence: v4Narrative.confidence };
    const v5Sig = this.disabledProviders.has('v5') ? { signal: 'flat', confidence: 0 } : { signal: v5Narrative.signal, confidence: v5Narrative.confidence };
    const v6Sig = { signal: v6Narrative.signal, confidence: v6Narrative.confidence };
    const v7Sig = { signal: v7Narrative.signal, confidence: v7Narrative.confidence !== undefined ? v7Narrative.confidence : 50 };

    const dateObj = new Date(candle.timestamp || candle.openTime || Date.now());
    const utcHours = process.env.NODE_ENV === 'test' ? null : dateObj.getUTCHours();

    const dynamicWeights = this.weightMatrix.evaluate(topographicalAtr, v6Sig?.regime || v6Sig?.signal, utcHours);

    const providers = {
        v1: { ...v1Sig, id: 'v1' },
        v2: { ...v2Sig, id: 'v2' },
        v3: { ...v3Sig, id: 'v3' },
        v4: { ...v4Sig, id: 'v4' },
        v5: { ...v5Sig, id: 'v5' },
        v6: { ...v6Sig, id: 'v6' },
        v7: { ...v7Sig, id: 'v7' }
    };
    
    // 2.5 Dual Reality Divergence Validation
    let lhds = 0.0;
    const currentCandleTime = candle.timestamp || candle.openTime || candle.time;
    if (this.dualMonitor && currentCandleTime) {
        lhds = await this.dualMonitor.calculateDivergence(this.symbol, currentCandleTime, this.mtfCandles);
    }
    
    const oppScore = this.calculateOpportunityScore(candle);
    const imbalance = this.currentBook ? this.currentBook.imbalance : 0;

    // H1 fix: Compute liquidityDivergence from SMC active zones instead of stub 1.0
    let liquidityDivergence = 1.0;
    if (smcLiquidityResult && smcLiquidityResult.activeZones && smcLiquidityResult.activeZones.length > 0) {
      let bslCount = 0, sslCount = 0;
      for (const zone of smcLiquidityResult.activeZones) {
        if (zone.upper_bound > currentPrice) bslCount++;
        if (zone.lower_bound < currentPrice) sslCount++;
      }
      const total = bslCount + sslCount;
      liquidityDivergence = total > 0 ? Math.abs(bslCount - sslCount) / total : 1.0;
    }

    const atr14_pct = (topographicalAtr && currentPrice > 0) ? (topographicalAtr / currentPrice) : 0.00055;

    const micro = {
      liquidityDivergence,
      scaleDivergence: sds,
      lhds,
      invariants,
      distanceFromGoldenZone,
      weights: dynamicWeights,
      oppScore,
      atrRatio,
      atr14_pct,
      imbalance,
      sma20DistancePct: typeof sma20DistancePct !== 'undefined' ? sma20DistancePct : 0,
      odm: observerDivergence.odm
    };

    // 3. ACK evaluates Divergence Vector Field and Tail Risk Geometry + SDS + LHDS + ODM + Dynamic Volatility Limits
    const kernelResult = this.truthKernel.evaluate(providers, micro);

    // Experiment 3.5 Shadow Tracking (Pass vs Veto Counterfactuals)
    if (this.mode !== 'SIMULATION' || process.env.ENABLE_SHADOW_LOGGING === 'true') {
      ShadowLogger.logSignalOutcome(
        this.symbol, 
        candle.openTime || candle.timestamp || Date.now(), 
        providers.v1?.direction || 'UNKNOWN',
        currentPrice,
        micro,
        kernelResult
      );
    }
    
    if (process.env.ABLATION_NO_LHDS === 'true') {
        kernelResult.eef = true;
        kernelResult.epistemic_authority = 'ALLOW';
        kernelResult.reason_codes = [];
    }

    recordKernelEvaluated(this.symbol, kernelResult.eef, kernelResult.epistemic_authority);

    // C3 fix: Continuous MOL observation on EVERY tick (including VETOs)
    this.court.observeState(kernelResult);
    kernelResult._observed = true;

    // H3 fix: Read-only peek for telemetry (C-CLIST mutation happens in court.requestPermission only)
    const cclistEvaluation = this.court.cclist.peekStress();
    recordCclistEvaluation(this.symbol, cclistEvaluation.stressLevel, cclistEvaluation.isLethalIllusion);

    // C5 fix: Dispatch async writes to Causal Memory DB for snapshots and verdicts
    if (this.mode !== 'SIMULATION' && db && typeof db.insertCausalEvent === 'function') {
      const ts = currentCandleTime || Date.now();
      const corrId = `tick_${this.symbol}_${ts}`;
      const snapEventId = `SNAP_${this.symbol}_${ts}_${generateUUIDv7()}`;
      const verdictEventId = `VERDICT_${this.symbol}_${ts}_${generateUUIDv7()}`;
      const activeRegime = kernelResult.epistemic_regime || (dynamicWeights && dynamicWeights.activeRegime) || 'REGIME_A_CONSENSUS';

      db.insertCausalEvent({
        event_id: snapEventId,
        timestamp: ts,
        event_type: 'REALITY_SNAPSHOT_CREATED',
        source: 'StreamEngine',
        correlation_id: corrId,
        epistemic_regime: activeRegime,
        payload: { sds, lhds, liquidityDivergence, oppScore, imbalance, currentPrice, dynamic_limits: kernelResult.dynamic_limits },
        context: { symbol: this.symbol, interval: this.interval }
      }).catch(err => console.error('[CAUSAL_MEMORY] SNAPSHOT failed:', err.message));

      db.insertCausalEvent({
        event_id: verdictEventId,
        timestamp: ts,
        event_type: 'KERNEL_VERDICT',
        source: 'TruthKernel',
        correlation_id: corrId,
        parent_event: snapEventId,
        epistemic_regime: activeRegime,
        payload: kernelResult,
        context: { symbol: this.symbol }
      }).catch(err => console.error('[CAUSAL_MEMORY] VERDICT failed:', err.message));
    }

    // Update Spectrogram UI
    if (this.mode === 'LIVE' || this.mode === 'TESTNET') {
        const reason = kernelResult.reason_codes && kernelResult.reason_codes.length > 0 ? kernelResult.reason_codes[0] : null;
        this.ui.render(lhds, kernelResult.epistemic_authority || 'UNKNOWN', reason);
    }

    // Process structural evidence
    this.openMobius.processCandle(candle);
    
    // V8 Shadow Observer — Phase 4 (PURE OBSERVATION, ZERO INFLUENCE ON PIPELINE)
    // Feeds into audit log only. No write path to signal/score/sizing/orders/veto/TruthKernel.
    if ((this.mode !== 'SIMULATION' || process.env.ENABLE_V8_SHADOW === 'true') && this.v8Shadow) {
      try {
        this.v8Shadow.observe(candle, {
          fvgCount: this.openMobius._fvgs.length,
          activeFvgs: this.openMobius.getActiveFVGs().length,
          confidence: this.openMobius._fvgs.length > 0 ? 0.6 : 0,
        });
      } catch (_) { /* Shadow failure must NEVER crash the engine */ }
    }
    
    // Evaluate Fusion Engine with active regime
    const evidenceArray = [
      { sourceEngine: 'LYZER_NATIVE', evidenceMetrics: { confidence: Math.max(v1Sig.confidence, v2Sig.confidence, v3Sig.confidence), probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'IMCE_ENGINE', evidenceMetrics: { confidence: v4Sig.confidence || 0, probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'WYCKOFF_VOLUME_ENGINE', evidenceMetrics: { confidence: v5Sig.confidence, probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'MARKET_PROFILE_ENGINE', evidenceMetrics: { confidence: v6Sig.confidence || 0, probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'TAPE_READING_ENGINE', evidenceMetrics: { confidence: v7Sig.confidence || 0, probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'OPENMOBIUS_SMC', evidenceMetrics: { confidence: this.openMobius._fvgs.length > 0 ? 0.6 : 0, probability: 0.5, uncertainty: 0.5 } }
    ];
    const fusionResult = this.evidenceFusion.fuseEvidence(evidenceArray, dynamicWeights.activeRegime);

    // Evaluate Fusion Engine (Directional Vector Consensus)
    let netDirection = 0;
    let totalActiveWeight = 0;
    
    const weights = this.evidenceFusion.adaptWeightsForRegime(dynamicWeights.activeRegime, utcHours);

    const vectorMap = [
      { engine: 'v1', sig: v1Sig, weight: weights.LIQUIDITY_ENGINE || 0.15 },
      { engine: 'v2', sig: v2Sig, weight: weights.LYZER_NATIVE || 0.15 },
      { engine: 'v3', sig: v3Sig, weight: weights.VOLATILITY_ENGINE || 0.20 },
      { engine: 'v4', sig: v4Sig, weight: weights.MACRO_REGIME || 0.10 },
      { engine: 'v5', sig: v5Sig, weight: weights.WYCKOFF_VOLUME_ENGINE || 0.20 },
      { engine: 'v6', sig: v6Sig, weight: weights.MARKET_PROFILE_ENGINE || 0.05 },
      { engine: 'v7', sig: v7Sig, weight: weights.TAPE_READING_ENGINE || 0.15 }
    ];

    for (const v of vectorMap) {
      if (v.sig && v.sig.signal && v.sig.signal !== 'flat' && v.sig.signal !== 'FLAT') {
        const sigStr = String(v.sig.signal).toUpperCase();
        const isLong = sigStr.includes('LONG') || sigStr.includes('BUY') || sigStr.includes('BULL');
        const isShort = sigStr.includes('SHORT') || sigStr.includes('SELL') || sigStr.includes('BEAR');
        
        if (isLong || isShort) {
          const dir = isLong ? 1 : -1;
          const rawConf = v.sig.confidence !== undefined ? v.sig.confidence : 50;
          const conf = rawConf <= 1.0 ? rawConf : rawConf / 100.0;
          netDirection += dir * v.weight * conf;
          totalActiveWeight += v.weight * conf;
        }
      }
    }

    const vectorThreshold = parseFloat(process.env.VECTOR_CONFLUENCE_THRESHOLD || '0.018');
    const offPeakTrgFloor = parseFloat(process.env.OFF_PEAK_TRG_FLOOR || '0.48');

    let combinedSignal = 'FLAT';
    let finalConfidence = fusionResult.fusedConfidence;
    // Vetor de ativacao dinamico calibrado
    if (netDirection >= vectorThreshold) {
      combinedSignal = 'LONG';
      finalConfidence = Math.max(finalConfidence, Math.min(100, (netDirection / totalActiveWeight) * 100));
    } else if (netDirection <= -vectorThreshold) {
      combinedSignal = 'SHORT';
      finalConfidence = Math.max(finalConfidence, Math.min(100, (Math.abs(netDirection) / totalActiveWeight) * 100));
    }

    // [Gate de Fricção de Spread: Spread_instant / TopographicalATR <= 0.08]
    const maxSpreadAtrRatio = parseFloat(process.env.MAX_SPREAD_ATR_RATIO || '0.08');
    const instantSpread = (this.currentBook && typeof this.currentBook.askPrice === 'number' && typeof this.currentBook.bidPrice === 'number')
      ? Math.max(0, this.currentBook.askPrice - this.currentBook.bidPrice)
      : (candle.spread || 0);
    const spreadAtrRatio = (topographicalAtr && topographicalAtr > 0) ? (instantSpread / topographicalAtr) : 0;
    const isSpreadFrictionExcessive = instantSpread > 0 && topographicalAtr > 0 && spreadAtrRatio > maxSpreadAtrRatio;

    if (isSpreadFrictionExcessive && combinedSignal !== 'FLAT') {
      combinedSignal = 'FLAT';
      v1Narrative.narrative = 'VETO: SPREAD_FRICTION_EXCESSIVE';
    }

    // [Lyzer Golden Hours & 24/7 Adaptive Regime Filter]
    const isGoldenHour = (utcHours >= 8 && utcHours < 12) || (utcHours >= 19 && utcHours < 21);
    
    if (process.env.ABLATION_NO_GOLDEN_HOURS !== 'true' && process.env.NODE_ENV !== 'test') {
      if (!isGoldenHour && combinedSignal !== 'FLAT') {
        const allow247 = process.env.ENABLE_24_7_REGIME === 'true';
        if (allow247) {
          // In 24/7 mode, off-peak entries require viable structure (TRG >= offPeakTrgFloor)
          if ((kernelResult.trg || 0) < offPeakTrgFloor) {
            combinedSignal = 'FLAT';
            v1Narrative.narrative = 'VETO: OFF_PEAK_LOW_TRG_INERTIA';
          }
        } else {
          combinedSignal = 'FLAT';
          v1Narrative.narrative = 'VETO: OUTSIDE_GOLDEN_HOURS';
        }
      }
    }

    const baseSignal = { 
      signal: combinedSignal, 
      confidence: finalConfidence, 
      regime: fusionResult.primaryRegime || 'MTF_OBSERVATION', 
      reasons: [
        v1Narrative.narrative, 
        v2Narrative.narrative,
        v3Narrative.narrative,
        v4Narrative.narrative,
        v5Narrative.narrative,
        v6Narrative.narrative,
        v7Narrative.narrative
      ],
      explanationText: v4Narrative ? v4Narrative.explanationText : null,
      tradeDna: v4Narrative ? v4Narrative.tradeDna : null,
      Z_t: kernelResult.dvf * 10,
      pLoc,
      dealingZone,
      dealingRange,
      vectorMap
    };
    recordSignalGenerated(this.symbol, baseSignal.signal);

    let simulatedTrade = null;
    let ev = null;
    let closedTradePayload = null;

    // A. Check and update existing active position
    if (this.activePosition) {
      let closed = false;
      let exitPrice = 0;
      let exitReason = '';

      const pos = this.activePosition;
      const currentCandleIdx = this.candles.length;
      
      // Calculate micro ATR for profit barrier evaluation
      let microAtr = 0;
      const candleList = (this.candles && this.candles.length >= 5) ? this.candles : (this.mtfCandles['1m'] || []);
      if (candleList.length >= 5) {
        const recent = candleList.slice(-14);
        let sumRange = 0;
        for (let i = 0; i < recent.length; i++) sumRange += (recent[i].high - recent[i].low);
        microAtr = sumRange / recent.length;
      }
      
      const riskDistance = Math.abs(pos.entryPrice - (pos.initialStopLoss || pos.stopLoss)) || (microAtr * 1.5) || (pos.entryPrice * 0.0025);

      // Volume Baseline for Phase 4 Exhaustion Detection
      let avgVolume = 0;
      if (candleList.length >= 10) {
        const recentVols = candleList.slice(-10).map(c => c.volume || 0);
        avgVolume = recentVols.reduce((a, b) => a + b, 0) / recentVols.length;
      }

      if (pos.direction === 'LONG') {
        const minLongStop = pos.entryPrice * 1.0005; // Entry + 0.05% for slippage/spread protection
        
        // 1. Phase 1: Track peak favorable price & MFE
        if (!pos.peakFavorablePrice || candle.high > pos.peakFavorablePrice) {
          pos.peakFavorablePrice = candle.high;
        }
        const currentMfe = pos.peakFavorablePrice - pos.entryPrice;
        const currentR = riskDistance > 0 ? currentMfe / riskDistance : 0;

        // 2. Dual-Strategy & Exit Policy Management
        if (pos.exitPolicy === 'HYBRID_SCALE_OUT' || (!pos.exitPolicy && pos.strategyType !== 'RANGE_SCALP')) {
          // TREND EXPANSION PROTOCOL (Multi-Tranche Scale-Out 33/33/34%)
          // Phase 2: Spread-Protected Break-Even (+0.80R)
          const mfeBE = pos.mfeTargetBE || 0.8;
          if (process.env.ABLATION_NO_BE !== 'true' && !pos.breakEvenApplied && currentR >= mfeBE) {
            pos.stopLoss = Math.max(pos.stopLoss, minLongStop);
            pos.breakEvenApplied = true;
            console.log(`[SNIPER] BREAK_EVEN_LOCKED for LONG at index ${currentCandleIdx} (+${mfeBE.toFixed(2)}R). Risk neutralized.`);
            recordBreakEvenTrade(this.symbol, 'LONG');
          }

          // Phase 3: Expansion & Multi-Tranche Scale-Out Protocol
          if (process.env.ABLATION_NO_SCALEOUT !== 'true') {
            // Tranche 1: 33.3% at +1.20R
            const mfe1 = pos.mfeTargetScale1 || 1.2;
            if (!pos.scaleOut1Done && currentR >= mfe1) {
              const trancheWeight = 0.3333;
              const partialQty = (pos.initialQuantity || pos.quantity) * trancheWeight;
              const partialPrice = pos.entryPrice + (mfe1 * riskDistance);
              const partialPnl = (partialPrice - pos.entryPrice) / pos.entryPrice;
              pos.accumulatedPnl = (pos.accumulatedPnl || 0) + (partialPnl * trancheWeight);
              pos.remainingQuantity = (pos.remainingQuantity || pos.quantity) - partialQty;
              pos.scaleOut1Done = true;
              // Ratchet SL to +0.30R (locks minimum net profit for the entire trade)
              pos.stopLoss = Math.max(pos.stopLoss, pos.entryPrice + (0.30 * riskDistance));
              pos.scaleOutHistory = pos.scaleOutHistory || [];
              pos.scaleOutHistory.push({ phase: 'SCALEOUT_1_33PCT', price: partialPrice, r: mfe1, qty: partialQty });
              console.log(`[SNIPER] SCALE_OUT_1 (+${mfe1.toFixed(2)}R): 33% closed at ${partialPrice.toFixed(2)}. SL ratcheted to +0.30R.`);
            }

            // Tranche 2: 33.3% at +1.80R
            const mfe2 = pos.mfeTargetScale2 || 1.8;
            if (!pos.scaleOut2Done && currentR >= mfe2) {
              const trancheWeight = 0.3333;
              const partialQty = (pos.initialQuantity || pos.quantity) * trancheWeight;
              const partialPrice = pos.entryPrice + (mfe2 * riskDistance);
              const partialPnl = (partialPrice - pos.entryPrice) / pos.entryPrice;
              pos.accumulatedPnl = (pos.accumulatedPnl || 0) + (partialPnl * trancheWeight);
              pos.remainingQuantity = (pos.remainingQuantity || pos.quantity) - partialQty;
              pos.scaleOut2Done = true;
              // Ratchet SL to +1.00R (locks Phase 1 profit on remaining runner)
              pos.stopLoss = Math.max(pos.stopLoss, pos.entryPrice + (1.00 * riskDistance));
              pos.scaleOutHistory = pos.scaleOutHistory || [];
              pos.scaleOutHistory.push({ phase: 'SCALEOUT_2_33PCT', price: partialPrice, r: mfe2, qty: partialQty });
              console.log(`[SNIPER] SCALE_OUT_2 (+${mfe2.toFixed(2)}R): 33% closed at ${partialPrice.toFixed(2)}. SL ratcheted to +1.00R.`);
            }
          }

          // Phase 3.3: MicroATR Adaptive Trailing Stop for Remaining Runner (33.4%)
          if (process.env.ABLATION_NO_TRAILING !== 'true' && pos.breakEvenApplied) {
            const trailMult = pos.scaleOut2Done ? 0.8 : (pos.scaleOut1Done ? 1.0 : 1.2);
            const trailingStop = pos.peakFavorablePrice - (trailMult * microAtr);
            if (trailingStop > pos.stopLoss) {
              pos.stopLoss = trailingStop;
            }
          }
        } else if (pos.exitPolicy === 'DYNAMIC_TP' || pos.strategyType === 'RANGE_SCALP') {
          // RANGE SCALP / DYNAMIC TP MODE FOR LONG (Fast TP at +0.80R & Fast BE at +0.40R)
          const scalpBE = parseFloat(process.env.RANGE_SCALP_BE || '0.4');
          const scalpTP = parseFloat(process.env.RANGE_SCALP_TP || '0.8');

          if (!pos.breakEvenApplied && currentR >= scalpBE) {
            pos.stopLoss = Math.max(pos.stopLoss, minLongStop);
            pos.breakEvenApplied = true;
            console.log(`[SCALP] RANGE_SCALP BREAK_EVEN for LONG at index ${currentCandleIdx} (+${scalpBE.toFixed(2)}R)`);
          }

          const enableScalpTp = pos.exitPolicy !== 'TIME' && process.env.ENABLE_RANGE_SCALP_TP !== 'false';
          if (enableScalpTp && pos.strategyType === 'RANGE_SCALP' && currentR >= scalpTP) {
            closed = true;
            exitPrice = pos.entryPrice + (scalpTP * riskDistance);
            exitReason = 'RANGE_SCALP_TAKE_PROFIT';
            console.log(`[SCALP] RANGE_SCALP TAKE_PROFIT for LONG at index ${currentCandleIdx}: closed at ${exitPrice.toFixed(2)} (+${scalpTP.toFixed(2)}R)`);
          }
        }

        // 5. Phase 4: Exhaustion Volume Ejection
        const candleRange = candle.high - candle.low;
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        if (pos.breakEvenApplied && avgVolume > 0 && candle.volume > 0 && candle.volume < (avgVolume * 0.30) && candleRange > 0 && (upperWick / candleRange) > 0.45) {
          closed = true;
          exitPrice = Math.max(candle.close, pos.stopLoss);
          exitReason = 'EXHAUSTION_VOLUME_EJECTION';
          console.log(`[SNIPER] EXHAUSTION_VOLUME_EJECTION for LONG: Volume dry-up with upper rejection wick.`);
        }

        const isSLHit = candle.low <= pos.stopLoss;
        const isTPHit = (pos.takeProfit !== null && pos.takeProfit !== undefined) && candle.high >= pos.takeProfit;

        if (!closed) {
          const currentCandleTimeSec = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);
          const timeInTradeSec = currentCandleTimeSec - pos.timestamp;
          const timeLimitSec = (pos.timeExitMinutes || this.timeExitMinutes || parseFloat(process.env.TIME_EXIT_MINUTES || '15')) * 60;
          if ((pos.exitPolicy === 'TIME' || process.env.ENABLE_TIME_EXIT_ALPHA === 'true') && timeInTradeSec >= timeLimitSec) {
            closed = true;
            exitPrice = candle.close;
            exitReason = 'TIME_EXIT';
            console.log(`[EXIT] TIME_EXIT for LONG at index ${currentCandleIdx}: closed at ${exitPrice.toFixed(2)} (${timeInTradeSec}s elapsed)`);
          }
        }

        if (!closed) {
          if (process.env.INTRABAR_PESSIMISM === 'true' && isSLHit && isTPHit) {
            closed = true;
            exitPrice = pos.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (isSLHit) {
            closed = true;
            exitPrice = pos.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (isTPHit) {
            closed = true;
            exitPrice = pos.takeProfit;
            exitReason = 'TAKE_PROFIT';
          } else if ((!kernelResult.eef || kernelResult.epistemic_authority === 'VETO') && !(kernelResult.reason_codes || []).includes('VETO_NO_MANS_LAND')) {
            const dampenerClose = this.dampener.canCloseTrade(pos, currentCandleIdx, candle.close, microAtr, kernelResult);
            if (dampenerClose.canClose) {
              closed = true;
              exitPrice = pos.breakEvenApplied ? Math.max(candle.close, pos.stopLoss) : candle.close;
              exitReason = dampenerClose.reason;
            }
          }
        }
      } else if (pos.direction === 'SHORT') {
        const minShortStop = pos.entryPrice * 0.9995; // Entry - 0.05% for slippage/spread protection
        
        // 1. Phase 1: Track peak favorable price & MFE
        if (!pos.peakFavorablePrice || candle.low < pos.peakFavorablePrice) {
          pos.peakFavorablePrice = candle.low;
        }
        const currentMfe = pos.entryPrice - pos.peakFavorablePrice;
        const currentR = riskDistance > 0 ? currentMfe / riskDistance : 0;

        // 2. Dual-Strategy & Exit Policy Management
        if (pos.exitPolicy === 'HYBRID_SCALE_OUT' || (!pos.exitPolicy && pos.strategyType !== 'RANGE_SCALP')) {
          // TREND EXPANSION PROTOCOL (Multi-Tranche Scale-Out 33/33/34%)
          // Phase 2: Spread-Protected Break-Even (+0.80R)
          const mfeBE = pos.mfeTargetBE || 0.8;
          if (process.env.ABLATION_NO_BE !== 'true' && !pos.breakEvenApplied && currentR >= mfeBE) {
            pos.stopLoss = Math.min(pos.stopLoss, minShortStop);
            pos.breakEvenApplied = true;
            console.log(`[SNIPER] BREAK_EVEN_LOCKED for SHORT at index ${currentCandleIdx} (+${mfeBE.toFixed(2)}R). Risk neutralized.`);
            recordBreakEvenTrade(this.symbol, 'SHORT');
          }

          // Phase 3: Expansion & Multi-Tranche Scale-Out Protocol
          if (process.env.ABLATION_NO_SCALEOUT !== 'true') {
            // Tranche 1: 33.3% at +1.20R
            const mfe1 = pos.mfeTargetScale1 || 1.2;
            if (!pos.scaleOut1Done && currentR >= mfe1) {
              const trancheWeight = 0.3333;
              const partialQty = (pos.initialQuantity || pos.quantity) * trancheWeight;
              const partialPrice = pos.entryPrice - (mfe1 * riskDistance);
              const partialPnl = (pos.entryPrice - partialPrice) / pos.entryPrice;
              pos.accumulatedPnl = (pos.accumulatedPnl || 0) + (partialPnl * trancheWeight);
              pos.remainingQuantity = (pos.remainingQuantity || pos.quantity) - partialQty;
              pos.scaleOut1Done = true;
              // Ratchet SL to +0.30R
              pos.stopLoss = Math.min(pos.stopLoss, pos.entryPrice - (0.30 * riskDistance));
              pos.scaleOutHistory = pos.scaleOutHistory || [];
              pos.scaleOutHistory.push({ phase: 'SCALEOUT_1_33PCT', price: partialPrice, r: mfe1, qty: partialQty });
              console.log(`[SNIPER] SCALE_OUT_1 (+${mfe1.toFixed(2)}R): 33% closed at ${partialPrice.toFixed(2)}. SL ratcheted to +0.30R.`);
            }

            // Tranche 2: 33.3% at +1.80R
            const mfe2 = pos.mfeTargetScale2 || 1.8;
            if (!pos.scaleOut2Done && currentR >= mfe2) {
              const trancheWeight = 0.3333;
              const partialQty = (pos.initialQuantity || pos.quantity) * trancheWeight;
              const partialPrice = pos.entryPrice - (mfe2 * riskDistance);
              const partialPnl = (pos.entryPrice - partialPrice) / pos.entryPrice;
              pos.accumulatedPnl = (pos.accumulatedPnl || 0) + (partialPnl * trancheWeight);
              pos.remainingQuantity = (pos.remainingQuantity || pos.quantity) - partialQty;
              pos.scaleOut2Done = true;
              // Ratchet SL to +1.00R
              pos.stopLoss = Math.min(pos.stopLoss, pos.entryPrice - (1.00 * riskDistance));
              pos.scaleOutHistory = pos.scaleOutHistory || [];
              pos.scaleOutHistory.push({ phase: 'SCALEOUT_2_33PCT', price: partialPrice, r: mfe2, qty: partialQty });
              console.log(`[SNIPER] SCALE_OUT_2 (+${mfe2.toFixed(2)}R): 33% closed at ${partialPrice.toFixed(2)}. SL ratcheted to +1.00R.`);
            }
          }

          // Phase 3.3: MicroATR Adaptive Trailing Stop for Remaining Runner (33.4%)
          if (process.env.ABLATION_NO_TRAILING !== 'true' && pos.breakEvenApplied) {
            const trailMult = pos.scaleOut2Done ? 0.8 : (pos.scaleOut1Done ? 1.0 : 1.2);
            const trailingStop = pos.peakFavorablePrice + (trailMult * microAtr);
            if (trailingStop < pos.stopLoss) {
              pos.stopLoss = trailingStop;
            }
          }
        } else if (pos.exitPolicy === 'DYNAMIC_TP' || pos.strategyType === 'RANGE_SCALP') {
          // RANGE SCALP / DYNAMIC TP MODE FOR SHORT (Fast TP at +0.80R & Fast BE at +0.40R)
          const scalpBE = parseFloat(process.env.RANGE_SCALP_BE || '0.4');
          const scalpTP = parseFloat(process.env.RANGE_SCALP_TP || '0.8');

          if (!pos.breakEvenApplied && currentR >= scalpBE) {
            pos.stopLoss = Math.min(pos.stopLoss, minShortStop);
            pos.breakEvenApplied = true;
            console.log(`[SCALP] RANGE_SCALP BREAK_EVEN for SHORT at index ${currentCandleIdx} (+${scalpBE.toFixed(2)}R)`);
          }

          const enableScalpTp = pos.exitPolicy !== 'TIME' && process.env.ENABLE_RANGE_SCALP_TP !== 'false';
          if (enableScalpTp && pos.strategyType === 'RANGE_SCALP' && currentR >= scalpTP) {
            closed = true;
            exitPrice = pos.entryPrice - (scalpTP * riskDistance);
            exitReason = 'RANGE_SCALP_TAKE_PROFIT';
            console.log(`[SCALP] RANGE_SCALP TAKE_PROFIT for SHORT at index ${currentCandleIdx}: closed at ${exitPrice.toFixed(2)} (+${scalpTP.toFixed(2)}R)`);
          }
        }

        // 5. Phase 4: Exhaustion Volume Ejection
        const candleRange = candle.high - candle.low;
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        if (pos.breakEvenApplied && avgVolume > 0 && candle.volume > 0 && candle.volume < (avgVolume * 0.30) && candleRange > 0 && (lowerWick / candleRange) > 0.45) {
          closed = true;
          exitPrice = Math.min(candle.close, pos.stopLoss);
          exitReason = 'EXHAUSTION_VOLUME_EJECTION';
          console.log(`[SNIPER] EXHAUSTION_VOLUME_EJECTION for SHORT: Volume dry-up with lower rejection wick.`);
        }

        const isSLHit = candle.high >= pos.stopLoss;
        const isTPHit = (pos.takeProfit !== null && pos.takeProfit !== undefined) && candle.low <= pos.takeProfit;

        if (!closed) {
          const currentCandleTimeSec = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);
          const timeInTradeSec = currentCandleTimeSec - pos.timestamp;
          const timeLimitSec = (pos.timeExitMinutes || this.timeExitMinutes || parseFloat(process.env.TIME_EXIT_MINUTES || '15')) * 60;
          if ((pos.exitPolicy === 'TIME' || process.env.ENABLE_TIME_EXIT_ALPHA === 'true') && timeInTradeSec >= timeLimitSec) {
            closed = true;
            exitPrice = candle.close;
            exitReason = 'TIME_EXIT';
            console.log(`[EXIT] TIME_EXIT for SHORT at index ${currentCandleIdx}: closed at ${exitPrice.toFixed(2)} (${timeInTradeSec}s elapsed)`);
          }
        }

        if (!closed) {
          if (process.env.INTRABAR_PESSIMISM === 'true' && isSLHit && isTPHit) {
            closed = true;
            exitPrice = pos.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (isSLHit) {
            closed = true;
            exitPrice = pos.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (isTPHit) {
            closed = true;
            exitPrice = pos.takeProfit;
            exitReason = 'TAKE_PROFIT';
          } else if ((!kernelResult.eef || kernelResult.epistemic_authority === 'VETO') && !(kernelResult.reason_codes || []).includes('VETO_NO_MANS_LAND')) {
            const dampenerClose = this.dampener.canCloseTrade(pos, currentCandleIdx, candle.close, microAtr, kernelResult);
            if (dampenerClose.canClose) {
              closed = true;
              exitPrice = pos.breakEvenApplied ? Math.min(candle.close, pos.stopLoss) : candle.close;
              exitReason = dampenerClose.reason;
            }
          }
        }
      }

      if (closed) {
        let rawPnl = 0;
        const initialQty = pos.initialQuantity || pos.quantity || 1;
        const remainingQty = pos.remainingQuantity !== undefined ? pos.remainingQuantity : initialQty;
        const runnerWeight = initialQty > 0 ? remainingQty / initialQty : 1;

        const runnerExitPnl = pos.direction === 'LONG'
          ? (exitPrice - pos.entryPrice) / pos.entryPrice
          : (pos.entryPrice - exitPrice) / pos.entryPrice;

        if (pos.scaleOut1Done || pos.scaleOut2Done) {
          rawPnl = (pos.accumulatedPnl || 0) + (runnerExitPnl * runnerWeight);
        } else {
          rawPnl = runnerExitPnl;
        }

        // [Alpha de Liquidez] - Fee Structure Simulation (Institutional Maker Rebate Engine)
        rawPnl += 0.0001; // LIMIT resting entry rebate
        
        const isRestingOrderExit = exitReason === 'TAKE_PROFIT' || 
                                   exitReason === 'RANGE_SCALP_TAKE_PROFIT' || 
                                   (exitReason === 'STOP_LOSS' && pos.breakEvenApplied);

        if (isRestingOrderExit) {
          rawPnl += 0.0001; // LIMIT resting exit rebate (+0.01% Maker Alpha)
        } else {
          rawPnl -= 0.0002; // Low-latency execution fee
        }

        const resolvedTrade = {
          id: pos.id,
          timestamp: pos.timestamp,
          symbol: this.symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice: exitPrice,
          pnl: rawPnl,
          mfe: pos.mfe || 0,
          mae: pos.mae || 0,
          initialStopLoss: pos.initialStopLoss,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          status: 'closed',
          strategyType: pos.strategyType || 'TREND_EXPANSION',
          signal: pos.signal,
          regime: pos.regime,
          governanceDecision: pos.governanceDecision,
          wasRejected: false,
          reasonCodes: [exitReason],
          slippage: 0.0001,
          spread: 0.0001,
          distortionFactor: 1.0,
          timingOffset: 0,
          breakEvenApplied: pos.breakEvenApplied || false,
          scaleOutHistory: pos.scaleOutHistory || [],
          scaleOut1Done: pos.scaleOut1Done || false,
          scaleOut2Done: pos.scaleOut2Done || false
        };

        ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
        const tradeWithEv = safeMerge({}, resolvedTrade, { ev });
        this.tradeHistory.push(tradeWithEv);
        closedTradePayload = tradeWithEv;

        this.ui.logEvent(`Position CLOSED via ${exitReason} for ${this.symbol}. Exit: ${exitPrice}, PnL: ${(rawPnl * 100).toFixed(2)}%`);
        if (this.mode !== 'SIMULATION') {
          sendTelegramAlert(formatTradeAlert(this.symbol, resolvedTrade))
            .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));
        }

        if (shadowTradingEnabled && this.realityGapMonitor) {
          this.realityGapMonitor.logHypotheticalTrade(resolvedTrade);
        }

        // Place close order on exchange if executing in live/testnet mode
        if (this.execution) {
          const closeSide = pos.direction === 'LONG' ? 'SELL' : 'BUY';
          const closeQty = pos.quantity || 0.001;
          const exitType = exitReason === 'TAKE_PROFIT' ? 'LIMIT' : 'MARKET';
          const rules = this.getSymbolRules(exitPrice);
          this.ui.logEvent(`Executing close order (${closeSide}) for ${this.symbol} as ${exitType}. Target: ${this.mode}`);

          // Governance Gate for Exits: Request signed permission token from Court
          const exitCourtState = {
            symbol: this.symbol,
            direction: closeSide,
            isExit: true,
            positionId: pos.id,
            pnl: rawPnl,
            trg: 1.0,
            currentDrawdown: this.dailyPnl ? Math.abs(Math.min(0, this.dailyPnl)) / (this.maxDailyCapital || 1000) : 0,
            currentSlippage: 0
          };
          const exitToken = this.court.requestPermission('EXIT_TRADE', exitCourtState, {
            eef: true,
            epistemic_authority: 'ALLOW',
            reason: exitReason
          });

          if (exitToken && exitToken.granted) {
            this.execution.placeOrder(this.symbol, closeSide, exitType, closeQty, exitPrice, rules, exitToken)
              .then(order => {
                this.emit('execution', {
                  symbol: this.symbol,
                  side: closeSide,
                  order,
                  price: exitPrice,
                  quantity: closeQty
                });
              })
              .catch(e => console.error('[STREAM] Close order placement failed:', e.message));
          } else {
            console.warn(`[GOVERNANCE VETO] Court denied close execution token for ${this.symbol}: ${exitToken?.reason}`);
          }
        }

        this.dampener.recordTradeExit(this.symbol, index);
        this.releaseDailyCapital(this.activePosition);
        this.emit('trade_closed', { ...this.activePosition, exitPrice, exitReason, closedAt: Date.now() });
        this.activePosition = null;
        this.emit('state_changed');
        return; // Prevent same-tick re-entry (H4 fix)
      }
    }

    // B. Check for new trade execution
    // console.log(`[DEBUG] candle ${index} | eef: ${kernelResult.eef} | activePosition: ${!!this.activePosition} | signal: ${baseSignal.signal} | trg: ${kernelResult.trg.toFixed(3)} | dvf: ${kernelResult.dvf.toFixed(3)}`);
    if (kernelResult.eef && !this.activePosition && baseSignal.signal !== 'FLAT') {
      const rawDirection = baseSignal.signal;
      const direction = (rawDirection === 'BUY' || rawDirection === 'LONG') ? 'LONG' : (rawDirection === 'SELL' || rawDirection === 'SHORT') ? 'SHORT' : 'FLAT';
      
      if (direction === 'FLAT') return;

      // Sniper Mode: Long-Only by default in production; shorts enabled explicitly or in test environments
      const longEnabled = process.env.LONG_ENABLED !== 'false';
      const shortEnabled = process.env.ALLOW_SHORTS === 'true' || process.env.SHORT_ENABLED === 'true' || (process.env.NODE_ENV === 'test' && process.env.ALLOW_SHORTS !== 'false' && process.env.SHORT_ENABLED !== 'false');
      
      if (direction === 'LONG' && !longEnabled) return;
      if (direction === 'SHORT' && !shortEnabled) return;

      // Spread Friction Gate Defense
      if (isSpreadFrictionExcessive) {
        console.log(`[DEBUG] Blocked by Spread Friction Gate: spread/ATR ratio ${spreadAtrRatio.toFixed(4)} > ${maxSpreadAtrRatio}`);
        return;
      }
      
      const currentCandleIdx = index;
      const finalConfPct = finalConfidence <= 1.0 ? finalConfidence * 100 : finalConfidence;
      const isStrongTrend = dynamicWeights.activeRegime === 'TRENDING' || ((kernelResult.trg || 0) >= 0.38 && finalConfPct >= 55);
      const isRangeScalpCandidate = process.env.ENABLE_RANGE_SCALP_MODE === 'true' && !isStrongTrend;
      const candidateStrategy = isRangeScalpCandidate ? 'RANGE_SCALP' : 'TREND_EXPANSION';

      // [Dealing Range Invariant Gating]
      const enableDealingRange = (process.env.ENABLE_DEALING_RANGE_FILTER === 'true' || (process.env.ENABLE_DEALING_RANGE_FILTER !== 'false' && process.env.NODE_ENV !== 'test')) && process.env.ABLATION_NO_DEALING_RANGE !== 'true';
      if (enableDealingRange) {
        if (candidateStrategy === 'RANGE_SCALP') {
          // Rule 1: RANGE_SCALP long entries permitted only in DISCOUNT (P_loc < 50%)
          if (direction === 'LONG' && pLoc >= 50.0) {
            console.log(`[DEALING_RANGE] RANGE_SCALP LONG rejected: P_loc = ${pLoc.toFixed(2)}% >= 50% (PREMIUM zone). Discount required.`);
            return;
          }
        } else if (candidateStrategy === 'TREND_EXPANSION') {
          // Rule 2: TREND_EXPANSION in PREMIUM (P_loc >= 50%) requires 4 strict invariants:
          // Invariant 1: TRG >= 0.40
          // Invariant 2: DVF >= 0.15
          // Invariant 3: Volume > 1.5 * SMA20
          // Invariant 4: No exhaustion
          if (pLoc >= 50.0) {
            const trgMin = parseFloat(process.env.DEALING_EXPANSION_TRG_FLOOR || '0.40');
            const dvfMin = parseFloat(process.env.DEALING_EXPANSION_DVF_FLOOR || '0.15');
            const trgVal = typeof kernelResult.trg === 'number' ? kernelResult.trg : (kernelResult.trg?.trg || 0);
            const dvfVal = typeof kernelResult.dvf === 'number' ? kernelResult.dvf : (kernelResult.dvf?.divergence || 0);
            const trgPass = trgVal >= trgMin;
            const dvfPass = dvfVal >= dvfMin;
            const volMult = parseFloat(process.env.DEALING_EXPANSION_VOL_MULT || '1.5');
            const volPass = sma20Vol > 0 ? (candle.volume > volMult * sma20Vol) : true;

            let isExhaustion = isCandleExhaustion;
            if (direction === 'LONG') {
              const upperWick = candle.high - Math.max(candle.open, candle.close);
              if (candleRange > 0 && (upperWick / candleRange) > 0.45 && sma20Vol > 0 && candle.volume < (sma20Vol * 0.50)) {
                isExhaustion = true;
              }
            } else if (direction === 'SHORT') {
              const lowerWick = Math.min(candle.open, candle.close) - candle.low;
              if (candleRange > 0 && (lowerWick / candleRange) > 0.45 && sma20Vol > 0 && candle.volume < (sma20Vol * 0.50)) {
                isExhaustion = true;
              }
            }
            const noExhaustionPass = !isExhaustion;

            if (!trgPass || !dvfPass || !volPass || !noExhaustionPass) {
              const failedInvariants = [];
              if (!trgPass) failedInvariants.push(`TRG(${trgVal.toFixed(3)} < ${trgMin})`);
              if (!dvfPass) failedInvariants.push(`DVF(${dvfVal.toFixed(3)} < ${dvfMin})`);
              if (!volPass) failedInvariants.push(`Volume(${(candle.volume || 0).toFixed(1)} <= ${volMult}x SMA20[${sma20Vol.toFixed(1)}])`);
              if (!noExhaustionPass) failedInvariants.push('Exhaustion detected');
              console.log(`[DEALING_RANGE] TREND_EXPANSION in PREMIUM rejected: ${failedInvariants.join(', ')}`);
              return;
            }
          }
        }
      }
      // 1. Rust RiskGateway gRPC Intent Registration and Pre-Check
      const intentId = generateUUIDv7();
      const currentDrawdown = this.dailyPnl ? Math.abs(Math.min(0, this.dailyPnl)) / (this.maxDailyCapital || 1000) : 0;
      const courtState = {
        symbol: this.symbol,
        trg: kernelResult.trg,
        dvf: kernelResult.dvf,
        scale_divergence: sds,
        lhds,
        epistemic_authority: kernelResult.epistemic_authority,
        currentDrawdown,
        currentSlippage: 0
      };

      let grpcResult = { approved: true };
      let grpcRejection = '';

      if (this.riskGatewayClient && typeof this.riskGatewayClient.authorizeOrder === 'function') {
        try {
          if (typeof this.riskGatewayClient.authorize === 'function') {
            grpcResult = await this.riskGatewayClient.authorize({
              intent_id: intentId,
              symbol: this.symbol,
              side: direction === 'BUY' || direction === 'LONG' ? 'BUY' : 'SELL',
              quantity: 0.001,
              mode: this.mode
            });
          }
          if (!grpcResult.approved) {
            grpcRejection = grpcResult.rejection_reason || 'RUST_RISK_GATEWAY_VETO';
          }
        } catch (grpcErr) {
          recordSystemError('StreamEngine', 'GRPC_ERROR');
          if (this.mode === 'LIVE' && process.env.NODE_ENV !== 'test') {
            grpcResult.approved = false;
            grpcRejection = `GRPC_UNREACHABLE: ${grpcErr.message}`;
            console.error(`🛑 [FAIL-CLOSED] RiskGateway check failed (${grpcErr.message}). Execution vetoed in LIVE mode.`);
          } else {
            console.warn(`⚠️ [MOCK PASS] gRPC unavailable in testnet (${grpcErr.message}). Proceeding.`);
          }
        }
      }

      // Portão 2: ECA Court evaluates with full epistemic authority
      const permissionToken = this.court.requestPermission('EXECUTE_TRADE', courtState, {
        eef: kernelResult.eef,
        epistemic_authority: kernelResult.epistemic_authority,
        reason: kernelResult.reason_codes[0]
      });

      let governanceDecision = (permissionToken.granted && grpcResult.approved) ? 'ALLOW' : 'REJECT';
      let rejectionReason = '';

      if (!grpcResult.approved) {
        rejectionReason = grpcRejection;
      } else if (!permissionToken.granted) {
        rejectionReason = permissionToken.reason;
      }

      recordEcaEvaluation(this.symbol, governanceDecision, rejectionReason);

      if (governanceDecision === 'ALLOW') {
        const strategyType = candidateStrategy;
        const confidence = baseSignal.confidence || 0.5;
        const diversity = (this.extinctionEngine && this.extinctionEngine.metricsTracker) ? this.extinctionEngine.metricsTracker.getDiversity() : 1;
        const stress = this.extinctionEngine ? this.extinctionEngine.stressLevel : 0;
        const allocationScore = (confidence > 1 ? confidence : confidence * 100) * (1 - stress);
        const capacityScore = Math.max(0, Math.min(100, diversity * 100));
        const csi = 1.0 - stress;
        const coc = 1.0;

        // Institutional Dynamic Risk/Reward using MicroATR (1:2 R:R Ratio)
        let microAtr = 0;
        const candleList = (this.candles && this.candles.length >= 5) ? this.candles : (this.mtfCandles['1m'] || []);
        if (candleList.length >= 5) {
          const recent = candleList.slice(-14);
          let sumRange = 0;
          for (let i = 0; i < recent.length; i++) {
            sumRange += (recent[i].high - recent[i].low);
          }
          microAtr = sumRange / recent.length;
        }

        const entryPrice = candle.close;
        const atrRatio = entryPrice > 0 ? (microAtr / entryPrice) : 0.002;
        const atrSlMult = parseFloat(process.env.ATR_SL_MULTIPLIER || '1.5');
        const atrTpMult = parseFloat(process.env.ATR_TP_MULTIPLIER || '3.0');

        const minStopDefault = strategyType === 'RANGE_SCALP' ? 0.0015 : 0.0025;
        const maxStopDefault = strategyType === 'RANGE_SCALP' ? 0.0045 : 0.025;
        let minStop = minStopDefault;
        let maxStop = maxStopDefault;
        if (process.env.SCALP_MIN_STOP) minStop = validateDistanceFraction(process.env.SCALP_MIN_STOP, 'SCALP_MIN_STOP');
        else if (process.env.MIN_STOP_DISTANCE) minStop = validateDistanceFraction(process.env.MIN_STOP_DISTANCE, 'MIN_STOP_DISTANCE');

        if (process.env.SCALP_MAX_STOP) maxStop = validateDistanceFraction(process.env.SCALP_MAX_STOP, 'SCALP_MAX_STOP');
        else if (process.env.MAX_STOP_DISTANCE) maxStop = validateDistanceFraction(process.env.MAX_STOP_DISTANCE, 'MAX_STOP_DISTANCE');

        let slDistance = Math.min(maxStop, Math.max(minStop, atrRatio * atrSlMult));
        if (process.env.SCALP_SL_PCT) {
          slDistance = validateDistanceFraction(process.env.SCALP_SL_PCT, 'SCALP_SL_PCT');
        } else {
          slDistance = validateDistanceFraction(slDistance, 'calculated slDistance');
        }

        const effectiveExitPolicy = this.exitPolicy || getExitPolicyConfig().policy;
        const effectiveTimeExitMinutes = this.timeExitMinutes || getExitPolicyConfig().timeExitMinutes;

        let takeProfit = null;
        let tpDistance = null;

        if (effectiveExitPolicy !== 'TIME') {
          tpDistance = Math.max(0.0050, atrRatio * atrTpMult);
          if (strategyType === 'RANGE_SCALP') {
            tpDistance = Math.max(0.0025, atrRatio * 1.6);
          }
          if (process.env.SCALP_TP_PCT) {
            tpDistance = validateDistanceFraction(process.env.SCALP_TP_PCT, 'SCALP_TP_PCT');
          } else {
            tpDistance = validateDistanceFraction(tpDistance, 'calculated tpDistance');
          }
          takeProfit = direction === 'LONG' ? entryPrice * (1 + tpDistance) : entryPrice * (1 - tpDistance);
        } else {
          if (process.env.SCALP_TP_PCT) {
            validateDistanceFraction(process.env.SCALP_TP_PCT, 'SCALP_TP_PCT');
          }
        }

        const stopLoss = direction === 'LONG' ? entryPrice * (1 - slDistance) : entryPrice * (1 + slDistance);

        // Fail-Closed Mathematical Validation of Price Invariants
        validatePriceInvariants(direction, entryPrice, stopLoss, takeProfit);

        // Dynamic Position Sizing (Risk-Normalized or Fixed Notional)
        const enableRiskNorm = process.env.ENABLE_RISK_NORMALIZATION === 'true';
        const stopDistanceUsd = entryPrice * slDistance;
        let notionalTarget;
        let quantity;

        if (enableRiskNorm && stopDistanceUsd > 0) {
          const riskPct = parseFloat(process.env.RISK_PCT_PER_TRADE || '0.005');
          const capitalBase = parseFloat(process.env.RISK_CAPITAL_BASE || '1000');
          const riskTargetUsd = capitalBase * riskPct;
          quantity = riskTargetUsd / stopDistanceUsd;
          notionalTarget = quantity * entryPrice;
          const maxNotional = parseFloat(process.env.MAX_NOTIONAL || '50000');
          if (notionalTarget > maxNotional) {
            notionalTarget = maxNotional;
            quantity = notionalTarget / entryPrice;
          }
        } else {
          notionalTarget = parseFloat(process.env.FIXED_NOTIONAL || '20');
          quantity = notionalTarget / entryPrice;
        }

        // Apply asset-specific LOT_SIZE precision (always round DOWN to avoid exceeding risk)
        if (entryPrice > 10000) {
          quantity = Math.floor(quantity * 10000) / 10000; // 4 decimals (e.g. BTC)
          if (quantity <= 0) quantity = 0.0001;
        } else if (entryPrice > 1000) {
          quantity = Math.floor(quantity * 1000) / 1000; // 3 decimals (e.g. ETH)
          if (quantity <= 0) quantity = 0.001;
        } else if (entryPrice > 10) {
          quantity = Math.floor(quantity * 100) / 100; // 2 decimals (BNB, SOL)
          if (quantity <= 0) quantity = 0.01;
        } else {
          quantity = Math.floor(quantity); // Integer/0 decimals (ADA, XRP)
          if (quantity <= 0) quantity = 1;
        }

        const tradeTimestamp = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);

        const defaultMfeBE = strategyType === 'RANGE_SCALP' ? parseFloat(process.env.RANGE_SCALP_BE || '0.4') : parseFloat(process.env.MFE_TARGET_BE || '0.8');
        const defaultMfeScale1 = strategyType === 'RANGE_SCALP' ? parseFloat(process.env.RANGE_SCALP_TP || '0.8') : parseFloat(process.env.MFE_TARGET_SCALE1 || '1.2');
        const defaultMfeScale2 = parseFloat(process.env.MFE_TARGET_SCALE2 || '1.8');

        // Dampened TRG expansion so volatility spikes do not delay profit locks
        const trgDampened = Math.min(1.2, 1.0 + (kernelResult.trg || 0) * 0.2);
        const mfeTargetBE = Math.min(1.0, defaultMfeBE * trgDampened);
        const mfeTargetScale1 = defaultMfeScale1;
        const mfeTargetScale2 = defaultMfeScale2;

        this.activePosition = {
          id: `trade_${this.symbol}_${tradeTimestamp}`,
          timestamp: tradeTimestamp,
          openCandleIndex: currentCandleIdx,
          direction,
          strategyType,
          entryPrice,
          stopLoss,
          initialStopLoss: stopLoss,
          takeProfit,
          exitPolicy: effectiveExitPolicy,
          timeExitMinutes: effectiveTimeExitMinutes,
          quantity,
          initialQuantity: quantity,
          remainingQuantity: quantity,
          mfeTargetBE,
          mfeTargetScale1,
          mfeTargetScale2,
          scaleOut1Done: false,
          scaleOut2Done: false,
          scaleOutHistory: [],
          accumulatedPnl: 0,
          entryRegime: dynamicWeights.activeRegime || 'BALANCED',
          tradeDna: baseSignal.tradeDna,
          explanationText: baseSignal.explanationText,
          signal: {
            type: direction,
            confidence: baseSignal.confidence,
            reasons: baseSignal.reasons
          },
          vectorMap: baseSignal.vectorMap,
          regime: baseSignal.regime,
          governanceDecision
        };

        simulatedTrade = {
          id: `trade_${index}`,
          timestamp: tradeTimestamp,
          symbol: this.symbol,
          direction,
          entryPrice,
          stopLoss,
          takeProfit,
          exitPolicy: effectiveExitPolicy,
          quantity,
          status: 'open',
          tradeDna: baseSignal.tradeDna,
          explanationText: baseSignal.explanationText,
          governanceDecision
        };

        const tpDisplay = takeProfit !== null ? `TP: ${takeProfit.toFixed(2)}` : `Exit Policy: ${effectiveExitPolicy} (${effectiveTimeExitMinutes}m)`;
        this.ui.logEvent(`Position OPENED for ${this.symbol} at ${entryPrice}. SL: ${stopLoss.toFixed(2)}, ${tpDisplay}`);
        this.emit('state_changed');
      } else {
        const tradeTimestamp = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);
        simulatedTrade = {
          id: `trade_${index}`,
          timestamp: tradeTimestamp,
          symbol: this.symbol,
          direction,
          entryPrice: candle.close,
          status: 'rejected',
          governanceDecision,
          wasRejected: true,
          reasonCodes: [rejectionReason, ...kernelResult.reason_codes]
        };
      }
    }

    // 2. Step evolutionary research engine
    const arlReport = (this.mode !== 'SIMULATION' || process.env.ENABLE_ARL_RESEARCH === 'true')
      ? this.ecoEngine.step(this.candles, baseSignal)
      : null;

    // 3. Construct payload package (Telemetry mapped to CRSA)
    const payload = {
      type: 'arl',
      symbol: this.symbol,
      index,
      mode: this.mode,
      connectionState: this.connectionState,
      market: candle,
      signal: baseSignal,
      overlays: {
        zones: smcLiquidityResult.zones,
        markers: smcStructureResult.markers,
        srLevels,
        v1: {
          narrative: v1Narrative.narrative,
          signal: v1Narrative.signal,
          confidence: v1Narrative.confidence,
          source: v1Narrative.source
        },
        v2: {
          narrative: v2Narrative.narrative,
          signal: v2Narrative.signal,
          confidence: v2Narrative.confidence,
          source: v2Narrative.source
        },
        v3: {
          narrative: v3Narrative.narrative,
          signal: v3Narrative.signal,
          confidence: v3Narrative.confidence,
          source: v3Narrative.source
        }
      },
      kernel: safeMerge({}, kernelResult, {
        lhds: lhds,
        confidence: baseSignal.confidence, // Already in 0-100 percentage format
        v1_narrative: v1Narrative.narrative,
        v2_narrative: v2Narrative.narrative,
        scale_divergence_score: sds,
        csrl_invariants: invariants
      }),
      ev: ev ? {
        signalEV: ev.breakdown.signalEV,
        timingEV: ev.breakdown.timingEV,
        executionEV: ev.breakdown.executionEV,
        regimeEV: ev.breakdown.regimeEV,
        totalEV: ev.totalEV,
        classification: ev.classification
      } : null,
      zState: {
        z_t: baseSignal.Z_t || 0,
        regime: baseSignal.regime,
        volatility: kernelResult.trg // telemetry mapping for TRG
      },
      trade: this.activePosition ? {
        id: this.activePosition.id,
        index: this.activePosition.timestamp,
        direction: this.activePosition.direction,
        price: this.activePosition.entryPrice,
        pnl: '0.00%',
        status: 'open',
        stopLoss: this.activePosition.stopLoss,
        takeProfit: this.activePosition.takeProfit,
        governance: this.activePosition.governanceDecision
      } : (closedTradePayload ? {
        id: closedTradePayload.id,
        index: closedTradePayload.timestamp,
        direction: closedTradePayload.direction,
        price: closedTradePayload.entryPrice,
        exitPrice: closedTradePayload.exitPrice,
        pnl: (closedTradePayload.pnl * 100).toFixed(2) + '%',
        status: 'closed',
        governance: closedTradePayload.governanceDecision
      } : (simulatedTrade && simulatedTrade.status === 'rejected' ? {
        id: simulatedTrade.id,
        index: simulatedTrade.timestamp,
        direction: simulatedTrade.direction,
        price: simulatedTrade.entryPrice,
        pnl: '0.00%',
        status: 'rejected',
        governance: simulatedTrade.governanceDecision
      } : null)),
      arl: arlReport,
      agents: {
        ag_research: {
          status: 'AVAILABLE',
          metrics: { stress: this.ecoEngine.stressLevel || 0, regime: baseSignal.regime }
        },
        ag_risk: {
          status: kernelResult.epistemic_authority === 'VETO' || !kernelResult.eef ? 'EXECUTING' : 'AVAILABLE',
          metrics: { lhds: kernelResult.lhds_df !== undefined ? kernelResult.lhds_df : kernelResult.lhds, dvf: kernelResult.dvf, trg: kernelResult.trg }
        },
        ag_alpha: {
          status: baseSignal.signal !== 'FLAT' ? 'EXECUTING' : 'AVAILABLE',
          metrics: { signal: baseSignal.signal, confidence: baseSignal.confidence }
        },
        ag_exec: {
          status: this.activePosition ? 'EXECUTING' : 'AVAILABLE',
          metrics: { activePosition: !!this.activePosition }
        },
        ag_learn: {
          status: closedTradePayload ? 'EXECUTING' : 'AVAILABLE',
          metrics: { lastTradeEV: ev ? ev.totalEV : null }
        }
      }
    };

    this.emit('arl', payload);
    recordTickDuration(this.symbol, 'SUCCESS', (performance.now() - processStartTime) / 1000);

    // 4. Send actual execution order if permitted
    if (this.execution && simulatedTrade && simulatedTrade.governanceDecision === 'ALLOW' && this.activePosition) {
      if (this.mode === 'LIVE') {
        const estimatedCost = candle.close * this.activePosition.quantity;
        if (this.dailyCapitalUsed + estimatedCost > this.maxDailyCapital) {
          console.warn(`[RISK BLOCK] LIVE order rejected: MAX_DAILY_CAPITAL limit reached ($${this.dailyCapitalUsed.toFixed(2)} + $${estimatedCost.toFixed(2)} > $${this.maxDailyCapital.toFixed(2)}).`);
          this.activePosition = null; // Reset local position state on risk block
          return;
        }
        this.dailyCapitalUsed += estimatedCost;
      }

      this.ui.logEvent(`Executing ${simulatedTrade.direction} order. Target: ${this.mode}`);
      await this.handleExecution(simulatedTrade.direction, candle, this.activePosition.quantity);
    }
  }

  getSymbolRules(price) {
    const p = Number(price) || 0;
    const lotDecimals = p > 10000 ? 4 : p > 1000 ? 3 : p > 10 ? 2 : 0;
    const priceDecimals = p > 1000 ? 2 : p > 10 ? 2 : 4;
    return { lotDecimals, priceDecimals };
  }

  async handleExecution(direction, candle, quantity) {
    try {
      const side = direction === 'LONG' ? 'BUY' : 'SELL';
      const rules = this.getSymbolRules(candle.close);
      const order = await this.execution.placeOrder(this.symbol, side, 'LIMIT', quantity, candle.close, rules);

      this.emit('execution', {
        symbol: this.symbol,
        side,
        order,
        price: candle.close,
        quantity
      });
    } catch (e) {
      recordSystemError('StreamEngine', 'EXECUTION_ERROR');
      console.error('[STREAM] Order placement failed:', e.message);
    }
  }

  releaseDailyCapital(position) {
    const released = (position.entryPrice || 0) * (position.quantity || 0);
    this.dailyCapitalUsed = Math.max(0, this.dailyCapitalUsed - released);
  }

  stop() {
    this.isRunning = false;
    if (this.ingestor) {
      this.ingestor.stop();
      this.ingestor = null;
    }
  }
}

// Global compat singleton instance
export const arlEngineInstance = new StreamEngine({
  mode: process.env.MODE || 'TESTNET',
  symbol: 'BTCUSDT'
});

export const arl = arlEngineInstance.ecoEngine;

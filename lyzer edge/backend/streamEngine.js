/**
 * ARL v3.3 Stream Engine
 * Connects simulated candle generation or live kline streams to ARL evolution.
 */

import EventEmitter from 'events';
import { EvSignalEngine } from "../../packages/lyzer-shared/src/engine/evSignalRedesign.js";
import { computeTradeEV } from "../../packages/lyzer-shared/src/engine/evProfiler.js";
import { EVAlphaResearchEngineV3_3 } from "./EVAlphaResearchEngineV3_3.js";
import { LiveDataIngestor } from "./liveDataIngestor.js";
import { ExchangeExecution } from "./exchangeExecution.js";
import { safeMerge } from "./utils/safeJson.js";

import { RealityGapMonitor } from "./realityGapMonitor.js";
import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";
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

import { EvidenceFusionEngine } from '../src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js';
import { OpenMobiusPatternEngine } from '../src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusPatternEngine.js';

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
import crypto from 'crypto';

const signalEngine = new EvSignalEngine();
const trgThreshold = parseFloat(process.env.TRG_THRESHOLD || '0.15');
const trgExponent = parseFloat(process.env.TRG_EXPONENT || '2');
const consensusLimit = parseFloat(process.env.RESIDUAL_CONSENSUS_LIMIT || '0.1');
const lhdsVetoLimit = parseFloat(process.env.LHDS_VETO_LIMIT || '0.8');
const ontologicalCollapseTrg = parseFloat(process.env.ONTOLOGICAL_COLLAPSE_TRG || '0.7');

const cclistConfig = {
  dvfFloor: parseFloat(process.env.CCLIST_DVF_FLOOR || '0.1'),
  stressAccumulation: parseFloat(process.env.CCLIST_STRESS_ACCUMULATION || '0.002'),
  lethalIllusionLimit: parseFloat(process.env.CCLIST_LETHAL_ILLUSION_LIMIT || '0.9'),
  stressRelease: parseFloat(process.env.CCLIST_STRESS_RELEASE || '0.1'),
};
const molSclThreshold = parseInt(process.env.MOL_SCL_THRESHOLD || '3', 10);
const defaultDisabledProviders = (process.env.DISABLED_PROVIDERS || '').split(',').map(s => s.trim().toLowerCase());
const shadowTradingEnabled = process.env.SHADOW_TRADING_ENABLED === 'true';

export class StreamEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.mode = config.mode || process.env.ARL_MODE || process.env.MODE || 'SIMULATION'; // SIMULATION | LIVE | TESTNET
    this.symbol = config.symbol || 'BTCUSDT';
    this.interval = config.interval || '1m';
    this.disabledProviders = new Set((config.disabledProviders || defaultDisabledProviders).map(p => p.toLowerCase()));

    this.signalEngine = signalEngine;
    this.truthKernel = new TruthKernel({ trgThreshold, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg });
    
    const activeCclistConfig = config.cclistConfig || cclistConfig;
    const activeMolConfig = config.molConfig || { sclThreshold: molSclThreshold };
    this.court = config.court || new ConstitutionalCourt(activeCclistConfig, activeMolConfig);

    this.ecoEngine = new EVAlphaResearchEngineV3_3();
    this.extinctionEngine = this.ecoEngine.extinctionEngine;

    this.ingestor = null;
    this.execution = null;
    this.candles = [];
    this.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };
    this.setupMtfAliases();
    this.v1 = this.disabledProviders.has('v1') ? null : new LiquidityReconstructionEngine();
    this.v2 = this.disabledProviders.has('v2') ? null : new StructuralBoundaryEngine();
    this.v3 = this.disabledProviders.has('v3') ? null : new MomentumRsiEngine();
    this.v4 = this.disabledProviders.has('v4') ? null : new InstitutionalMarketCausalityEngine();
    this.v5 = this.disabledProviders.has('v5') ? null : new WyckoffVolumeProfileEngine();
    this.v6 = new MarketProfileEngine();
    this.v7 = new TapeReadingEngine();
    this.smcLiquidity = new LiquidityEngine();
    this.smcStructure = new StructureEngine();
    this.smcFacade = new SmcEngineFacade();
    this.evidenceFusion = new EvidenceFusionEngine();
    this.openMobius = new OpenMobiusPatternEngine();
    
    // CSRL Instance Initialization
    this.scaleNormalizer = new ScaleNormalizer();
    this.cstg = new CrossScaleTensorGraph();
    this.invariantExtractor = new InvariantExtractor();
    this.divergenceDetector = new DivergenceDetector();
    this.dualMonitor = new DualRealityMonitor();
    this.ui = new SpectrogramUI();
    this.dynamicSizing = new DynamicSizing();
    
    if (shadowTradingEnabled) {
      this.realityGapMonitor = new RealityGapMonitor(this.symbol);
    }

    this.isRunning = false;
    this.tradeHistory = [];
    this.activePosition = null;
    this.dampener = new MicrostructureDampener({ minHoldingCandles: 5, cooldownCandles: 5, atrBarrierMultiplier: 1.2, minRiskReward: 0.8 });

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

    console.log(`[STREAM] Fetching MTF closed candles for warmup for ${this.symbol}...`);
    this.mtfCandles = {};
    const tfs = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    // Fallback standard warmup
    for (const tf of tfs) {
      const ing = new LiveDataIngestor(this.symbol, tf);
      this.mtfCandles[tf] = await ing.warmupCandles();
    }
    this.setupMtfAliases();
    this.candles = this.mtfCandles['1m'];

    console.log(`[STREAM] Performing Deep Warmup (Cold Start Cure) for ${this.symbol}...`);
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filename = path.join(process.cwd(), `historical_data_${this.symbol}.json`);
      const rawData = await fs.readFile(filename, 'utf8');
      const allCandles = JSON.parse(rawData);
      const warmupCandles = allCandles.slice(-10000); // 34 days of 5m candles
      
      console.log(`[STREAM] Loaded ${warmupCandles.length} historical candles. Warming up TruthKernel...`);
      for (const c of warmupCandles) {
        const tickEvent = { ...c, timestamp: c.openTime, closed: true };
        this.updateMtfCandles(tickEvent);
        await this.processCandle(tickEvent, this.tickCounter, true);
      }
      console.log(`[STREAM] Deep Warmup Complete. LHDS should now be stabilized.`);
    } catch (err) {
      console.warn(`[STREAM] Deep Warmup skipped (no local JSON found). Error: ${err.message}`);
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
    candle.trace_id = crypto.randomUUID();
    recordTickReceived(this.symbol, 'websocket');
    this.mtfCandles['1m'].push(candle);
    this.candles = this.mtfCandles['1m']; // Keep legacy alias in sync
    if (this.mtfCandles['1m'].length > 1000) {
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
        if (shadowTradingEnabled) {
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

    const pos = this.activePosition;
    let closed = false;
    let exitPrice = 0;
    let exitReason = '';

    const price = candle.close;
    const high = candle.high || price;
    const low = candle.low || price;

    if (pos.direction === 'LONG') {
      if (low <= pos.stopLoss || price <= pos.stopLoss) {
        closed = true;
        exitPrice = pos.stopLoss;
        exitReason = 'STOP_LOSS';
      } else if (high >= pos.takeProfit || price >= pos.takeProfit) {
        closed = true;
        exitPrice = pos.takeProfit;
        exitReason = 'TAKE_PROFIT';
      }
    } else {
      if (high >= pos.stopLoss || price >= pos.stopLoss) {
        closed = true;
        exitPrice = pos.stopLoss;
        exitReason = 'STOP_LOSS';
      } else if (low <= pos.takeProfit || price <= pos.takeProfit) {
        closed = true;
        exitPrice = pos.takeProfit;
        exitReason = 'TAKE_PROFIT';
      }
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

      this.ui.logEvent(`⚡ [TICK GUARD] Position CLOSED via ${exitReason} for ${this.symbol}. Exit: ${exitPrice}, PnL: ${(rawPnl * 100).toFixed(2)}%`);

      sendTelegramAlert(formatTradeAlert(this.symbol, resolvedTrade))
        .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));

      if (shadowTradingEnabled && this.realityGapMonitor) {
        this.realityGapMonitor.logHypotheticalTrade(resolvedTrade);
      }

      if (this.execution) {
        const closeSide = pos.direction === 'LONG' ? 'SELL' : 'BUY';
        const closeQty = pos.quantity || 0.001;
        const exitType = exitReason === 'TAKE_PROFIT' ? 'LIMIT' : 'MARKET';
        this.execution.placeOrder(this.symbol, closeSide, exitType, closeQty, exitPrice).catch(e => console.error('[STREAM] Close order failed:', e.message));
      }

      this.dampener.recordTradeExit(this.symbol, this.tickCounter);
      this.releaseDailyCapital(this.activePosition);
      this.activePosition = null;
      this.emit('state_changed');
      this.emit('arl', { type: 'arl', symbol: this.symbol, trade: tradeWithEv, mode: this.mode });
      return tradeWithEv;
    }

    return null;
  }

  async processCandle(candle, index) {
    const processStartTime = performance.now();

    // 1. Reconstruct reality via heterogeneous engines (SMC vs SNR vs MOMENTUM_RSI vs IMCE V4)
    //    Disabled providers skip reconstruction entirely — downstream is null-safe.
    const defaultNarrative = { signal: 'flat', confidence: 0, narrative: null, source: null, causalAnswers: null, explanationText: null, tradeDna: null };
    const v1Narrative = this.disabledProviders.has('v1') ? defaultNarrative : this.v1.reconstruct(this.mtfCandles);
    const v2Narrative = this.disabledProviders.has('v2') ? defaultNarrative : this.v2.reconstruct(this.mtfCandles);
    const v3Narrative = this.disabledProviders.has('v3') ? defaultNarrative : this.v3.reconstruct(this.mtfCandles);
    const v4Narrative = this.disabledProviders.has('v4') ? defaultNarrative : this.v4.reconstruct(this.mtfCandles);
    const v5Narrative = this.disabledProviders.has('v5') ? defaultNarrative : this.v5.reconstruct(this.mtfCandles);
    const v6Narrative = this.v6.reconstruct(this.mtfCandles);
    const v7Narrative = this.v7.reconstruct(this.mtfCandles);

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
    const v2Candles = this.mtfCandles['15m'] || this.mtfCandles['1m'] || [];
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

    const providers = {
        v1: v1Sig,
        v2: v2Sig,
        v3: v3Sig, // [Lyzer Guardian] V3 Unquarantined
        v4: { signal: 'flat', confidence: 0 },  // [Lyzer Guardian] V4 Quarantined
        v5: v5Sig,
        v6: v6Sig
    };
    
    // 2.5 Dual Reality Divergence Validation
    let lhds = 0.0;
    const currentCandleTime = candle.timestamp || candle.openTime || candle.time;
    if (this.dualMonitor && currentCandleTime) {
        lhds = await this.dualMonitor.calculateDivergence(this.symbol, currentCandleTime, this.mtfCandles);
    }
    
    // 3. ACK evaluates Divergence Vector Field and Tail Risk Geometry + SDS + LHDS
    const kernelResult = this.truthKernel.evaluate(providers, { liquidityDivergence: 1.0, scaleDivergence: sds, lhds, invariants, distanceFromGoldenZone });
    recordKernelEvaluated(this.symbol, kernelResult.eef, kernelResult.epistemic_authority);

    // C-CLIST stress accumulation and MOL state evaluation occur strictly inside court.requestPermission()

    // Update Spectrogram UI
    if (this.mode === 'LIVE' || this.mode === 'TESTNET') {
        const reason = kernelResult.reason_codes && kernelResult.reason_codes.length > 0 ? kernelResult.reason_codes[0] : null;
        this.ui.render(lhds, kernelResult.epistemic_authority || 'UNKNOWN', reason);
    }

    // Process structural evidence
    this.openMobius.processCandle(candle);
    
    // Evaluate Fusion Engine
    const evidenceArray = [
      { sourceEngine: 'LYZER_NATIVE', evidenceMetrics: { confidence: Math.max(v1Sig.confidence, v2Sig.confidence, v3Sig.confidence), probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'WYCKOFF_VOLUME_ENGINE', evidenceMetrics: { confidence: v5Sig.confidence, probability: 0.5, uncertainty: 0.5 } },
      { sourceEngine: 'OPENMOBIUS_SMC', evidenceMetrics: { confidence: this.openMobius._fvgs.length > 0 ? 0.6 : 0, probability: 0.5, uncertainty: 0.5 } }
    ];
    const fusionResult = this.evidenceFusion.fuseEvidence(evidenceArray);

    // Baseline for telemetry filler with IMCE V4 priority
    let combinedSignal = 'flat';
    
    // [Lyzer Guardian] Priority shifted to V5 (Wyckoff) and V3 (Momentum) for 1m microscalping
    if (v7Narrative.signal === 'Absorption' || v7Narrative.signal === 'Exhaustion' || v7Narrative.signal === 'CVD Divergence' || (v7Narrative.signal && v7Narrative.signal !== 'flat')) {
      combinedSignal = v7Narrative.signal;
    } else if (v6Narrative.signal === 'flat') {
      combinedSignal = 'flat';
    } else if (v5Narrative.signal !== 'flat') {
      combinedSignal = v5Narrative.signal;
    } else if (v3Narrative.signal !== 'flat') {
      combinedSignal = v3Narrative.signal;
    } else if (v1Narrative.signal !== 'flat') {
      combinedSignal = v1Narrative.signal;
    } else if (v2Narrative.signal !== 'flat') {
      combinedSignal = v2Narrative.signal;
    } else if (v6Narrative.signal !== 'flat') {
      combinedSignal = v6Narrative.signal;
    }

    // [Lyzer Golden Hours] Time-Windowing filter
    const dateObj = new Date(candle.timestamp || candle.openTime || Date.now());
    const utcHours = dateObj.getUTCHours();
    const isGoldenHour = (utcHours >= 8 && utcHours < 12) || (utcHours >= 19 && utcHours < 21);
    
    if (!isGoldenHour && combinedSignal !== 'flat') {
        combinedSignal = 'flat';
        v1Narrative.narrative = 'VETO: OUTSIDE_GOLDEN_HOURS';
    }

    const baseSignal = { 
      signal: combinedSignal, 
      confidence: fusionResult.fusedConfidence, 
      regime: fusionResult.primaryRegime || 'MTF_OBSERVATION', 
      reasons: [
        v1Narrative.narrative, 
        v2Narrative.narrative,
        v3Narrative.narrative,
        v5Narrative.narrative,
        v6Narrative.narrative
        // (v4Narrative ? v4Narrative.narrative : '')
      ],
      explanationText: null, // v4Narrative ? v4Narrative.explanationText : null,
      tradeDna: null, // v4Narrative ? v4Narrative.tradeDna : null,
      Z_t: kernelResult.dvf * 10
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
           if (pos.direction === 'LONG') {
        const minLongStop = pos.entryPrice * 1.0005; // Entry + 0.05% for slippage/fees
        
        // 1. Track peak favorable price
        if (!pos.peakFavorablePrice || candle.high > pos.peakFavorablePrice) {
          pos.peakFavorablePrice = candle.high;
        }
        
        // 2. Trigger Break-Even at +1.0 ATR
        if (!pos.breakEvenApplied && pos.peakFavorablePrice >= pos.entryPrice + microAtr) {
            pos.stopLoss = minLongStop;
            pos.breakEvenApplied = true;
            console.log(`[STREAM] BREAK_EVEN_LOCKED for LONG trade at index ${currentCandleIdx}. Risk neutralized.`);
            recordBreakEvenTrade(this.symbol, 'LONG');
        }
        
        // 3. Trail Stop Loss at 1.5 ATR from peak
        if (pos.breakEvenApplied) {
            const trailingStop = pos.peakFavorablePrice - (1.5 * microAtr);
            if (trailingStop > pos.stopLoss) {
                pos.stopLoss = trailingStop;
            }
        }

        if (candle.low <= pos.stopLoss) {
          closed = true;
          exitPrice = pos.stopLoss;
          exitReason = 'STOP_LOSS';
        } else if (candle.high >= pos.takeProfit) {
          closed = true;
          exitPrice = pos.takeProfit;
          exitReason = 'TAKE_PROFIT';
        } else if ((!kernelResult.eef || kernelResult.epistemic_authority === 'VETO') && !(kernelResult.reason_codes || []).includes('VETO_NO_MANS_LAND')) {
          const dampenerClose = this.dampener.canCloseTrade(pos, currentCandleIdx, candle.close, microAtr, kernelResult);
          if (dampenerClose.canClose) {
            closed = true;
            exitPrice = candle.close;
            exitReason = dampenerClose.reason;
          }
        }
      } else if (pos.direction === 'SHORT') {
        const minShortStop = pos.entryPrice * 0.9995; // Entry - 0.05% for slippage/fees
        
        // 1. Track peak favorable price
        if (!pos.peakFavorablePrice || candle.low < pos.peakFavorablePrice) {
          pos.peakFavorablePrice = candle.low;
        }
        
        // 2. Trigger Break-Even at +1.0 ATR
        if (!pos.breakEvenApplied && pos.peakFavorablePrice <= pos.entryPrice - microAtr) {
            pos.stopLoss = minShortStop;
            pos.breakEvenApplied = true;
            console.log(`[STREAM] BREAK_EVEN_LOCKED for SHORT trade at index ${currentCandleIdx}. Risk neutralized.`);
            recordBreakEvenTrade(this.symbol, 'SHORT');
        }
        
        // 3. Trail Stop Loss at 1.5 ATR from peak
        if (pos.breakEvenApplied) {
            const trailingStop = pos.peakFavorablePrice + (1.5 * microAtr);
            if (trailingStop < pos.stopLoss) {
                pos.stopLoss = trailingStop;
            }
        }

        if (candle.high >= pos.stopLoss) {
          closed = true;
          exitPrice = pos.stopLoss;
          exitReason = 'STOP_LOSS';
        } else if (candle.low <= pos.takeProfit) {
          closed = true;
          exitPrice = pos.takeProfit;
          exitReason = 'TAKE_PROFIT';
        } else if ((!kernelResult.eef || kernelResult.epistemic_authority === 'VETO') && !(kernelResult.reason_codes || []).includes('VETO_NO_MANS_LAND')) {
          const dampenerClose = this.dampener.canCloseTrade(pos, currentCandleIdx, candle.close, microAtr, kernelResult);
          if (dampenerClose.canClose) {
            closed = true;
            exitPrice = candle.close;
            exitReason = dampenerClose.reason;
          }
        }
      }

      if (closed) {
        let rawPnl = pos.direction === 'LONG'
          ? (exitPrice - pos.entryPrice) / pos.entryPrice
          : (pos.entryPrice - exitPrice) / pos.entryPrice;

        // [Alpha de Liquidez] - Fee Structure Simulation
        rawPnl += 0.0001; // LIMIT entry rebate
        
        if (exitReason === 'TAKE_PROFIT') {
          rawPnl += 0.0001; // LIMIT exit rebate
        } else {
          rawPnl -= 0.0005; // MARKET exit fee
        }

        const resolvedTrade = {
          id: pos.id,
          timestamp: pos.timestamp,
          symbol: this.symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice: exitPrice,
          pnl: rawPnl,
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
          breakEvenApplied: pos.breakEvenApplied || false
        };

        ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
        const tradeWithEv = safeMerge({}, resolvedTrade, { ev });
        this.tradeHistory.push(tradeWithEv);
        closedTradePayload = tradeWithEv;

        this.ui.logEvent(`Position CLOSED via ${exitReason} for ${this.symbol}. Exit: ${exitPrice}, PnL: ${(rawPnl * 100).toFixed(2)}%`);
        sendTelegramAlert(formatTradeAlert(this.symbol, resolvedTrade))
          .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));

        if (shadowTradingEnabled && this.realityGapMonitor) {
          this.realityGapMonitor.logHypotheticalTrade(resolvedTrade);
        }

        // Place close order on exchange if executing in live/testnet mode
        if (this.execution) {
          const closeSide = pos.direction === 'LONG' ? 'SELL' : 'BUY';
          const closeQty = pos.quantity || 0.001;
          this.ui.logEvent(`Executing close order (${closeSide}) for ${this.symbol}. Target: ${this.mode}`);
          this.execution.placeOrder(this.symbol, closeSide, 'MARKET', closeQty)
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
        }

        this.dampener.recordTradeExit(this.symbol, index);
        this.releaseDailyCapital(this.activePosition);
        this.activePosition = null;
        this.emit('state_changed');
      }
    }

    // B. Check for new trade execution
    // console.log(`[DEBUG] candle ${index} | eef: ${kernelResult.eef} | activePosition: ${!!this.activePosition} | signal: ${baseSignal.signal} | trg: ${kernelResult.trg.toFixed(3)} | dvf: ${kernelResult.dvf.toFixed(3)}`);
    if (kernelResult.eef && !this.activePosition) {
      const direction = (baseSignal.signal === 'go' || baseSignal.signal === 'long') ? 'LONG' : 'SHORT';
      
      const currentCandleIdx = index;
      const dampenerCheck = this.dampener.canOpenTrade(this.symbol, currentCandleIdx, {
        entrySide: direction,
        m15Signal: baseSignal.m15Signal || 'flat'
      });

      if (!dampenerCheck.permitted) {
        // Blocked by anti-overtrading dampener (cooldown or MTF misalignment)
        console.log(`[DEBUG] Blocked by dampener: ${dampenerCheck.reason}`);
        return;
      }

      const courtState = { ...kernelResult };
      delete courtState.confidence;
      const permissionToken = this.court.requestPermission('EXECUTE_TRADE', courtState, { eef: kernelResult.eef, reason: kernelResult.reason_codes[0] });
      let governanceDecision = permissionToken.granted ? 'ALLOW' : 'REJECT';
      let rejectionReason = permissionToken.granted ? '' : permissionToken.reason;

      console.log(`[DEBUG] Court decision: ${governanceDecision}, reason: ${rejectionReason}`);

      // gRPC Decoupling authorization check (Rust RiskGateway)
      if (permissionToken.granted) {
        const correlationId = crypto.randomUUID();
        const causationId = crypto.randomUUID();
        const intentId = crypto.randomUUID();

        try {
          const grpcResult = await authorizeOrder({
            execution_intent_id: intentId,
            correlation_id: correlationId,
            causation_id: causationId,
            symbol: this.symbol,
            side: direction === 'BUY' || direction === 'LONG' ? 'BUY' : 'SELL',
            quantity: 0.001
          });

          if (!grpcResult.approved) {
            governanceDecision = 'REJECT';
            rejectionReason = grpcResult.rejection_reason || 'RUST_RISK_GATEWAY_VETO';
            console.warn(`[gRPC VETO] Rust RiskGateway rejected execution intent ${intentId} for ${this.symbol}. Reason: ${rejectionReason}`);
          } else {
            console.log(`[gRPC APPROVED] Rust RiskGateway authorized execution intent ${intentId} for ${this.symbol}`);
          }
        } catch (grpcErr) {
          recordSystemError('StreamEngine', 'GRPC_ERROR');
          governanceDecision = 'REJECT';
          rejectionReason = `GRPC_UNREACHABLE: ${grpcErr.message}`;
          console.error(`🛑 [FAIL-CLOSED] RiskGateway check failed (${grpcErr.message}). Execution vetoed.`);
        }
      }

      recordEcaEvaluation(this.symbol, governanceDecision, rejectionReason);

      if (governanceDecision === 'ALLOW') {
        // Calculate dynamic quantity
        const confidence = baseSignal.confidence || 0.5;
        const diversity = (this.extinctionEngine && this.extinctionEngine.metricsTracker) ? this.extinctionEngine.metricsTracker.getDiversity() : 1;
        const stress = this.extinctionEngine ? this.extinctionEngine.stressLevel : 0;
        const allocationScore = (confidence > 1 ? confidence : confidence * 100) * (1 - stress);
        const capacityScore = Math.max(0, Math.min(100, diversity * 100));
        const csi = 1.0 - stress;
        const coc = 1.0;

        // Institutional Risk/Reward (min 1.2% ATR buffer, 1:2 R:R)
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
        let slDistance = 0.0010; // 0.10% SL for 1m microscalping
        let tpDistance = 0.0025; // 0.25% TP for 1m microscalping

        if (process.env.SCALP_SL_PCT) slDistance = parseFloat(process.env.SCALP_SL_PCT);
        if (process.env.SCALP_TP_PCT) tpDistance = parseFloat(process.env.SCALP_TP_PCT);

        const stopLoss = direction === 'LONG' ? entryPrice * (1 - slDistance) : entryPrice * (1 + slDistance);
        const takeProfit = direction === 'LONG' ? entryPrice * (1 + tpDistance) : entryPrice * (1 - tpDistance);

        // Apply sizing logic using DynamicSizing
        const accountBalance = this.maxDailyCapital || 1000;
        const sizingRec = this.dynamicSizing.getDynamicSize(accountBalance, entryPrice, stopLoss, allocationScore, capacityScore, csi, coc);
        let quantity = sizingRec.positionSizeUnits;
        quantity = Math.max(0.0001, parseFloat(quantity.toFixed(5)));

        const tradeTimestamp = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);

        this.activePosition = {
          id: `trade_${index}`,
          timestamp: tradeTimestamp,
          openCandleIndex: currentCandleIdx,
          direction,
          entryPrice,
          stopLoss,
          takeProfit,
          quantity,
          tradeDna: baseSignal.tradeDna,
          explanationText: baseSignal.explanationText,
          signal: {
            type: direction,
            confidence: baseSignal.confidence,
            reasons: baseSignal.reasons
          },
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
          quantity,
          status: 'open',
          tradeDna: baseSignal.tradeDna,
          explanationText: baseSignal.explanationText,
          governanceDecision
        };

        this.ui.logEvent(`Position OPENED for ${this.symbol} at ${entryPrice}. SL: ${stopLoss.toFixed(2)}, TP: ${takeProfit.toFixed(2)}`);
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
    const arlReport = this.ecoEngine.step(this.candles, baseSignal);

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
        index: this.activePosition.timestamp,
        direction: this.activePosition.direction,
        price: this.activePosition.entryPrice,
        pnl: '0.00%',
        status: 'open',
        stopLoss: this.activePosition.stopLoss,
        takeProfit: this.activePosition.takeProfit,
        governance: this.activePosition.governanceDecision
      } : (closedTradePayload ? {
        index: closedTradePayload.timestamp,
        direction: closedTradePayload.direction,
        price: closedTradePayload.entryPrice,
        pnl: (closedTradePayload.pnl * 100).toFixed(2) + '%',
        status: 'closed',
        governance: closedTradePayload.governanceDecision
      } : (simulatedTrade && simulatedTrade.status === 'rejected' ? {
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
          status: baseSignal.signal !== 'flat' ? 'EXECUTING' : 'AVAILABLE',
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

  async handleExecution(direction, candle, quantity) {
    try {
      const side = direction === 'LONG' ? 'BUY' : 'SELL';
      const order = await this.execution.placeOrder(this.symbol, side, 'LIMIT', quantity, candle.close);

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

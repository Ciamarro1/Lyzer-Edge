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

import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";
import { ConstitutionalCourt, court } from "../../packages/lyzer-constitution/src/eca/court.js";
import { LiquidityReconstructionEngine } from "../../packages/lyzer-shared/src/providers/v1_smc_ict.js";
import { StructuralBoundaryEngine } from "../../packages/lyzer-shared/src/providers/v2_snd_snr.js";
import { MomentumRsiEngine } from "../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js";
import { InstitutionalMarketCausalityEngine } from "../../packages/lyzer-shared/src/providers/v4_imce.js";
import { LiquidityEngine } from "../../packages/lyzer-shared/src/smc/liquidityEngine.js";
import { StructureEngine } from "../../packages/lyzer-shared/src/smc/structureEngine.js";
import { SmcEngineFacade } from "../../packages/lyzer-shared/src/smc/smcFacade.js";

// CSRL Subsystem Imports
import { ScaleNormalizer } from "../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { CrossScaleTensorGraph } from "../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js";
import { InvariantExtractor } from "../../packages/lyzer-shared/src/csrl/InvariantExtractor.js";
import { DivergenceDetector } from "../../packages/lyzer-shared/src/csrl/DivergenceDetector.js";
import { DualRealityMonitor } from "./dualRealityMonitor.js";
import { SpectrogramUI } from "./spectrogramUI.js";
import { sendTelegramAlert, formatTradeAlert, formatSystemAlert } from "./telegram.js";
import { recordTickReceived, recordTickDuration, recordCsrlDuration, recordCclistEvaluation, recordEcaEvaluation } from "../src/observability/index.js";

const signalEngine = new EvSignalEngine();
const trgThreshold = parseFloat(process.env.TRG_THRESHOLD || '0.4');
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

export class StreamEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.mode = config.mode || process.env.ARL_MODE || process.env.MODE || 'SIMULATION'; // SIMULATION | LIVE | TESTNET
    this.symbol = config.symbol || 'BTCUSDT';
    this.interval = config.interval || '1m';

    this.signalEngine = signalEngine;
    this.truthKernel = new TruthKernel({ trgThreshold, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg });
    
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
    this.v1 = new LiquidityReconstructionEngine();
    this.v2 = new StructuralBoundaryEngine();
    this.v3 = new MomentumRsiEngine();
    this.v4 = new InstitutionalMarketCausalityEngine();
    this.smcLiquidity = new LiquidityEngine();
    this.smcStructure = new StructureEngine();
    this.smcFacade = new SmcEngineFacade();
    
    // CSRL Instance Initialization
    this.scaleNormalizer = new ScaleNormalizer();
    this.cstg = new CrossScaleTensorGraph();
    this.invariantExtractor = new InvariantExtractor();
    this.divergenceDetector = new DivergenceDetector();
    this.dualMonitor = new DualRealityMonitor();
    this.ui = new SpectrogramUI();

    this.isRunning = false;
    this.tradeHistory = [];
    this.activePosition = null;

    this.connectionState = 'CONNECTED';
    this.liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
    this.maxDailyCapital = parseFloat(process.env.MAX_DAILY_CAPITAL || '0');
    this.dailyCapitalUsed = 0;
    this.fallbackInterval = null;
    this.isFallbackActive = false;
    this.bootTime = Date.now();
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST) || (this.mode === 'SIMULATION');
    const defaultWindow = isTestEnv ? 0 : 45000; // Default 45 seconds boot stabilization grace period
    this.stabilizationWindowMs = process.env.MOL_STABILIZATION_WINDOW_MS !== undefined
      ? parseFloat(process.env.MOL_STABILIZATION_WINDOW_MS)
      : defaultWindow;

    this.globalEVMemory = {
      signalBuckets: {},
      regimeBuckets: {},
      governanceStats: { allowed: 0, rejected: 0, capacityConstrained: 0, cancelledLimit: 0 }
    };
  }

  async start() {
    this.isRunning = true;
    this.bootTime = Date.now();
    console.log(`[STREAM] Initializing StreamEngine in ${this.mode} mode for ${this.symbol} (Stabilization Window: ${Math.round(this.stabilizationWindowMs / 1000)}s)...`);

    if (this.mode === 'SIMULATION') {
      this.warmupSyntheticCandles();
      this.startSimulationLoop();
    } else {
      await this.startLiveMode();
    }
  }

  warmupSyntheticCandles() {
    let currentPrice = 60000.0;
    let timestamp = Date.now() - 120 * 60000;

    for (let i = 0; i < 110; i++) {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 40;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random() * 15;
      const low = Math.min(open, close) - Math.random() * 15;
      const volume = Math.floor(Math.random() * 10 + 2);
      
      this.candles.push({
        open,
        high,
        low,
        close,
        volume,
        timestamp: timestamp + i * 60000,
        datetime: new Date(timestamp + i * 60000).toISOString(),
        closed: true
      });
      currentPrice = close;
    }
  }

  startSimulationLoop() {
    this.simInterval = setInterval(() => {
      const nextIndex = this.candles.length;
      const prevCandle = this.candles[nextIndex - 1];
      const open = prevCandle.close;
      const trend = Math.sin(nextIndex / 15) * 20;
      const change = (Math.random() - 0.5) * 35 + trend;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 15;
      const low = Math.min(open, close) - Math.random() * 15;
      const volume = Math.floor(Math.random() * 15 + 3);

      const fakeCandle = {
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now(),
        datetime: new Date().toISOString(),
        closed: true
      };

      this.candles.push(fakeCandle);
      this.processCandle(fakeCandle, nextIndex);
    }, 500);
  }

  async startLiveMode() {
    // 1m, 5m, 15m intervals mapped by LiveDataIngestor
    this.ingestor = new LiveDataIngestor(this.symbol);

    console.log(`[STREAM] Fetching MTF closed candles for warmup for ${this.symbol}...`);
    this.mtfCandles = {};
    const tfs = ['1m', '5m', '15m', '1h', '4h', '1d'];
    for (const tf of tfs) {
      const ing = new LiveDataIngestor(this.symbol, tf);
      this.mtfCandles[tf] = await ing.warmupCandles();
    }
    this.setupMtfAliases();
    // For legacy fallback
    this.candles = this.mtfCandles['1m'];

    // 2. Setup execution layer
    this.initializeExecution();

    // 2.5 Setup live tick emitter for real-time frontend UI updates — broadcast ALL symbols
    this.ingestor.onTick = (candle) => {
      this.emit('arl', { type: 'tick', symbol: this.symbol, market: candle, mode: this.mode });
    };

    // 3. Register WebSocket callbacks
    this.ingestor.startWebSocket(
      async (candle) => {
        if (this.connectionState === 'FAILED' || this.connectionState === 'DEGRADED') {
          return;
        }
        
        this.updateMtfCandles(candle);
        
        try {
          await this.processCandle(candle, this.candles.length - 1);
        } catch (e) {
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

    if (state === 'CONNECTED') {
      this.initializeExecution();
      this.stopFallbackLoop();
    } else {
      console.log('[STREAM] Pausing execution layer due to connection loss/degradation.');
      this.execution = null;
      this.startFallbackLoop();
    }
  }

  startFallbackLoop() {
    if (this.connectionState === 'CONNECTED' || this.fallbackInterval) return;
    this.isFallbackActive = true;
    console.log(`[STREAM] ⚠️ Starting fallback simulation loop to keep ARL active for ${this.symbol}...`);
    
    this.fallbackInterval = setInterval(() => {
      const nextIndex = this.candles.length;
      const prevCandle = this.candles[nextIndex - 1] || { close: 60000 };
      const open = prevCandle.close;
      const change = (Math.random() - 0.5) * 35;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 15;
      const low = Math.min(open, close) - Math.random() * 15;
      const volume = Math.floor(Math.random() * 15 + 3);

      const fakeCandle = {
        open,
        high,
        low,
        close,
        volume,
        timestamp: Date.now(),
        datetime: new Date().toISOString(),
        closed: true
      };

      this.candles.push(fakeCandle);
      this.processCandle(fakeCandle, nextIndex);
    }, 60000); // 1-minute tick to emulate actual bar closes
  }

  stopFallbackLoop() {
    if (this.fallbackInterval) {
      console.log(`[STREAM] Restored live connection for ${this.symbol}. Stopping fallback simulation loop.`);
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
      this.isFallbackActive = false;
    }
  }

  async processCandle(candle, index) {
    const processStartTime = performance.now();

    // 1. Reconstruct reality via heterogeneous engines (SMC vs SNR vs MOMENTUM_RSI vs IMCE V4)
    const v1Narrative = this.v1.reconstruct(this.mtfCandles);
    const v2Narrative = this.v2.reconstruct(this.mtfCandles);
    const v3Narrative = this.v3.reconstruct(this.mtfCandles);
    const v4Narrative = this.v4.reconstruct(this.mtfCandles);

    // 1b. Full SMC Liquidity + Structure evaluation via SmcEngineFacade
    const smcResult = this.smcFacade.evaluate(this.mtfCandles);
    const smcStructureResult = smcResult.structure;
    const smcLiquidityResult = smcResult.liquidity;

    // Extract S/R levels from V2 engine
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
    const sds = this.divergenceDetector.calculateDivergence(topology, invariants);
    recordCsrlDuration(this.symbol, (performance.now() - csrlStart) / 1000);

    const providers = {
        v1: { signal: v1Narrative.signal, confidence: v1Narrative.confidence },
        v2: { signal: v2Narrative.signal, confidence: v2Narrative.confidence },
        v3: { signal: v3Narrative.signal, confidence: v3Narrative.confidence },
        v4: { signal: v4Narrative.signal, confidence: v4Narrative.confidence }
    };
    
    // 2.5 Dual Reality Divergence Validation
    let lhds = 0.0;
    if (this.dualMonitor && candle.timestamp) {
        lhds = await this.dualMonitor.calculateDivergence(this.symbol, candle.timestamp, this.mtfCandles);
    }
    
    // 3. ACK evaluates Divergence Vector Field and Tail Risk Geometry + SDS + LHDS
    const kernelResult = this.truthKernel.evaluate(providers, { liquidityDivergence: 1.0, scaleDivergence: sds, lhds, invariants });

    // Update court C-CLIST stress and MOL state on every candle tick
    const cclistStart = performance.now();
    this.court.cclist.evaluateStress(kernelResult.trg || 0, kernelResult.dvf || 0);
    this.court.mol.evaluateState(kernelResult, { eef: kernelResult.eef });
    recordCclistEvaluation(this.symbol, (performance.now() - cclistStart) / 1000);

    // Update Spectrogram UI
    if (this.mode === 'LIVE' || this.mode === 'TESTNET') {
        const reason = kernelResult.reason_codes && kernelResult.reason_codes.length > 0 ? kernelResult.reason_codes[0] : null;
        this.ui.render(lhds, kernelResult.epistemic_authority || 'UNKNOWN', reason);
    }

    // Legacy baseline for telemetry filler
    let combinedSignal = 'flat';
    if (v1Narrative.signal !== 'flat') {
      combinedSignal = v1Narrative.signal;
    } else if (v2Narrative.signal !== 'flat') {
      combinedSignal = v2Narrative.signal;
    } else {
      combinedSignal = v3Narrative.signal;
    }

    const baseSignal = { 
      signal: combinedSignal, 
      confidence: Math.max(v1Narrative.confidence, v2Narrative.confidence, v3Narrative.confidence), 
      regime: 'MTF_OBSERVATION', 
      reasons: [v1Narrative.narrative, v2Narrative.narrative, v3Narrative.narrative],
      Z_t: kernelResult.dvf * 10
    };

    let simulatedTrade = null;
    let ev = null;
    let closedTradePayload = null;

    // A. Check and update existing active position
    if (this.activePosition) {
      let closed = false;
      let exitPrice = 0;
      let exitReason = '';

      const pos = this.activePosition;
      if (pos.direction === 'LONG') {
        if (candle.low <= pos.stopLoss) {
          closed = true;
          exitPrice = pos.stopLoss;
          exitReason = 'STOP_LOSS';
        } else if (candle.high >= pos.takeProfit) {
          closed = true;
          exitPrice = pos.takeProfit;
          exitReason = 'TAKE_PROFIT';
        } else if (kernelResult.signal === 'no-go') {
          closed = true;
          exitPrice = candle.close;
          exitReason = 'REVERSAL_TO_SHORT';
        } else if (kernelResult.confidence < 50) {
          closed = true;
          exitPrice = candle.close;
          exitReason = 'LOW_CONFIDENCE';
        }
      } else {
        if (candle.high >= pos.stopLoss) {
          closed = true;
          exitPrice = pos.stopLoss;
          exitReason = 'STOP_LOSS';
        } else if (candle.low <= pos.takeProfit) {
          closed = true;
          exitPrice = pos.takeProfit;
          exitReason = 'TAKE_PROFIT';
        } else if (kernelResult.signal === 'go') {
          closed = true;
          exitPrice = candle.close;
          exitReason = 'REVERSAL_TO_LONG';
        } else if (kernelResult.confidence < 50) {
          closed = true;
          exitPrice = candle.close;
          exitReason = 'LOW_CONFIDENCE';
        }
      }

      if (closed) {
        const rawPnl = pos.direction === 'LONG'
          ? (exitPrice - pos.entryPrice) / pos.entryPrice
          : (pos.entryPrice - exitPrice) / pos.entryPrice;

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
          timingOffset: 0
        };

        ev = computeTradeEV(resolvedTrade, {}, this.tradeHistory, this.globalEVMemory);
        const tradeWithEv = { ...resolvedTrade, ev };
        this.tradeHistory.push(tradeWithEv);
        closedTradePayload = tradeWithEv;

        this.ui.logEvent(`Position CLOSED via ${exitReason} for ${this.symbol}. Exit: ${exitPrice}, PnL: ${(rawPnl * 100).toFixed(2)}%`);
        sendTelegramAlert(formatTradeAlert(this.symbol, resolvedTrade))
          .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));

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

        this.activePosition = null;
        this.emit('state_changed');
      }
    }

    // B. Check for new trade execution
    const isStabilized = (Date.now() - this.bootTime) >= this.stabilizationWindowMs;

    if (!isStabilized && kernelResult.eef && !this.activePosition) {
      const secondsLeft = Math.ceil((this.stabilizationWindowMs - (Date.now() - this.bootTime)) / 1000);
      if (!this._lastStabilizationLogged || Date.now() - this._lastStabilizationLogged > 30000) {
        console.log(`[STABILIZATION] Warmup grace period active for ${this.symbol} (${secondsLeft}s remaining). Holding execution.`);
        this._lastStabilizationLogged = Date.now();
      }
    } else if (isStabilized && kernelResult.eef && !this.activePosition) {
      const direction = (baseSignal.signal === 'go' || baseSignal.signal === 'long') ? 'LONG' : 'SHORT';
      
      const permissionToken = this.court.requestPermission('EXECUTE_TRADE', kernelResult, { eef: kernelResult.eef, reason: kernelResult.reason_codes[0] });
      const governanceDecision = permissionToken.granted ? 'ALLOW' : 'REJECT';
      const rejectionReason = permissionToken.granted ? '' : permissionToken.reason;
      recordEcaEvaluation(this.symbol, governanceDecision, rejectionReason);

      if (permissionToken.granted) {
        // Calculate dynamic quantity
        const confidence = baseSignal.confidence || 0.5;
        const diversity = (this.extinctionEngine && this.extinctionEngine.metricsTracker) ? this.extinctionEngine.metricsTracker.getDiversity() : 1;
        const baseQty = 0.001;
        const stress = this.extinctionEngine ? this.extinctionEngine.stressLevel : 0;
        const confMultiplier = confidence > 1 ? confidence / 100 : confidence;
        const divMultiplier = Math.max(0, Math.min(1, diversity));
        let quantity = baseQty * (1 - stress) * divMultiplier * confMultiplier;
        quantity = Math.max(0.0001, Math.min(baseQty, quantity));
        quantity = parseFloat(quantity.toFixed(5));

        // Micro-Scalp Risk/Reward (0.15% - 0.4% micro SL, 1:2 R:R) for sub-m5 timeframes
        let microAtr = 0;
        if (this.recentCandles && this.recentCandles.length >= 5) {
          const recent = this.recentCandles.slice(-14);
          let sumRange = 0;
          for (let i = 0; i < recent.length; i++) {
            sumRange += (recent[i].high - recent[i].low);
          }
          microAtr = sumRange / recent.length;
        }

        const entryPrice = candle.close;
        let slDistance = 0.0025; // 0.25% micro SL fallback
        let tpDistance = 0.0050; // 0.50% micro TP fallback (1:2 R:R)

        if (microAtr > 0 && entryPrice > 0) {
          const atrPct = microAtr / entryPrice;
          slDistance = Math.max(0.0015, Math.min(0.004, atrPct * 1.5));
          tpDistance = slDistance * 2.0; // 1:2 R:R ratio
        }

        if (process.env.SCALP_SL_PCT) slDistance = parseFloat(process.env.SCALP_SL_PCT);
        if (process.env.SCALP_TP_PCT) tpDistance = parseFloat(process.env.SCALP_TP_PCT);

        const stopLoss = direction === 'LONG' ? entryPrice * (1 - slDistance) : entryPrice * (1 + slDistance);
        const takeProfit = direction === 'LONG' ? entryPrice * (1 + tpDistance) : entryPrice * (1 - tpDistance);

        const tradeTimestamp = Math.floor((candle.openTime || candle.timestamp || Date.now()) / 1000);

        this.activePosition = {
          id: `trade_${index}`,
          timestamp: tradeTimestamp,
          direction,
          entryPrice,
          stopLoss,
          takeProfit,
          quantity,
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
          status: 'open',
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
      kernel: {
        ...kernelResult,
        v1_narrative: v1Narrative.narrative,
        v2_narrative: v2Narrative.narrative,
        scale_divergence_score: sds,
        csrl_invariants: invariants
      },
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
      arl: arlReport
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
      this.handleExecution(simulatedTrade.direction, candle, this.activePosition.quantity);
    }
  }

  async handleExecution(direction, candle, quantity) {
    try {
      const side = direction === 'LONG' ? 'BUY' : 'SELL';
      const order = await this.execution.placeOrder(this.symbol, side, 'MARKET', quantity);

      this.emit('execution', {
        symbol: this.symbol,
        side,
        order,
        price: candle.close,
        quantity
      });
    } catch (e) {
      console.error('[STREAM] Order placement failed:', e.message);
    }
  }

  stop() {
    this.isRunning = false;
    this.stopFallbackLoop();
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    if (this.ingestor) {
      this.ingestor.stop();
      this.ingestor = null;
    }
  }
}

// Global compat singleton instance
export const arlEngineInstance = new StreamEngine({
  mode: process.env.MODE || 'SIMULATION',
  symbol: 'BTCUSDT'
});

export const arl = arlEngineInstance.ecoEngine;

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
import { court } from "../../packages/lyzer-constitution/src/eca/court.js";
import { LiquidityReconstructionEngine } from "../../packages/lyzer-shared/src/providers/v1_smc_ict.js";
import { StructuralBoundaryEngine } from "../../packages/lyzer-shared/src/providers/v2_snd_snr.js";
import { MomentumRsiEngine } from "../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js";

// CSRL Subsystem Imports
import { ScaleNormalizer } from "../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { CrossScaleTensorGraph } from "../../packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js";
import { InvariantExtractor } from "../../packages/lyzer-shared/src/csrl/InvariantExtractor.js";
import { DivergenceDetector } from "../../packages/lyzer-shared/src/csrl/DivergenceDetector.js";
import { DualRealityMonitor } from "./dualRealityMonitor.js";
import { SpectrogramUI } from "./spectrogramUI.js";
import { sendTelegramAlert, formatTradeAlert, formatSystemAlert } from "./telegram.js";

const signalEngine = new EvSignalEngine();
const trgThreshold = parseFloat(process.env.TRG_THRESHOLD || '0.4');
const consensusLimit = parseFloat(process.env.RESIDUAL_CONSENSUS_LIMIT || '0.1');
const lhdsVetoLimit = parseFloat(process.env.LHDS_VETO_LIMIT || '0.8');
const ontologicalCollapseTrg = parseFloat(process.env.ONTOLOGICAL_COLLAPSE_TRG || '0.7');
const truthKernel = new TruthKernel({ trgThreshold, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg });

const cclistConfig = {
  dvfFloor: parseFloat(process.env.CCLIST_DVF_FLOOR || '0.1'),
  stressAccumulation: parseFloat(process.env.CCLIST_STRESS_ACCUMULATION || '0.002'),
  lethalIllusionLimit: parseFloat(process.env.CCLIST_LETHAL_ILLUSION_LIMIT || '0.9'),
  stressRelease: parseFloat(process.env.CCLIST_STRESS_RELEASE || '0.1'),
};
const molSclThreshold = parseInt(process.env.MOL_SCL_THRESHOLD || '3', 10);
court.configure(cclistConfig, { sclThreshold: molSclThreshold });

export class StreamEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.mode = config.mode || process.env.ARL_MODE || process.env.MODE || 'SIMULATION'; // SIMULATION | LIVE | TESTNET
    this.symbol = config.symbol || 'BTCUSDT';
    this.interval = config.interval || '1m';

    this.signalEngine = signalEngine;
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
    
    // CSRL Instance Initialization
    this.scaleNormalizer = new ScaleNormalizer();
    this.cstg = new CrossScaleTensorGraph();
    this.invariantExtractor = new InvariantExtractor();
    this.divergenceDetector = new DivergenceDetector();
    this.dualMonitor = new DualRealityMonitor();
    this.ui = new SpectrogramUI();

    this.isRunning = false;
    this.tradeHistory = [];

    this.connectionState = 'CONNECTED';
    this.liveTradingEnabled = process.env.LIVE_TRADING_ENABLED === 'true';
    this.maxDailyCapital = parseFloat(process.env.MAX_DAILY_CAPITAL || '0');
    this.dailyCapitalUsed = 0;
    this.fallbackInterval = null;

    this.globalEVMemory = {
      signalBuckets: {},
      regimeBuckets: {},
      governanceStats: { allowed: 0, rejected: 0, capacityConstrained: 0, cancelledLimit: 0 }
    };
  }

  async start() {
    this.isRunning = true;
    console.log(`[STREAM] Initializing StreamEngine in ${this.mode} mode for ${this.symbol}...`);

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
    this.mtfCandles['1m'].push(candle);
    this.candles = this.mtfCandles['1m']; // Keep legacy alias in sync
    if (this.mtfCandles['1m'].length > 3000) {
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
      if (list.length === 0) continue;

      const bucketStart = candle.openTime - (candle.openTime % periodMs);
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
    if (this.fallbackInterval) return;
    console.log('[STREAM] ⚠️ Starting fallback simulation loop to keep ARL active...');
    
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
      console.log('[STREAM] Restored live connection. Stopping fallback simulation loop.');
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  async processCandle(candle, index) {
    // 1. Reconstruct reality via heterogeneous engines (SMC vs SNR vs MOMENTUM_RSI)
    const v1Narrative = this.v1.reconstruct(this.mtfCandles);
    const v2Narrative = this.v2.reconstruct(this.mtfCandles);
    const v3Narrative = this.v3.reconstruct(this.mtfCandles);

    // 2. CSRL Phase: Compute Structural Coherence Across Scales
    const alignedTensors = this.scaleNormalizer.alignScales(this.mtfCandles);
    const topology = this.cstg.buildTopology(alignedTensors);
    const invariants = this.invariantExtractor.extract(topology);
    const sds = this.divergenceDetector.detect(topology);

    const providers = {
        v1: { signal: v1Narrative.signal, confidence: v1Narrative.confidence },
        v2: { signal: v2Narrative.signal, confidence: v2Narrative.confidence },
        v3: { signal: v3Narrative.signal, confidence: v3Narrative.confidence }
    };
    
    // 2.5 Dual Reality Divergence Validation
    let lhds = 0.0;
    if (this.dualMonitor && candle.timestamp) {
        lhds = await this.dualMonitor.calculateDivergence(this.symbol, candle.timestamp, this.mtfCandles);
    }
    
    // 3. ACK evaluates Divergence Vector Field and Tail Risk Geometry + SDS + LHDS
    const kernelResult = truthKernel.evaluate(providers, { liquidityDivergence: 1.0, scaleDivergence: sds, lhds, invariants });

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

    // Execution driven purely by geometric asymmetry (Execution Eligibility Flag)
    if (kernelResult.eef) {
      // In the absence of consensus, the direction must be derived from the asymmetry or legacy signal
      const direction = (baseSignal.signal === 'go' || baseSignal.signal === 'long') ? 'LONG' : 'SHORT';
      const zVal = baseSignal.Z_t || 0;
      const bias = zVal * 0.005;
      const outcome = (Math.random() - 0.45) * 0.04 + (direction === 'LONG' ? bias : -bias);

      // Living ECA / C-CLIST Constitutional Gate
      const permissionToken = court.requestPermission('EXECUTE_TRADE', kernelResult, { eef: kernelResult.eef, reason: kernelResult.reason_codes[0] });
      const governanceDecision = permissionToken.granted ? 'ALLOW' : 'REJECT';
      const rejectionReason = permissionToken.granted ? '' : permissionToken.reason;

      simulatedTrade = {
        id: `trade_${index}`,
        timestamp: index,
        symbol: this.symbol,
        direction,
        entryPrice: candle.close,
        exitPrice: candle.close * (1 + (direction === 'LONG' ? outcome : -outcome)),
        pnl: direction === 'LONG' ? outcome : -outcome,
        signal: {
          type: direction,
          confidence: baseSignal.confidence,
          reasons: baseSignal.reasons
        },
        regime: baseSignal.regime,
        governanceDecision,
        wasRejected: !permissionToken.granted,
        reasonCodes: [rejectionReason, ...kernelResult.reason_codes],
        slippage: 0.0001,
        spread: 0.0001,
        distortionFactor: 1.0,
        timingOffset: Math.abs(Math.random() * 0.001)
      };

      ev = computeTradeEV(simulatedTrade, {}, this.tradeHistory, this.globalEVMemory);
      this.tradeHistory.push({ ...simulatedTrade, ev });
      sendTelegramAlert(formatTradeAlert(this.symbol, simulatedTrade))
        .catch(e => console.error('[TELEGRAM] Error sending trade alert:', e.message));
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
      trade: simulatedTrade ? {
        index: simulatedTrade.timestamp,
        direction: simulatedTrade.direction,
        price: simulatedTrade.entryPrice,
        pnl: (simulatedTrade.pnl * 100).toFixed(2) + '%',
        governance: simulatedTrade.governanceDecision
      } : null,
      arl: arlReport
    };

    this.emit('arl', payload);

    // 4. Send actual execution order if permitted
    if (this.execution && simulatedTrade && simulatedTrade.governanceDecision === 'ALLOW') {
      if (this.mode === 'LIVE') {
        const estimatedCost = candle.close * 0.001;
        if (this.dailyCapitalUsed + estimatedCost > this.maxDailyCapital) {
          console.warn(`[RISK BLOCK] LIVE order rejected: MAX_DAILY_CAPITAL limit reached ($${this.dailyCapitalUsed.toFixed(2)} + $${estimatedCost.toFixed(2)} > $${this.maxDailyCapital.toFixed(2)}).`);
          return;
        }
        this.dailyCapitalUsed += estimatedCost;
      }

      const confidence = baseSignal.confidence || 0.5;
      const diversity = (this.extinctionEngine && this.extinctionEngine.metricsTracker) ? this.extinctionEngine.metricsTracker.getDiversity() : 1;
      
      this.ui.logEvent(`Executing ${simulatedTrade.direction} order. Target: ${this.mode}`);
      this.handleExecution(simulatedTrade.direction, candle, confidence, diversity);
    }
  }

  async handleExecution(direction, candle, confidence = 0.5, diversity = 1) {
    try {
      const side = direction === 'LONG' ? 'BUY' : 'SELL';
      
      const baseQty = 0.001;
      const stress = this.extinctionEngine ? this.extinctionEngine.stressLevel : 0;
      const confMultiplier = confidence > 1 ? confidence / 100 : confidence;
      const divMultiplier = Math.max(0, Math.min(1, diversity));

      let quantity = baseQty * (1 - stress) * divMultiplier * confMultiplier;
      quantity = Math.max(0.0001, Math.min(baseQty, quantity));
      quantity = parseFloat(quantity.toFixed(5));

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

/**
 * ARL v3.3 Stream Engine
 * Connects simulated candle generation or live kline streams to ARL evolution.
 */

import EventEmitter from 'events';
import { EvSignalEngine } from "../../../packages/lyzer-shared/src/engine/evSignalRedesign.js";
import { computeTradeEV } from "../../../packages/lyzer-shared/src/engine/evProfiler.js";
import { EVAlphaResearchEngineV3_3 } from "./EVAlphaResearchEngineV3_3.js";
import { LiveDataIngestor } from "./liveDataIngestor.js";
import { ExchangeExecution } from "./exchangeExecution.js";
import { resolvePendingTrades } from "./outcomeResolutionEngine.js";

const signalEngine = new EvSignalEngine();

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
    this.ingestor = new LiveDataIngestor(this.symbol, this.interval);

    // 1. Fetch 100 historical closed candles for genetic warmup
    const history = await this.ingestor.warmupCandles();
    this.candles = history;

    // 2. Setup execution layer
    this.initializeExecution();

    // 3. Register WebSocket callbacks
    this.ingestor.startWebSocket(
      (candle) => {
        if (this.connectionState === 'FAILED' || this.connectionState === 'DEGRADED') {
          console.log(`[STREAM] WebSocket candle ignored due to connection status: ${this.connectionState}`);
          return;
        }
        this.candles.push(candle);
        this.processCandle(candle, this.candles.length - 1);
      },
      (state) => {
        this.handleStateChange(state);
      }
    );

    console.log(`[STREAM] Live data ingestion active.`);
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

  processCandle(candle, index) {
    // 1. Evaluate signal engine
    const signalResult = this.signalEngine.evaluate(this.candles, index);

    let simulatedTrade = null;
    let ev = null;

    if (signalResult.signal !== 'caution') {
      const direction = signalResult.signal === 'go' ? 'LONG' : 'SHORT';
      const zVal = signalResult.Z_t || 0;
      const bias = zVal * 0.005;
      const outcome = (Math.random() - 0.45) * 0.04 + (direction === 'LONG' ? bias : -bias);

      const decRoll = Math.random();
      let governanceDecision = 'ALLOW';
      if (decRoll > 0.85) {
        governanceDecision = 'REJECT';
      } else if (decRoll > 0.70) {
        governanceDecision = 'CAPACITY_CONSTRAINED';
      }

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
          confidence: signalResult.confidence,
          reasons: signalResult.reasons
        },
        regime: signalResult.regime,
        governanceDecision,
        wasRejected: governanceDecision === 'REJECT',
        reasonCodes: signalResult.reasons,
        slippage: 0.0001,
        spread: 0.0001,
        distortionFactor: 1.0,
        timingOffset: Math.abs(Math.random() * 0.001)
      };

      ev = computeTradeEV(simulatedTrade, {}, this.tradeHistory, this.globalEVMemory);
      this.tradeHistory.push({ ...simulatedTrade, ev });
    }

    // 2. Step evolutionary research engine
    const arlReport = this.ecoEngine.step(this.candles, signalResult);

    // 3. Construct payload package
    const payload = {
      index,
      mode: this.mode,
      connectionState: this.connectionState,
      market: candle,
      signal: signalResult,
      ev: ev ? {
        signalEV: ev.breakdown.signalEV,
        timingEV: ev.breakdown.timingEV,
        executionEV: ev.breakdown.executionEV,
        regimeEV: ev.breakdown.regimeEV,
        totalEV: ev.totalEV,
        classification: ev.classification
      } : null,
      zState: {
        z_t: signalResult.Z_t || 0,
        regime: signalResult.regime,
        volatility: signalResult.volatility
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

      const confidence = signalResult.confidence || 0.5;
      const diversity = (this.extinctionEngine && this.extinctionEngine.metricsTracker) ? this.extinctionEngine.metricsTracker.getDiversity() : 1;
      
      const intelligenceMetadata = {
        confidence: signalResult.confidence,
        causal_state: signalResult.Z_t || 'UNKNOWN',
        rdm_state: signalResult.regime || 'UNKNOWN',
        forecast_horizon: 12,
        expected_direction: simulatedTrade.direction === 'LONG' ? 'UP' : 'DOWN',
        entry_price: candle.close,
        entry_index: index
      };

      this.handleExecution(simulatedTrade.direction, candle, confidence, diversity, intelligenceMetadata);
    }

    // 5. ORE: Resolve any pending trades whose horizon has passed
    resolvePendingTrades(candle, index);
  }

  async handleExecution(direction, candle, confidence = 0.5, diversity = 1, intelligenceMetadata = {}) {
    try {
      const side = direction === 'LONG' ? 'BUY' : 'SELL';
      
      const baseQty = 0.001;
      const stress = this.extinctionEngine ? this.extinctionEngine.stressLevel : 0;
      const confMultiplier = confidence > 1 ? confidence / 100 : confidence;
      const divMultiplier = Math.max(0, Math.min(1, diversity));

      let quantity = baseQty * (1 - stress) * divMultiplier * confMultiplier;
      quantity = Math.max(0.0001, Math.min(baseQty, quantity));
      quantity = parseFloat(quantity.toFixed(5));

      const order = await this.execution.placeOrder(this.symbol, side, 'MARKET', quantity, intelligenceMetadata);

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

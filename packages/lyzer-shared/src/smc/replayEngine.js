/**
 * @fileoverview Replay Engine for Lyzer Edge (Phase 5 / Evidence Era)
 * Re-evaluates historical candles bar-by-bar through the full quantitative pipeline:
 * TimeframeManager -> TrendEngine -> StructureEngine -> LiquidityEngine -> SmcEngineFacade -> TruthKernel -> ConstitutionalCourt
 * 
 * Allows deterministic A/B testing of Feature Flags:
 * - FEATURE_FILTER_H4_ALIGNMENT
 * - FEATURE_FILTER_STRUCTURE_CONFLUENCE
 * - FEATURE_MIN_TRG_THRESHOLD
 */

import { TimeframeManager } from './timeframeManager.js';
import { SmcEngineFacade } from './smcFacade.js';
import { TruthKernel } from '../engine/kernel.js';
import { ConstitutionalCourt } from '../../../lyzer-constitution/src/eca/court.js';

export class ReplayEngine {
  constructor(config = {}) {
    this.symbol = config.symbol || 'BTCUSDT';
    this.slPct = config.slPct || 0.0025; // 0.25% SL
    this.tpPct = config.tpPct || 0.0050; // 0.50% TP (1:2 RR)
    this.featureH4 = config.featureH4 !== undefined ? config.featureH4 : false;
    this.featureStructure = config.featureStructure !== undefined ? config.featureStructure : false;
    this.trgThreshold = config.trgThreshold !== undefined ? config.trgThreshold : 0.40;

    this.facade = new SmcEngineFacade();
    this.kernel = new TruthKernel({ trgThreshold: this.trgThreshold });
    this.court = new ConstitutionalCourt();

    this.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };
    this.tradeHistory = [];
    this.activePosition = null;
  }

  /**
   * Processes a sequence of 1m candles bar-by-bar.
   * @param {Array<Object>} m1Candles - Array of 1-minute candle objects { open, high, low, close, volume, openTime }
   * @returns {Object} Comprehensive replay statistics
   */
  run(m1Candles = []) {
    this.tradeHistory = [];
    this.activePosition = null;
    this.mtfCandles = { '1m': [], '5m': [], '15m': [], '1h': [], '4h': [], '1d': [] };

    // Set process.env flags for facade evaluation during replay
    process.env.FEATURE_FILTER_H4_ALIGNMENT = this.featureH4 ? 'true' : 'false';
    process.env.FEATURE_FILTER_STRUCTURE_CONFLUENCE = this.featureStructure ? 'true' : 'false';

    for (let i = 0; i < m1Candles.length; i++) {
      const candle = m1Candles[i];
      this._updateMtfBuffers(candle);

      // 1. Position Exit Check (SL / TP)
      if (this.activePosition) {
        this._checkPositionExit(candle);
      }

      // 2. Evaluate SMC Facade, TruthKernel, and Court bar-by-bar
      const smcResult = this.facade.evaluate(this.mtfCandles);
      const narrative = smcResult.narrative;

      if (narrative && narrative.signal !== 'flat') {
        const providers = {
          v1: { signal: narrative.signal, confidence: narrative.confidence },
          v2: { signal: narrative.signal, confidence: narrative.confidence }
        };

        const kernelResult = this.kernel.evaluate(providers, { liquidityDivergence: 1.0, scaleDivergence: 0.1 });

        // If Kernel emitted EEF and no active position exists, query Court
        if (kernelResult.eef && !this.activePosition) {
          const permission = this.court.requestPermission('EXECUTE_TRADE', kernelResult, { eef: kernelResult.eef });

          if (permission.granted) {
            const direction = narrative.signal === 'long' ? 'LONG' : 'SHORT';
            const entryPrice = candle.close;
            const stopLoss = direction === 'LONG' ? entryPrice * (1 - this.slPct) : entryPrice * (1 + this.slPct);
            const takeProfit = direction === 'LONG' ? entryPrice * (1 + this.tpPct) : entryPrice * (1 - this.tpPct);

            this.activePosition = {
              id: `replay_trade_${i}`,
              entryIndex: i,
              openTime: candle.openTime || candle.timestamp || i,
              symbol: this.symbol,
              direction,
              entryPrice,
              stopLoss,
              takeProfit
            };
          }
        }
      }
    }

    return this.getStatistics();
  }

  _checkPositionExit(candle) {
    const pos = this.activePosition;
    let closed = false;
    let exitPrice = 0;
    let result = 'loss';
    let pnl = 0;

    const high = candle.high || candle.close;
    const low = candle.low || candle.close;

    if (pos.direction === 'LONG') {
      if (low <= pos.stopLoss) {
        closed = true;
        exitPrice = pos.stopLoss;
        result = 'loss';
        pnl = -3.00;
      } else if (high >= pos.takeProfit) {
        closed = true;
        exitPrice = pos.takeProfit;
        result = 'win';
        pnl = 6.00;
      }
    } else {
      if (high >= pos.stopLoss) {
        closed = true;
        exitPrice = pos.stopLoss;
        result = 'loss';
        pnl = -3.00;
      } else if (low <= pos.takeProfit) {
        closed = true;
        exitPrice = pos.takeProfit;
        result = 'win';
        pnl = 6.00;
      }
    }

    if (closed) {
      this.tradeHistory.push({
        ...pos,
        exitPrice,
        result,
        pnl
      });
      this.activePosition = null;
    }
  }

  _updateMtfBuffers(candle) {
    this.mtfCandles['1m'].push(candle);
    if (this.mtfCandles['1m'].length > 1000) this.mtfCandles['1m'].shift();

    const tfs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    const openTime = candle.openTime || candle.timestamp || 0;

    for (const [tf, periodMs] of Object.entries(tfs)) {
      const list = this.mtfCandles[tf] || [];
      const bucketStart = openTime - (openTime % periodMs);

      if (list.length === 0) {
        list.push({ openTime: bucketStart, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume });
        continue;
      }

      const last = list[list.length - 1];
      if (last.openTime === bucketStart) {
        last.high = Math.max(last.high, candle.high);
        last.low = Math.min(last.low, candle.low);
        last.close = candle.close;
        last.volume += candle.volume;
      } else if (bucketStart > last.openTime) {
        list.push({ openTime: bucketStart, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume });
        if (list.length > 500) list.shift();
      }
    }
  }

  getStatistics() {
    const total = this.tradeHistory.length;
    let wins = 0, losses = 0, winPnl = 0, lossPnl = 0, netPnl = 0;

    this.tradeHistory.forEach(t => {
      netPnl += t.pnl;
      if (t.result === 'win') {
        wins++;
        winPnl += t.pnl;
      } else {
        losses++;
        lossPnl += Math.abs(t.pnl);
      }
    });

    const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(2)) : 0;
    const profitFactor = lossPnl > 0 ? parseFloat((winPnl / lossPnl).toFixed(2)) : winPnl;
    const expectancy = total > 0 ? parseFloat((netPnl / total).toFixed(2)) : 0;

    return {
      totalTrades: total,
      wins,
      losses,
      winRate,
      netPnl: parseFloat(netPnl.toFixed(2)),
      profitFactor,
      expectancy
    };
  }
}

/**
 * Historical Replay Engine
 * 
 * P0 FOUNDATION: Replays OHLCV data through the full alpha pipeline
 * to enable backtesting, walk-forward validation, and hypothesis testing.
 * 
 * Usage:
 *   const engine = new ReplayEngine({ trgThreshold: 0.4 });
 *   const results = engine.replay(candles);
 *   // results.trades = [...], results.stats = { winRate, sharpe, ... }
 */

import { TruthKernel } from '../engine/kernel.js';
import { LiquidityReconstructionEngine } from '../providers/v1_smc_ict.js';
import { StructuralBoundaryEngine } from '../providers/v2_snd_snr.js';
import { MomentumRsiEngine } from '../providers/v3_momentum_rsi.js';
import { InstitutionalMarketCausalityEngine } from '../providers/v4_imce.js';
import { StatisticalValidator } from './statisticalValidator.js';

export class ReplayEngine {
  constructor(config = {}) {
    this.trgThreshold = config.trgThreshold || 0.4;
    this.trgExponent = config.trgExponent || 2;
    this.consensusLimit = config.consensusLimit || 0.1;
    this.lhdsVetoLimit = config.lhdsVetoLimit || 0.8;
    this.ontologicalCollapseTrg = config.ontologicalCollapseTrg || 0.7;
    this.slDistance = config.slDistance || 0.0025;
    this.tpDistance = config.tpDistance || 0.005;
    this.warmupBars = config.warmupBars || 50;
    this.validator = new StatisticalValidator();
    this.disabledProviders = new Set((config.disabledProviders || []).map(p => p.toLowerCase()));
  }

  /**
   * Replay a candle array through the full pipeline.
   * @param {Array} candles - Array of { open, high, low, close, volume, timestamp }
   * @param {Object} options - { collectSignals: true, regime: null }
   * @returns {Object} { trades, signals, stats, rawMetrics }
   */
  replay(candles, options = {}) {
    if (!candles || candles.length < this.warmupBars + 20) {
      return { trades: [], signals: [], stats: null, error: 'INSUFFICIENT_DATA' };
    }

    // Initialize fresh instances for each replay (no state leakage)
    const kernel = new TruthKernel({
      trgThreshold: this.trgThreshold,
      trgExponent: this.trgExponent,
      consensusLimit: this.consensusLimit,
      lhdsVetoLimit: this.lhdsVetoLimit,
      ontologicalCollapseTrg: this.ontologicalCollapseTrg
    });
    const v1 = new LiquidityReconstructionEngine();
    const v2 = new StructuralBoundaryEngine();
    const v3 = new MomentumRsiEngine();
    const v4 = new InstitutionalMarketCausalityEngine();

    const trades = [];
    const signals = [];
    let activePosition = null;

    // Build MTF-like structure from 1m candles
    for (let i = this.warmupBars; i < candles.length; i++) {
      const candle = candles[i];
      const windowCandles = candles.slice(Math.max(0, i - 200), i + 1);

      // Build simplified MTF object
      const mtf = {
        fast: windowCandles,
        intermediate: windowCandles, // In replay, we use same candles for simplicity
        slow: windowCandles,
        '1m': windowCandles,
        '5m': windowCandles,
        '15m': windowCandles,
        '1h': windowCandles,
        '4h': windowCandles,
        '1d': windowCandles
      };

      // Run providers (respecting disabledProviders)
      const v1Result = this.disabledProviders.has('v1') ? { signal: 'FLAT', confidence: 0 } : v1.reconstruct(mtf);
      const v2Result = this.disabledProviders.has('v2') ? { signal: 'FLAT', confidence: 0 } : v2.reconstruct(mtf);
      const v3Result = this.disabledProviders.has('v3') ? { signal: 'FLAT', confidence: 0 } : v3.reconstruct(mtf);
      const v4Result = this.disabledProviders.has('v4') ? { signal: 'FLAT', confidence: 0 } : v4.reconstruct(mtf);

      const providers = {
        v1: { signal: v1Result.signal, confidence: v1Result.confidence },
        v2: { signal: v2Result.signal, confidence: v2Result.confidence },
        v3: { signal: v3Result.signal, confidence: v3Result.confidence },
        v4: { signal: v4Result.signal, confidence: v4Result.confidence }
      };

      // Run TruthKernel
      const kernelResult = kernel.evaluate(providers, {
        liquidityDivergence: 1.0,
        scaleDivergence: 0.0,
        lhds: 0.0
      });

      const signalRecord = {
        index: i,
        timestamp: candle.timestamp,
        price: candle.close,
        eef: kernelResult.eef,
        trg: kernelResult.trg,
        dvf: kernelResult.dvf,
        providers: { v1: v1Result.signal, v2: v2Result.signal, v3: v3Result.signal, v4: v4Result.signal },
        reason: kernelResult.reason_codes[0]
      };

      if (options.collectSignals) {
        signals.push(signalRecord);
      }

      // Check active position exit
      if (activePosition) {
        let exitPrice = null;
        let exitReason = '';

        if (activePosition.direction === 'LONG') {
          if (candle.low <= activePosition.stopLoss) {
            exitPrice = activePosition.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (candle.high >= activePosition.takeProfit) {
            exitPrice = activePosition.takeProfit;
            exitReason = 'TAKE_PROFIT';
          }
        } else {
          if (candle.high >= activePosition.stopLoss) {
            exitPrice = activePosition.stopLoss;
            exitReason = 'STOP_LOSS';
          } else if (candle.low <= activePosition.takeProfit) {
            exitPrice = activePosition.takeProfit;
            exitReason = 'TAKE_PROFIT';
          }
        }

        if (exitPrice !== null) {
          const pnl = activePosition.direction === 'LONG'
            ? (exitPrice - activePosition.entryPrice) / activePosition.entryPrice
            : (activePosition.entryPrice - exitPrice) / activePosition.entryPrice;

          trades.push({
            entryIndex: activePosition.entryIndex,
            exitIndex: i,
            entryPrice: activePosition.entryPrice,
            exitPrice,
            direction: activePosition.direction,
            pnl,
            exitReason,
            holdingBars: i - activePosition.entryIndex,
            entryTimestamp: activePosition.entryTimestamp,
            exitTimestamp: candle.timestamp
          });

          activePosition = null;
        }
      }

      // Check for new entry
      if (!activePosition && kernelResult.eef) {
        const combinedSignal = v4Result.signal !== 'flat' ? v4Result.signal
          : v1Result.signal !== 'flat' ? v1Result.signal
          : v2Result.signal !== 'flat' ? v2Result.signal
          : v3Result.signal;

        if (combinedSignal !== 'flat') {
          const direction = (combinedSignal === 'long' || combinedSignal === 'go') ? 'LONG' : 'SHORT';
          const entryPrice = candle.close;

          // ATR-based SL/TP
          let atr = 0;
          if (windowCandles.length >= 14) {
            const recent = windowCandles.slice(-14);
            let sumRange = 0;
            for (const c of recent) sumRange += (c.high - c.low);
            atr = sumRange / recent.length;
          }

          let sl = this.slDistance;
          let tp = this.tpDistance;

          if (atr > 0 && entryPrice > 0) {
            const atrPct = atr / entryPrice;
            sl = Math.max(0.0015, Math.min(0.004, atrPct * 1.5));
            tp = sl * 2.0;
          }

          const stopLoss = direction === 'LONG' ? entryPrice * (1 - sl) : entryPrice * (1 + sl);
          const takeProfit = direction === 'LONG' ? entryPrice * (1 + tp) : entryPrice * (1 - tp);

          activePosition = {
            entryIndex: i,
            entryTimestamp: candle.timestamp,
            entryPrice,
            stopLoss,
            takeProfit,
            direction
          };
        }
      }
    }

    // Close any remaining position at last candle
    if (activePosition) {
      const lastCandle = candles[candles.length - 1];
      const exitPrice = lastCandle.close;
      const pnl = activePosition.direction === 'LONG'
        ? (exitPrice - activePosition.entryPrice) / activePosition.entryPrice
        : (activePosition.entryPrice - exitPrice) / activePosition.entryPrice;

      trades.push({
        entryIndex: activePosition.entryIndex,
        exitIndex: candles.length - 1,
        entryPrice: activePosition.entryPrice,
        exitPrice,
        direction: activePosition.direction,
        pnl,
        exitReason: 'END_OF_DATA',
        holdingBars: candles.length - 1 - activePosition.entryIndex,
        entryTimestamp: activePosition.entryTimestamp,
        exitTimestamp: lastCandle.timestamp
      });
    }

    // Compute statistics
    const stats = this.validator.computeAll(trades);

    return { trades, signals, stats };
  }

  /**
   * Walk-forward validation: splits data into train/test windows.
   * @param {Array} candles - Full candle array
   * @param {number} trainPct - Percentage for training (default 0.7)
   * @param {number} windows - Number of walk-forward windows (default 5)
   * @returns {Object} { windows: [...], aggregate: { ... } }
   */
  walkForward(candles, trainPct = 0.7, windows = 5) {
    const totalBars = candles.length;
    const windowSize = Math.floor(totalBars / windows);
    const results = [];

    for (let w = 0; w < windows; w++) {
      const start = w * windowSize;
      const end = Math.min(start + windowSize, totalBars);
      const windowCandles = candles.slice(start, end);

      const splitIdx = Math.floor(windowCandles.length * trainPct);
      const trainCandles = windowCandles.slice(0, splitIdx);
      const testCandles = windowCandles.slice(splitIdx);

      const trainResult = this.replay(trainCandles);
      const testResult = this.replay(testCandles);

      results.push({
        window: w + 1,
        trainBars: trainCandles.length,
        testBars: testCandles.length,
        trainStats: trainResult.stats,
        testStats: testResult.stats,
        trainTrades: trainResult.trades.length,
        testTrades: testResult.trades.length
      });
    }

    // Aggregate test performance
    const allTestStats = results.map(r => r.testStats).filter(s => s !== null);

    return {
      windows: results,
      aggregate: {
        avgTestSharpe: allTestStats.length > 0
          ? allTestStats.reduce((s, t) => s + (t.sharpe || 0), 0) / allTestStats.length
          : null,
        avgTestWinRate: allTestStats.length > 0
          ? allTestStats.reduce((s, t) => s + (t.winRate || 0), 0) / allTestStats.length
          : null,
        windowCount: windows,
        consistentWindows: allTestStats.filter(s => s && s.profitFactor > 1).length
      }
    };
  }
}

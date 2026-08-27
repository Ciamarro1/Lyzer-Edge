/**
 * SmcEngineFacade
 * Unified facade orchestrating TimeframeManager, TrendEngine, StructureEngine, and LiquidityEngine
 * for zero-lookahead SMC analysis, signal narrative generation, and visual overlays.
 */

import { TimeframeManager } from './timeframeManager.js';
import { TrendEngine } from './trendEngine.js';
import { StructureEngine } from './structureEngine.js';
import { LiquidityEngine } from './liquidityEngine.js';

export class SmcEngineFacade {
  constructor() {
    this.tfManager = new TimeframeManager();
    this.trendEngine = new TrendEngine();
    this.structureEngine = new StructureEngine();
    this.liquidityEngine = new LiquidityEngine();
  }

  /**
   * Synchronizes mtfCandles dictionary into TimeframeManager and evaluates SMC state.
   * @param {Object} mtfCandles - Object containing array of candles per timeframe ('1m', '5m', '15m', '1h', '4h')
   * @returns {Object} Unified SMC analysis result including trend, structure, liquidity, signal and overlays.
   */
  evaluate(mtfCandles = {}) {
    // 1. Sync 1m candles into TimeframeManager if needed
    const fastCandles = mtfCandles['1m'] || [];
    if (fastCandles.length > 0) {
      const tfCandles = this.tfManager.getCandles('1m');
      const currentLength = tfCandles.length;
      if (currentLength === 0) {
        for (let i = 0; i < fastCandles.length; i++) {
          this.tfManager.update(fastCandles[i]);
        }
      } else {
        const lastSynced = tfCandles[currentLength - 1];
        const lastSyncedTime = lastSynced ? (lastSynced.openTime !== undefined ? lastSynced.openTime : lastSynced.timestamp) : -1;
        const startIdx = Math.max(0, fastCandles.length - 10);
        for (let i = startIdx; i < fastCandles.length; i++) {
          const candle = fastCandles[i];
          const candleTime = candle.openTime !== undefined ? candle.openTime : candle.timestamp;
          if (candleTime > lastSyncedTime) {
            this.tfManager.update(candle);
          }
        }
      }
    }

    // 2. Evaluate Trend, Structure and Liquidity
    const trendState = this.trendEngine.evaluate(this.tfManager);
    const structureState = this.structureEngine.analyze(this.tfManager);
    const liquidityState = this.liquidityEngine.evaluate(this.tfManager, structureState);

    // 3. Derive unified narrative signal for Kernel provider V1 mapping
    let signal = 'flat';
    let narrative = 'SMC_OBSERVATION';
    let confidence = 50;

    const enforceH4 = process.env.FEATURE_FILTER_H4_ALIGNMENT === 'true';
    const enforceStructure = process.env.FEATURE_FILTER_STRUCTURE_CONFLUENCE === 'true';

    if (liquidityState.sweep && liquidityState.sweep.swept) {
      if (liquidityState.sweep.swept === 'SSL') {
        const h4Ok = !enforceH4 || trendState.bias === 'BULLISH' || trendState.bias === 'NEUTRAL';
        const structOk = !enforceStructure || (structureState.markers && structureState.markers.some(m => m.direction === 'BULLISH'));
        if (h4Ok && structOk) {
          signal = 'long';
          narrative = 'SELL_SIDE_LIQUIDITY_SWEPT';
          confidence = 85;
        }
      } else if (liquidityState.sweep.swept === 'BSL') {
        const h4Ok = !enforceH4 || trendState.bias === 'BEARISH' || trendState.bias === 'NEUTRAL';
        const structOk = !enforceStructure || (structureState.markers && structureState.markers.some(m => m.direction === 'BEARISH'));
        if (h4Ok && structOk) {
          signal = 'short';
          narrative = 'BUY_SIDE_LIQUIDITY_SWEPT';
          confidence = 85;
        }
      }
    } else if (structureState.markers && structureState.markers.length > 0) {
      const lastMarker = structureState.markers[structureState.markers.length - 1];
      if (lastMarker.type === 'BOS' || lastMarker.type === 'CHOCH') {
        const candidateSignal = lastMarker.direction === 'BULLISH' ? 'long' : 'short';
        const h4Ok = !enforceH4 || (candidateSignal === 'long' ? trendState.bias !== 'BEARISH' : trendState.bias !== 'BULLISH');
        if (h4Ok) {
          signal = candidateSignal;
          narrative = `${lastMarker.direction}_${lastMarker.type}_DETECTED`;
          confidence = 75;
        }
      }
    }

    return {
      trend: trendState,
      structure: structureState,
      liquidity: liquidityState,
      narrative: {
        signal,
        narrative,
        confidence,
        source: 'SMC_FACADE'
      },
      overlays: {
        zones: liquidityState.zones || [],
        markers: structureState.markers || []
      }
    };
  }
}

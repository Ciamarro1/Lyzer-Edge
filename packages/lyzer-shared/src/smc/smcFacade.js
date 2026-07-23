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
      const currentLength = this.tfManager.getCandles('1m').length;
      if (currentLength === 0) {
        for (const candle of fastCandles) {
          this.tfManager.update(candle);
        }
      } else {
        const lastSynced = this.tfManager.getCandles('1m').slice(-1)[0];
        const lastSyncedTime = lastSynced ? (lastSynced.openTime !== undefined ? lastSynced.openTime : lastSynced.timestamp) : -1;
        
        for (const candle of fastCandles) {
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

    if (liquidityState.sweep && liquidityState.sweep.swept) {
      if (liquidityState.sweep.swept === 'SSL') {
        signal = 'long';
        narrative = 'SELL_SIDE_LIQUIDITY_SWEPT';
        confidence = 85;
      } else if (liquidityState.sweep.swept === 'BSL') {
        signal = 'short';
        narrative = 'BUY_SIDE_LIQUIDITY_SWEPT';
        confidence = 85;
      }
    } else if (structureState.markers && structureState.markers.length > 0) {
      const lastMarker = structureState.markers[structureState.markers.length - 1];
      if (lastMarker.type === 'BOS' || lastMarker.type === 'CHOCH') {
        signal = lastMarker.direction === 'BULLISH' ? 'long' : 'short';
        narrative = `${lastMarker.direction}_${lastMarker.type}_DETECTED`;
        confidence = 75;
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

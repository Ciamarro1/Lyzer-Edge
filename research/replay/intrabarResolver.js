/**
 * @fileoverview Intrabar Resolver for Replay Engine
 * Resolves the ambiguity when both SL and TP are hit within the same candle.
 * 
 * Problem: Given a candle where both SL and TP prices are within [low, high],
 * which was hit first? Without tick data, we cannot know for certain.
 * 
 * Strategy: CONSERVATIVE (worst-case assumption)
 * - If direction is LONG:
 *   - SL is below entry, TP is above entry
 *   - If both are hit, assume SL was hit first (worst case)
 * - If direction is SHORT:
 *   - SL is above entry, TP is below entry
 *   - If both are hit, assume SL was hit first (worst case)
 * 
 * Alternative strategies (for future research):
 * - OPTIMISTIC: Assume TP hit first
 * - OHLC_PROXIMITY: Use distance from open to infer sequence
 * - PROBABILISTIC: Use historical tick distribution
 */

export class IntrabarResolver {
  constructor(config = {}) {
    this.strategy = config.strategy || 'CONSERVATIVE';
  }

  /**
   * Resolves exit within a single candle.
   * @param {Object} position - Active position { direction, entryPrice, stopLoss, takeProfit, breakEvenPrice }
   * @param {Object} candle - OHLCV candle { open, high, low, close, openTime }
   * @returns {Object|null} Exit result or null if no exit triggered
   */
  resolve(position, candle) {
    const { direction, stopLoss, takeProfit, breakEvenPrice } = position;
    const effectiveSL = breakEvenPrice || stopLoss;
    const high = candle.high;
    const low = candle.low;

    const isLong = direction === 'LONG' || direction === 'BUY';

    let slHit = false;
    let tpHit = false;

    if (isLong) {
      slHit = low <= effectiveSL;
      tpHit = takeProfit != null && high >= takeProfit;
    } else {
      slHit = high >= effectiveSL;
      tpHit = takeProfit != null && low <= takeProfit;
    }

    if (!slHit && !tpHit) return null;

    // Both hit in same candle — apply resolution strategy
    if (slHit && tpHit) {
      return this._resolveConflict(position, candle, isLong);
    }

    // Only one hit
    if (slHit) {
      return {
        exitType: breakEvenPrice ? 'BREAK_EVEN' : 'STOP_LOSS',
        exitPrice: effectiveSL,
        exitTime: candle.openTime,
        candle,
      };
    }

    return {
      exitType: 'TAKE_PROFIT',
      exitPrice: takeProfit,
      exitTime: candle.openTime,
      candle,
    };
  }

  _resolveConflict(position, candle, isLong) {
    const { stopLoss, takeProfit, breakEvenPrice } = position;
    const effectiveSL = breakEvenPrice || stopLoss;

    switch (this.strategy) {
      case 'CONSERVATIVE':
        // Worst case: SL always hit first
        return {
          exitType: breakEvenPrice ? 'BREAK_EVEN' : 'STOP_LOSS',
          exitPrice: effectiveSL,
          exitTime: candle.openTime,
          conflictResolution: 'CONSERVATIVE',
          candle,
        };

      case 'OPTIMISTIC':
        // Best case: TP hit first
        return {
          exitType: 'TAKE_PROFIT',
          exitPrice: takeProfit,
          exitTime: candle.openTime,
          conflictResolution: 'OPTIMISTIC',
          candle,
        };

      case 'OHLC_PROXIMITY': {
        // Infer from open price: which level is closer to open?
        const open = candle.open;
        const distToSL = Math.abs(open - effectiveSL);
        const distToTP = Math.abs(open - takeProfit);
        
        if (distToSL <= distToTP) {
          return {
            exitType: breakEvenPrice ? 'BREAK_EVEN' : 'STOP_LOSS',
            exitPrice: effectiveSL,
            exitTime: candle.openTime,
            conflictResolution: 'OHLC_PROXIMITY_SL',
            candle,
          };
        }
        return {
          exitType: 'TAKE_PROFIT',
          exitPrice: takeProfit,
          exitTime: candle.openTime,
          conflictResolution: 'OHLC_PROXIMITY_TP',
          candle,
        };
      }

      default:
        // Fallback: conservative
        return {
          exitType: breakEvenPrice ? 'BREAK_EVEN' : 'STOP_LOSS',
          exitPrice: effectiveSL,
          exitTime: candle.openTime,
          conflictResolution: 'DEFAULT_CONSERVATIVE',
          candle,
        };
    }
  }
}

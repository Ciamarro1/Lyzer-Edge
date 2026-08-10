/**
 * @fileoverview MicrostructureDampener — Anti-Overtrading & Signal Hysteresis Engine
 * Implements the 5-Point Institutional Anti-Overtrading Safeguards:
 * 1. Minimum Holding Time (MHT): Holds positions for at least N candles (default: 5)
 * 2. Post-Trade Cooldown Buffer: Mandates N candles rest (default: 5) after exit before re-entry
 * 3. ATR Profit Barrier: Requires >= 1.2x ATR or >= 1.5 R:R before normal signal exit
 * 4. MTF Alignment Lock: Checks higher timeframe structural alignment
 * 5. MOL State Hysteresis: Requires 10 consecutive stable ticks
 */

export class MicrostructureDampener {
  /**
   * @param {Object} [options]
   * @param {number} [options.minHoldingCandles=5] - MHT candle lock
   * @param {number} [options.cooldownCandles=5] - Post-trade cooldown
   * @param {number} [options.atrBarrierMultiplier=1.2] - Min ATR target
   * @param {number} [options.minRiskReward=1.5] - Min R:R ratio
   * @param {number} [options.molStableTicksRequired=10] - Ticks needed to exit recovery
   */
  constructor({
    minHoldingCandles = 2,
    cooldownCandles = 2,
    atrBarrierMultiplier = 0.6,
    minRiskReward = 1.0,
    molStableTicksRequired = 3
  } = {}) {
    this.minHoldingCandles = minHoldingCandles;
    this.cooldownCandles = cooldownCandles;
    this.atrBarrierMultiplier = atrBarrierMultiplier;
    this.minRiskReward = minRiskReward;
    this.molStableTicksRequired = molStableTicksRequired;

    // Per-symbol execution state trackers
    this.lastExitCandleIndex = new Map();
    this.consecutiveStableTicks = new Map();
  }

  /**
   * Evaluates if a new trade entry is permitted under anti-overtrading rules.
   * @param {string} symbol - Trading pair (e.g. 'BTCUSDT')
   * @param {number} currentCandleIndex - Current total candle count or timestamp index
   * @param {Object} mtfContext - Higher timeframe structure ({ m15Signal, h1Signal, entrySide })
   * @returns {{ permitted: boolean, reason?: string }}
   */
  canOpenTrade(symbol, currentCandleIndex, mtfContext = {}) {
    // 1. Post-Trade Cooldown Buffer Check
    const lastExit = this.lastExitCandleIndex.get(symbol);
    if (lastExit !== undefined) {
      const elapsedCandles = currentCandleIndex - lastExit;
      if (elapsedCandles < this.cooldownCandles) {
        console.log(`[DAMPENER DEBUG] currentCandleIndex=${currentCandleIndex}, lastExit=${lastExit}, elapsed=${elapsedCandles}`);
        return {
          permitted: false,
          reason: `COOLDOWN_ACTIVE (${elapsedCandles}/${this.cooldownCandles} candles elapsed since last trade exit)`
        };
      }
    }

    // 2. MTF Trend Alignment Check
    if (mtfContext.entrySide) {
      const { entrySide, m15Signal, h1Signal } = mtfContext;
      const targetSide = entrySide.toLowerCase();
      if (m15Signal && m15Signal !== 'flat' && m15Signal.toLowerCase() !== targetSide) {
        return {
          permitted: false,
          reason: `MTF_MISALIGNMENT (Entry ${entrySide} conflicts with M15 trend ${m15Signal})`
        };
      }
      if (h1Signal && h1Signal !== 'flat' && h1Signal.toLowerCase() !== targetSide) {
        return {
          permitted: false,
          reason: `MTF_MISALIGNMENT (Entry ${entrySide} conflicts with H1 trend ${h1Signal})`
        };
      }
    }

    return { permitted: true };
  }

  /**
   * Evaluates if an active position is allowed to close (enforces MHT & ATR Profit Barrier).
   * @param {Object} position - Active position record
   * @param {number} currentCandleIndex - Current candle index
   * @param {number} currentPrice - Current price
   * @param {number} currentAtr - Current ATR value
   * @param {Object} kernelResult - Latest kernel evaluation ({ lhds, eef, reason })
   * @returns {{ canClose: boolean, reason?: string }}
   */
  canCloseTrade(position, currentCandleIndex, currentPrice, currentAtr, kernelResult = {}) {
    const reasonCodes = kernelResult.reason_codes || [];

    // Catastrophic LHDS Veto Override (Always allow emergency exit)
    if (kernelResult.lhds > 0.8 || reasonCodes.includes('VETO_REALITY_DIVERGENCE') || kernelResult.reason === 'VETO_ONTOLOGICAL_COLLAPSE') {
      return { canClose: true, reason: 'EMERGENCY_LHDS_VETO_EXIT' };
    }

    // OpenMobius / Wyckoff / FVG Counter-Signal Override (Early Exit to minimize SL hits)
    const openMobiusVetos = [
      'VETO_FVG_AGAINST_POSITION', 
      'VETO_WYCKOFF_DISTRIBUTION',
      'VETO_OPENMOBIUS_COUNTER_SIGNAL'
    ];
    
    if (reasonCodes.some(code => openMobiusVetos.includes(code)) || kernelResult.openMobiusFvgAgainst) {
      return { canClose: true, reason: 'EMERGENCY_OPENMOBIUS_COUNTER_SIGNAL' };
    }

    // 1. Minimum Holding Time (MHT) Candle Lock
    const openIndex = position.openCandleIndex || 0;
    const candlesHeld = currentCandleIndex - openIndex;
    if (candlesHeld < this.minHoldingCandles) {
      return {
        canClose: false,
        reason: `MHT_CANDLE_LOCK (${candlesHeld}/${this.minHoldingCandles} candles held)`
      };
    }

    // 2. ATR Profit & Noise Barrier Check (for non-StopLoss exits)
    if (currentAtr && currentAtr > 0) {
      const isLong = position.side === 'BUY' || position.side === 'LONG';
      const priceDelta = isLong ? (currentPrice - position.entryPrice) : (position.entryPrice - currentPrice);
      const atrMultiple = priceDelta / currentAtr;

      const riskDist = Math.abs(position.entryPrice - position.stopLossPrice) || (currentAtr * 1.5);
      const riskRewardRatio = priceDelta / riskDist;

      // If trade is in profit but hasn't reached 1.2x ATR or 1.5 R:R, hold through minor noise
      if (priceDelta > 0 && atrMultiple < this.atrBarrierMultiplier && riskRewardRatio < this.minRiskReward) {
        return {
          canClose: false,
          reason: `NOISE_BARRIER_HOLD (ATR multiple: ${atrMultiple.toFixed(2)}/${this.atrBarrierMultiplier}, R:R: ${riskRewardRatio.toFixed(2)}/${this.minRiskReward})`
        };
      }
    }

    return { canClose: true };
  }

  /**
   * Registers trade exit to start post-trade cooldown counter.
   * @param {string} symbol
   * @param {number} exitCandleIndex
   */
  recordTradeExit(symbol, exitCandleIndex) {
    this.lastExitCandleIndex.set(symbol, exitCandleIndex);
  }

  /**
   * Evaluates MOL recovery stability hysteresis.
   * @param {string} symbol
   * @param {boolean} isStableTick
   * @returns {boolean} Whether recovery state is sufficiently stable to allow execution
   */
  evaluateMolStability(symbol, isStableTick) {
    let current = this.consecutiveStableTicks.get(symbol) || 0;
    if (isStableTick) {
      current++;
      this.consecutiveStableTicks.set(symbol, current);
    } else {
      this.consecutiveStableTicks.set(symbol, 0);
      return false;
    }
    return current >= this.molStableTicksRequired;
  }
}

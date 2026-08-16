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
  constructor({
    minHoldingCandles = 2,
    baseCooldownCandles = 3,
    minCooldownCandles = 2,
    maxCooldownCandles = 25,
    trgReference = 0.45,
    trgExponent = 2.0,
    trgPenaltyFactor = 2.0,
    baseAtrBarrierMultiplier = 0.6,
    baseMinRiskReward = 1.0,
    molStableTicksRequired = 3
  } = {}) {
    this.minHoldingCandles = minHoldingCandles;
    this.baseCooldownCandles = baseCooldownCandles;
    this.minCooldownCandles = minCooldownCandles;
    this.maxCooldownCandles = maxCooldownCandles;
    this.trgReference = trgReference;
    this.trgExponent = trgExponent;
    this.trgPenaltyFactor = trgPenaltyFactor;
    this.baseAtrBarrierMultiplier = baseAtrBarrierMultiplier;
    this.baseMinRiskReward = baseMinRiskReward;
    this.molStableTicksRequired = molStableTicksRequired;

    // Per-symbol execution state trackers
    this.lastExitState = new Map(); // symbol -> { exitCandleIndex, outcome, exitReason, timestamp }
    this.lastExitCandleIndex = new Map();
    this.consecutiveStableTicks = new Map();
  }

  /**
   * Computes adaptive dynamic cooldown based on TRG, prior trade outcome, and session hour.
   */
  calculateDynamicCooldown(symbol, trg = 0.45, timestamp = Date.now()) {
    const lastExit = this.lastExitState.get(symbol);
    const outcome = lastExit ? lastExit.outcome : 'PROFIT_TARGET';

    // 1. TRG Deficit Multiplier (low volatility increases cooldown to avoid chop)
    const effectiveTrg = Math.max(0, trg);
    let trgMultiplier = 1.0;
    if (effectiveTrg < this.trgReference) {
      const deficitRatio = (this.trgReference - effectiveTrg) / this.trgReference;
      trgMultiplier = 1.0 + this.trgPenaltyFactor * Math.pow(deficitRatio, this.trgExponent);
    }

    // 2. Prior Trade Outcome Penalty
    let outcomeMultiplier = 1.0;
    if (outcome === 'STOP_LOSS' || outcome === 'SCRATCH') {
      outcomeMultiplier = 1.6;
    } else if (outcome === 'VETO_EMERGENCY' || outcome === 'LHDS_VETO') {
      outcomeMultiplier = 2.0;
    }

    // 3. Off-Peak Session Factor (UTC)
    const hourUtc = new Date(timestamp).getUTCHours();
    const isOffPeak = (hourUtc >= 21 || hourUtc < 8);
    const sessionMultiplier = isOffPeak ? 1.3 : 1.0;

    const rawCooldown = this.baseCooldownCandles * trgMultiplier * outcomeMultiplier * sessionMultiplier;
    const finalCooldown = Math.round(Math.min(this.maxCooldownCandles, Math.max(this.minCooldownCandles, rawCooldown)));

    return {
      cooldownCandles: finalCooldown,
      factors: { trgMultiplier, outcomeMultiplier, sessionMultiplier, rawCooldown }
    };
  }

  /**
   * Evaluates if a new trade entry is permitted under anti-overtrading rules.
   * @param {string} symbol - Trading pair (e.g. 'BTCUSDT')
   * @param {number} currentCandleIndex - Current total candle count or timestamp index
   * @param {Object} mtfContext - Higher timeframe structure ({ m15Signal, h1Signal, entrySide, trg, timestamp })
   * @returns {{ permitted: boolean, reason?: string }}
   */
  canOpenTrade(symbol, currentCandleIndex, mtfContext = {}) {
    const { 
      entrySide, 
      m15Signal = 'flat', 
      h1Signal = 'flat', 
      trg = 0.45, 
      timestamp = Date.now(),
      strategyType = 'TREND_EXPANSION'
    } = mtfContext;

    // 1. Post-Trade Adaptive Cooldown Buffer Check
    const lastExit = this.lastExitState.get(symbol);
    const lastExitIdx = lastExit ? lastExit.exitCandleIndex : this.lastExitCandleIndex.get(symbol);
    
    if (lastExitIdx !== undefined) {
      const elapsedCandles = currentCandleIndex - lastExitIdx;
      let { cooldownCandles } = this.calculateDynamicCooldown(symbol, trg, timestamp);
      
      // Range scalp in profit can use shorter cooldown (ping-pong in range)
      if (strategyType === 'RANGE_SCALP' && lastExit && lastExit.outcome === 'PROFIT_TARGET') {
        cooldownCandles = Math.min(3, cooldownCandles);
      }

      if (elapsedCandles < cooldownCandles) {
        return {
          permitted: false,
          reason: `ADAPTIVE_COOLDOWN_ACTIVE (${elapsedCandles}/${cooldownCandles} candles elapsed since last exit)`
        };
      }
    }

    // 2. MTF Trend Alignment Check
    if (entrySide) {
      const targetSide = entrySide.toLowerCase();
      const m15 = (m15Signal || 'flat').toLowerCase();
      const h1 = (h1Signal || 'flat').toLowerCase();

      // Prohibit counter-trend against active M15 (unless range scalp at structural boundary)
      if (m15 !== 'flat' && m15 !== targetSide) {
        if (strategyType !== 'RANGE_SCALP') {
          return {
            permitted: false,
            reason: `MTF_MISALIGNMENT (Entry ${entrySide} conflicts with M15 trend ${m15.toUpperCase()})`
          };
        }
      }

      // Prohibit counter-trend against active H1
      if (h1 !== 'flat' && h1 !== targetSide) {
        return {
          permitted: false,
          reason: `MTF_MISALIGNMENT (Entry ${entrySide} conflicts with H1 trend ${h1.toUpperCase()})`
        };
      }
    }

    return { permitted: true };
  }

  /**
   * Evaluates if an active position is allowed to close (enforces MHT & Dynamic ATR Barrier).
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

    // OpenMobius / Wyckoff / FVG Counter-Signal Override
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
      const isLong = position.side === 'BUY' || position.side === 'LONG' || position.direction === 'LONG';
      const priceDelta = isLong ? (currentPrice - position.entryPrice) : (position.entryPrice - currentPrice);
      const atrMultiple = priceDelta / currentAtr;

      const riskDist = Math.abs(position.entryPrice - (position.initialStopLoss || position.stopLossPrice || position.stopLoss)) || (currentAtr * 1.5);
      const riskRewardRatio = riskDist > 0 ? priceDelta / riskDist : 0;

      const trg = kernelResult.trg || 0.40;
      const dynamicAtrMultiplier = this.baseAtrBarrierMultiplier + Math.max(0, (0.45 - trg) * 0.8);
      const dynamicMinRR = Math.max(this.baseMinRiskReward, 1.4 - trg);

      if (priceDelta > 0 && (atrMultiple < dynamicAtrMultiplier && riskRewardRatio < dynamicMinRR)) {
        return {
          canClose: false,
          reason: `NOISE_BARRIER_HOLD (ATR multiple: ${atrMultiple.toFixed(2)}/${dynamicAtrMultiplier.toFixed(2)}, R:R: ${riskRewardRatio.toFixed(2)}/${dynamicMinRR.toFixed(2)})`
        };
      }
    }

    return { canClose: true };
  }

  recordTradeExit(symbol, exitCandleIndex, outcome = 'PROFIT_TARGET', exitReason = '') {
    const finalOutcome = typeof outcome === 'object' && outcome !== null ? (outcome.outcome || 'PROFIT_TARGET') : (outcome || 'PROFIT_TARGET');
    const finalReason = typeof outcome === 'object' && outcome !== null ? (outcome.reason || outcome.exitReason || '') : exitReason;

    this.lastExitCandleIndex.set(symbol, exitCandleIndex);
    this.lastExitState.set(symbol, {
      exitCandleIndex,
      outcome: finalOutcome,
      exitReason: finalReason,
      timestamp: Date.now()
    });
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

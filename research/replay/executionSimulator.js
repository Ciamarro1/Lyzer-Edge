/**
 * @fileoverview Execution Simulator for Replay Engine
 * Replaces ExchangeExecution in replay mode.
 * Models fees, slippage, and partial fills deterministically.
 * 
 * RULE: No network calls. No randomness. Pure deterministic simulation.
 */

export class ExecutionSimulator {
  constructor(config = {}) {
    this.takerFeePct = config.takerFeePct ?? 0.001;   // 0.1% Binance taker
    this.makerFeePct = config.makerFeePct ?? 0.001;   // 0.1% Binance maker
    this.slippagePct = config.slippagePct ?? 0.0002;  // 0.02% pessimistic default
    this.fillRate = config.fillRate ?? 1.0;            // 100% fill by default
    this.orderLog = [];
  }

  /**
   * Simulates a market order fill with fees and slippage.
   * @param {string} side - 'BUY' or 'SELL'
   * @param {number} price - Intended fill price
   * @param {number} quantity - Order quantity
   * @param {number} timestamp - Order timestamp
   * @returns {Object} Fill result
   */
  simulateMarketOrder(side, price, quantity, timestamp) {
    // Apply slippage: always adverse
    const slippageDirection = side === 'BUY' ? 1 : -1;
    const fillPrice = price * (1 + slippageDirection * this.slippagePct);
    
    // Apply fill rate
    const filledQuantity = quantity * this.fillRate;
    
    // Calculate notional and fees
    const notional = fillPrice * filledQuantity;
    const fee = notional * this.takerFeePct;
    
    const fill = {
      side,
      requestedPrice: price,
      fillPrice,
      slippage: Math.abs(fillPrice - price),
      slippagePct: this.slippagePct,
      quantity: filledQuantity,
      notional,
      fee,
      netNotional: side === 'BUY' ? notional + fee : notional - fee,
      timestamp,
      status: 'FILLED_SIMULATED',
    };
    
    this.orderLog.push(fill);
    return fill;
  }

  /**
   * Calculates realistic PnL for a closed trade including all costs.
   * @param {Object} trade - Trade object with entry/exit details
   * @returns {Object} PnL breakdown
   */
  calculatePnL(trade) {
    const { direction, entryPrice, exitPrice, notional, scaleOutHistory } = trade;
    const initialQuantity = notional / entryPrice;
    
    // Entry cost (always taker for market orders)
    const entrySlippage = direction === 'LONG' ? 1 + this.slippagePct : 1 - this.slippagePct;
    const effectiveEntry = entryPrice * entrySlippage;
    const entryFee = (effectiveEntry * initialQuantity) * this.takerFeePct;
    
    let totalExitFee = 0;
    let totalGrossPnL = 0;
    let remainingQuantity = initialQuantity;

    // Process Scale-Outs
    if (scaleOutHistory && scaleOutHistory.length > 0) {
      for (const scaleOut of scaleOutHistory) {
        // Fallback to proportional quantity if scaleOut.qty is missing
        const trancheQty = scaleOut.qty || (initialQuantity / (scaleOutHistory.length + 1));
        remainingQuantity -= trancheQty;
        
        // Tranche exit cost
        const trancheExitSlippage = direction === 'LONG' ? 1 - this.slippagePct : 1 + this.slippagePct;
        const trancheEffectiveExit = scaleOut.price * trancheExitSlippage;
        const trancheExitFee = (trancheEffectiveExit * trancheQty) * this.takerFeePct;
        totalExitFee += trancheExitFee;

        // Tranche Gross PnL
        const trancheGross = direction === 'LONG'
          ? (trancheEffectiveExit - effectiveEntry) * trancheQty
          : (effectiveEntry - trancheEffectiveExit) * trancheQty;
        totalGrossPnL += trancheGross;
      }
    }

    // Process Final Tranche
    if (remainingQuantity > 0.00000001) {
      const exitSlippage = direction === 'LONG' ? 1 - this.slippagePct : 1 + this.slippagePct;
      const effectiveExit = exitPrice * exitSlippage;
      const finalExitFee = (effectiveExit * remainingQuantity) * this.takerFeePct;
      totalExitFee += finalExitFee;
      
      const finalGross = direction === 'LONG'
        ? (effectiveExit - effectiveEntry) * remainingQuantity
        : (effectiveEntry - effectiveExit) * remainingQuantity;
      totalGrossPnL += finalGross;
    }

    const totalFees = entryFee + totalExitFee;
    const netPnL = totalGrossPnL - totalFees;
    
    // Return percentage based on initial notional
    const returnPct = netPnL / notional;
    
    return {
      grossPnL: totalGrossPnL,
      netPnL,
      totalFees,
      entryFee,
      exitFee: totalExitFee,
      effectiveEntry,
      effectiveExit: exitPrice, // Keep final exit price as reference
      returnPct,
      notional,
      quantity: initialQuantity,
    };
  }

  /**
   * Returns summary statistics for all simulated orders.
   */
  getSummary() {
    const totalFees = this.orderLog.reduce((s, o) => s + o.fee, 0);
    const totalSlippage = this.orderLog.reduce((s, o) => s + o.slippage * o.quantity, 0);
    return {
      totalOrders: this.orderLog.length,
      totalFees,
      totalSlippage,
      orders: this.orderLog,
    };
  }

  reset() {
    this.orderLog = [];
  }
}

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
    const { direction, entryPrice, exitPrice, notional } = trade;
    const quantity = notional / entryPrice;
    
    // Entry cost (always taker for market orders)
    const entrySlippage = direction === 'LONG' ? 1 + this.slippagePct : 1 - this.slippagePct;
    const effectiveEntry = entryPrice * entrySlippage;
    const entryFee = (effectiveEntry * quantity) * this.takerFeePct;
    
    // Exit cost
    const exitSlippage = direction === 'LONG' ? 1 - this.slippagePct : 1 + this.slippagePct;
    const effectiveExit = exitPrice * exitSlippage;
    const exitFee = (effectiveExit * quantity) * this.takerFeePct;
    
    // Gross PnL
    const grossPnL = direction === 'LONG'
      ? (effectiveExit - effectiveEntry) * quantity
      : (effectiveEntry - effectiveExit) * quantity;
    
    // Net PnL
    const totalFees = entryFee + exitFee;
    const netPnL = grossPnL - totalFees;
    
    // Return percentage
    const returnPct = netPnL / notional;
    
    return {
      grossPnL,
      netPnL,
      totalFees,
      entryFee,
      exitFee,
      effectiveEntry,
      effectiveExit,
      returnPct,
      notional,
      quantity,
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

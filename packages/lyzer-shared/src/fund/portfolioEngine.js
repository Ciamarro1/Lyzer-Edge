/**
 * @fileoverview Portfolio Engine
 * Manages risk limits, equity tracking, ledger attribution, and signal evaluation logic.
 */

export class PortfolioEngine {
  constructor(config = {}) {
    this.initialEquity = config.initialEquity || 10000;
    this.equity = this.initialEquity;
    this.cash = this.initialEquity;
    
    this.baseRiskPct = config.baseRiskPct || 1.0;
    this.maxRiskPct = config.maxRiskPct || 3.0;
    this.riskLimits = config.riskLimits || {};
    
    this.positions = new Map();
    this.currentDrawdown = 0;
    
    this._halted = false;
    this._posIdCounter = 0;
    
    this._ledger = {
      entries: [],
      getSummary: () => {
        let totalPnl = 0;
        let wins = 0;
        let closedTrades = 0;
        
        for (const entry of this._ledger.entries) {
          if (entry.type === 'CLOSE') {
            closedTrades++;
            totalPnl += entry.netPnl;
            if (entry.netPnl > 0) wins++;
          }
        }
        
        return {
          totalEntries: this._ledger.entries.length,
          closedTrades,
          totalPnl,
          winRate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0
        };
      },
      getModuleAttribution: () => {
        let attr = {};
        for (const entry of this._ledger.entries) {
          if (entry.type === 'OPEN' && entry.signalType) {
             if (!attr[entry.signalType]) attr[entry.signalType] = { count: 0 };
             attr[entry.signalType].count++;
          }
        }
        return attr;
      }
    };
    
    this._equityCurve = [{ equity: this.equity, timestamp: Date.now() }];
  }
  
  evaluateSignal(signal, candle, context = {}) {
    if (this._halted) {
      return { action: 'REJECT', reasons: ['SYSTEM_HALTED'] };
    }
    
    if (signal.signal !== 'go') {
      return { action: 'REJECT', reasons: ['SIGNAL_NOT_ACTIONABLE'] };
    }
    
    const entryPrice = candle.close;
    const direction = 'LONG'; // Derived from signal in a real system
    const maxPosSize = this.riskLimits.maxPositionSize || 0.05;
    const quantity = (this.equity * maxPosSize) / entryPrice;
    const stopDistance = context.stopDistance || 0.02;
    
    let stopLoss = 0;
    if (direction === 'LONG') {
      stopLoss = entryPrice * (1 - stopDistance);
    } else {
      stopLoss = entryPrice * (1 + stopDistance);
    }
    
    return {
      action: 'OPEN',
      tradeIntent: {
        direction,
        symbol: context.symbol || 'UNKNOWN',
        quantity,
        stopLoss,
        signalType: context.signalType || 'UNKNOWN'
      },
      reasons: []
    };
  }

  openPosition(tradeIntent, entryPrice, entryFees, exchangeId) {
    this._posIdCounter++;
    const posId = 'pos_' + this._posIdCounter;
    
    const pos = {
      id: posId,
      entryPrice,
      direction: tradeIntent.direction,
      symbol: tradeIntent.symbol,
      quantity: tradeIntent.quantity,
      stopLoss: tradeIntent.stopLoss,
      entryFees,
      exchangeId,
      signalType: tradeIntent.signalType,
      currentPrice: entryPrice,
      unrealizedPnl: 0
    };
    
    this.positions.set(posId, pos);
    
    // In spot, cash covers the asset cost + fees
    // For this generic model, we deduct fees from cash and track position value
    this.cash -= entryFees;
    
    this._ledger.entries.push({ type: 'OPEN', posId, signalType: tradeIntent.signalType });
    return pos;
  }

  updateMarks(prices) {
    for (let [posId, pos] of this.positions.entries()) {
      if (prices[pos.symbol]) {
        pos.currentPrice = prices[pos.symbol];
        if (pos.direction === 'LONG') {
          pos.unrealizedPnl = (pos.currentPrice - pos.entryPrice) * pos.quantity;
        } else {
          pos.unrealizedPnl = (pos.entryPrice - pos.currentPrice) * pos.quantity;
        }
      }
    }
    
    // Equity = cash + (value of assets) = cash + (entryCost + unrealizedPnl)
    let totalPosValue = 0;
    for (let pos of this.positions.values()) {
      totalPosValue += (pos.entryPrice * pos.quantity) + pos.unrealizedPnl;
    }
    
    this.equity = this.cash + totalPosValue;
    this._equityCurve.push({ equity: this.equity, timestamp: Date.now() });
  }

  checkExits(prices) {
    let exits = [];
    for (let [posId, pos] of this.positions.entries()) {
      if (prices[pos.symbol]) {
        const currentPrice = prices[pos.symbol];
        if (pos.direction === 'LONG' && currentPrice <= pos.stopLoss) {
          exits.push({ reason: 'STOP_LOSS', posId });
        } else if (pos.direction === 'SHORT' && currentPrice >= pos.stopLoss) {
          exits.push({ reason: 'STOP_LOSS', posId });
        }
      }
    }
    return exits;
  }

  closePosition(posId, exitPrice, exitFees, exchangeId) {
    const pos = this.positions.get(posId);
    if (!pos) return null;
    
    let grossPnl = 0;
    if (pos.direction === 'LONG') {
      grossPnl = (exitPrice - pos.entryPrice) * pos.quantity;
    } else {
      grossPnl = (pos.entryPrice - exitPrice) * pos.quantity;
    }
    
    const totalFees = pos.entryFees + exitFees;
    const netPnl = grossPnl - totalFees;
    
    // Initial risk taken per unit
    const initialRiskPerUnit = Math.abs(pos.entryPrice - pos.stopLoss);
    const rMultiple = initialRiskPerUnit > 0 ? (grossPnl / (initialRiskPerUnit * pos.quantity)) : 0;
    
    this.positions.delete(posId);
    
    // Liquidate: return position cost back to cash + grossPnl - exitFees
    this.cash += (pos.entryPrice * pos.quantity) + grossPnl - exitFees;
    
    // Re-evaluate equity strictly on remaining cash & positions
    let totalPosValue = 0;
    for (let p of this.positions.values()) {
      totalPosValue += (p.entryPrice * p.quantity) + p.unrealizedPnl;
    }
    this.equity = this.cash + totalPosValue;
    this._equityCurve.push({ equity: this.equity, timestamp: Date.now() });
    
    this._ledger.entries.push({ type: 'CLOSE', posId, netPnl, grossPnl, totalFees });
    
    return { grossPnl, netPnl, rMultiple, totalFees };
  }
  
  getLedger() {
    return this._ledger;
  }

  emergencyHalt(reason) {
    this._halted = true;
  }

  resume() {
    this._halted = false;
  }

  getEquityCurve() {
    return this._equityCurve;
  }

  getState() {
    return {
      equity: this.equity,
      constitution: this.riskLimits,
      ledgerSummary: this._ledger.getSummary(),
      openPositionCount: this.positions.size
    };
  }
}

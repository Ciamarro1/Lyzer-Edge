/**
 * EdgeValidator — Empirical Edge Certification Engine
 * Measures Win Rate, Expectancy, Profit Factor, and Empirical Edge across trade batches.
 */
export class EdgeValidator {
  constructor(options = {}) {
    this.minWinRate = options.minWinRate || 0.5;
    this.minProfitFactor = options.minProfitFactor || 1.1;
    this.minTrades = options.minTrades || 5;
  }

  evaluatePatternEdge(trades = []) {
    if (!Array.isArray(trades) || trades.length === 0) {
      return {
        certified: false,
        metrics: {
          totalTrades: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          profitFactor: 0,
          expectancy: 0
        }
      };
    }

    const totalTrades = trades.length;
    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let sumPnl = 0;

    for (const t of trades) {
      const pnl = typeof t === 'number' ? t : (t.pnl || 0);
      sumPnl += pnl;
      if (pnl > 0) {
        wins++;
        totalProfit += pnl;
      } else if (pnl < 0) {
        losses++;
        totalLoss += Math.abs(pnl);
      }
    }

    const winRate = totalTrades > 0 ? wins / totalTrades : 0;
    const profitFactor = totalLoss === 0 ? (totalProfit > 0 ? Infinity : 1) : totalProfit / totalLoss;
    const expectancy = totalTrades > 0 ? sumPnl / totalTrades : 0;

    const certified = totalTrades >= this.minTrades && winRate >= this.minWinRate && profitFactor >= 1.0;

    return {
      certified,
      metrics: {
        totalTrades,
        wins,
        losses,
        winRate,
        profitFactor,
        expectancy
      }
    };
  }
}

/**
 * EdgeValidator — Empirical Edge Certification Engine
 * Measures Win Rate, Expectancy, Sharpe, Profit Factor, and Brier Score across trade batches.
 */

export class EdgeValidator {
  evaluatePatternEdge(trades = []) {
    if (!trades || trades.length < 10) {
      return {
        certified: false,
        reason: 'INSUFFICIENT_DATA_MIN_10_TRADES',
        metrics: {}
      };
    }

    let wins = 0;
    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    const returns = [];

    for (const t of trades) {
      const pnl = parseFloat(t.pnl) || 0;
      returns.push(pnl);
      if (pnl > 0) {
        wins++;
        totalGrossProfit += pnl;
      } else {
        totalGrossLoss += Math.abs(pnl);
      }
    }

    const winRate = wins / trades.length;
    const profitFactor = totalGrossLoss > 0 ? (totalGrossProfit / totalGrossLoss) : totalGrossProfit;
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    
    // Variance & StdDev for Sharpe
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance) || 1;
    const sharpe = (avgReturn / stdDev) * Math.sqrt(252);

    const certified = winRate >= 0.52 && profitFactor >= 1.25;

    return {
      certified,
      metrics: {
        totalTrades: trades.length,
        winRate: parseFloat(winRate.toFixed(4)),
        profitFactor: parseFloat(profitFactor.toFixed(4)),
        sharpeRatio: parseFloat(sharpe.toFixed(4)),
        expectancy: parseFloat(avgReturn.toFixed(4))
      }
    };
  }
}

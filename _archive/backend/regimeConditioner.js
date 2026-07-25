/**
 * ARL v2 Regime Conditioner
 * Assesses signal performance conditioned to different market regimes.
 */

export class RegimeConditioner {
  analyze(trades) {
    const regimeStats = {
      trend_up: { wins: 0, total: 0, pnl: 0 },
      trend_down: { wins: 0, total: 0, pnl: 0 },
      low_vol: { wins: 0, total: 0, pnl: 0 },
      chop: { wins: 0, total: 0, pnl: 0 }
    };

    trades.forEach(t => {
      const r = t.regime || "chop";
      if (!regimeStats[r]) {
        regimeStats[r] = { wins: 0, total: 0, pnl: 0 };
      }
      regimeStats[r].total++;
      regimeStats[r].pnl += t.netPnl;
      if (t.netPnl > 0) {
        regimeStats[r].wins++;
      }
    });

    const conditioning = {};
    Object.entries(regimeStats).forEach(([regimeName, stats]) => {
      const prob = stats.total > 0 ? stats.wins / stats.total : 0;
      const avgPnl = stats.total > 0 ? stats.pnl / stats.total : 0;
      conditioning[regimeName] = {
        successProbability: Number(prob.toFixed(4)),
        avgPnl: Number(avgPnl.toFixed(6)),
        totalTrades: stats.total,
        score: Number((avgPnl * prob).toFixed(6))
      };
    });

    return conditioning;
  }
}

/**
 * @fileoverview Alpha Discovery Engine for Lyzer Quant Research Lab.
 * Aggregates quantitative trade patterns and metrics across ALL experiments
 * to discover feature attributions (LONG vs SHORT, Symbols, Regimes, TP/SL parameters).
 */

export class AlphaDiscoveryEngine {
  /**
   * @param {Object} db - CausalMemoryDB instance.
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Performs cross-experiment analysis to discover what parameters & conditions drive alpha.
   *
   * @returns {Promise<Object>} Comprehensive Alpha Discovery analysis result.
   */
  async discoverAlpha() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          symbol,
          direction,
          regime,
          take_profit,
          stop_loss,
          pnl,
          status,
          experiment_id
        FROM experiment_trades
        WHERE status = 'closed'
      `;

      this.db.db.all(sql, [], async (err, rows) => {
        if (err) return reject(err);

        if (!rows || rows.length === 0) {
          return resolve({
            totalExperiments: 0,
            totalTradesAnalyzed: 0,
            directionBreakdown: {},
            symbolBreakdown: {},
            regimeBreakdown: {},
            tpBreakdown: {},
            topFactors: [],
            conclusionSummary: 'Dados insuficientes para descoberta de Alpha (nenhum trade fechado registrado).'
          });
        }

        const experiments = await this.db.getAllExperiments();
        const totalExperiments = experiments.length;
        const totalTrades = rows.length;

        // 1. Direction Breakdown (LONG vs SHORT)
        const directionStats = { LONG: { trades: 0, pnlSum: 0, wins: 0 }, SHORT: { trades: 0, pnlSum: 0, wins: 0 } };

        // 2. Symbol Breakdown
        const symbolStats = {};

        // 3. Regime Breakdown
        const regimeStats = {};

        // 4. TakeProfit Breakdown
        const tpStats = {};

        for (const trade of rows) {
          const dir = (trade.direction || 'LONG').toUpperCase();
          const sym = trade.symbol || 'UNKNOWN';
          const reg = trade.regime || 'GENERAL';
          const pnl = Number(trade.pnl) || 0;
          const isWin = pnl > 0;

          // Direction
          if (!directionStats[dir]) directionStats[dir] = { trades: 0, pnlSum: 0, wins: 0 };
          directionStats[dir].trades++;
          directionStats[dir].pnlSum += pnl;
          if (isWin) directionStats[dir].wins++;

          // Symbol
          if (!symbolStats[sym]) symbolStats[sym] = { trades: 0, pnlSum: 0, wins: 0 };
          symbolStats[sym].trades++;
          symbolStats[sym].pnlSum += pnl;
          if (isWin) symbolStats[sym].wins++;

          // Regime
          if (!regimeStats[reg]) regimeStats[reg] = { trades: 0, pnlSum: 0, wins: 0 };
          regimeStats[reg].trades++;
          regimeStats[reg].pnlSum += pnl;
          if (isWin) regimeStats[reg].wins++;

          // TP Range
          const tpPct = trade.take_profit ? (trade.take_profit > 1 ? `${Math.round(trade.take_profit)}%` : `${(trade.take_profit * 100).toFixed(1)}%`) : 'DYNAMIC';
          if (!tpStats[tpPct]) tpStats[tpPct] = { trades: 0, pnlSum: 0, wins: 0 };
          tpStats[tpPct].trades++;
          tpStats[tpPct].pnlSum += pnl;
          if (isWin) tpStats[tpPct].wins++;
        }

        // Format summaries
        const formatGroup = (group) => {
          const res = {};
          for (const [key, data] of Object.entries(group)) {
            const winRate = data.trades > 0 ? (data.wins / data.trades) * 100 : 0;
            const avgPnlPct = data.trades > 0 ? (data.pnlSum / data.trades) * 100 : 0;
            const totalPnlPct = data.pnlSum * 100;
            res[key] = {
              trades: data.trades,
              winRate: Math.round(winRate * 10) / 10,
              avgPnlPct: Math.round(avgPnlPct * 100) / 100,
              totalPnlPct: Math.round(totalPnlPct * 10) / 10
            };
          }
          return res;
        };

        const formattedDirection = formatGroup(directionStats);
        const formattedSymbol = formatGroup(symbolStats);
        const formattedRegime = formatGroup(regimeStats);
        const formattedTp = formatGroup(tpStats);

        // Extract Top Factors for Synthesis
        const topSymbols = Object.entries(formattedSymbol)
          .sort((a, b) => b[1].totalPnlPct - a[1].totalPnlPct)
          .slice(0, 3)
          .map(([sym, stats]) => `${sym} (${stats.totalPnlPct >= 0 ? '+' : ''}${stats.totalPnlPct}%)`);

        const bestDirection = Object.entries(formattedDirection)
          .sort((a, b) => b[1].totalPnlPct - a[1].totalPnlPct)[0];

        const bestRegime = Object.entries(formattedRegime)
          .sort((a, b) => b[1].totalPnlPct - a[1].totalPnlPct)[0];

        const bestTp = Object.entries(formattedTp)
          .sort((a, b) => b[1].totalPnlPct - a[1].totalPnlPct)[0];

        const topFactors = [
          bestDirection ? `Direção Principal: ${bestDirection[0]} (${bestDirection[1].totalPnlPct >= 0 ? '+' : ''}${bestDirection[1].totalPnlPct}%)` : null,
          topSymbols.length > 0 ? `Melhores Ativos: ${topSymbols.join(', ')}` : null,
          bestRegime ? `Regime Ideal: ${bestRegime[0]} (${bestRegime[1].totalPnlPct >= 0 ? '+' : ''}${bestRegime[1].totalPnlPct}%)` : null,
          bestTp ? `Parâmetro TP Ideal: ${bestTp[0]} (${bestTp[1].totalPnlPct >= 0 ? '+' : ''}${bestTp[1].totalPnlPct}%)` : null
        ].filter(Boolean);

        const conclusionSummary = `As estratégias mais lucrativas no histórico de ${totalExperiments} experimentos (${totalTrades} trades) possuem: ${topFactors.join(' | ')}.`;

        resolve({
          totalExperiments,
          totalTradesAnalyzed: totalTrades,
          directionBreakdown: formattedDirection,
          symbolBreakdown: formattedSymbol,
          regimeBreakdown: formattedRegime,
          tpBreakdown: formattedTp,
          topFactors,
          conclusionSummary
        });
      });
    });
  }
}

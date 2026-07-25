import { calcAllStats } from './stats.js';

/**
 * Analyzes behavioral patterns from a sequence of trades.
 * 
 * @param {Array} trades 
 * @returns {Object} Behavioral statistics
 */
export function analyzeBehavior(trades) {
  if (!trades || trades.length === 0) return null;
  
  const closed = trades.filter(t => t.status === 'closed');
  if (closed.length === 0) return null;
  
  // Performance by Day of Week
  const byDayOfWeek = { 0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[] };
  closed.forEach(t => {
    const d = new Date(t.entryDate || t.exitDate);
    if (!isNaN(d.getTime())) {
      byDayOfWeek[d.getDay()].push(t);
    }
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = dayNames.map((name, i) => {
    const dTrades = byDayOfWeek[i];
    const stats = calcAllStats(dTrades);
    return { day: name, trades: dTrades.length, winRate: stats.winRate, pnl: stats.totalPnl };
  });

  // Tilt Analysis (performance after a loss vs performance after a win)
  // Assumes trades are ordered chronologically
  const sorted = [...closed].sort((a,b) => new Date(a.entryDate) - new Date(b.entryDate));
  const afterWin = [];
  const afterLoss = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i-1];
    const curr = sorted[i];
    if (prev.result === 'win') {
      afterWin.push(curr);
    } else if (prev.result === 'loss') {
      afterLoss.push(curr);
    }
  }

  const tiltStats = {
    afterWin: calcAllStats(afterWin),
    afterLoss: calcAllStats(afterLoss),
    afterWinTrades: afterWin.length,
    afterLossTrades: afterLoss.length
  };

  return { dayStats, tiltStats };
}
 
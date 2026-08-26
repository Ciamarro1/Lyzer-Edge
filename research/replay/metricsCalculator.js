/**
 * @fileoverview Metrics Calculator for Replay Engine
 * Computes ALL metrics required by the research meta-prompt.
 * Pure, deterministic, no side effects.
 */

export class MetricsCalculator {
  /**
   * Computes comprehensive metrics from a trade ledger.
   * @param {Array<Object>} trades - Array of closed trade objects
   * @param {Object} config - { initialCapital, startTime, endTime }
   * @returns {Object} Complete metrics report
   */
  static compute(trades, config = {}) {
    const initialCapital = config.initialCapital || 10000;
    
    if (!trades || trades.length === 0) {
      return MetricsCalculator._emptyReport();
    }

    // --- Basic Counts ---
    const total = trades.length;
    const wins = trades.filter(t => t.netPnL > 0);
    const losses = trades.filter(t => t.netPnL <= 0);
    const longs = trades.filter(t => t.direction === 'LONG' || t.direction === 'BUY');
    const shorts = trades.filter(t => t.direction === 'SHORT' || t.direction === 'SELL');
    
    // --- PnL ---
    const grossProfit = wins.reduce((s, t) => s + t.netPnL, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnL, 0));
    const netPnL = grossProfit - grossLoss;
    const totalFees = trades.reduce((s, t) => s + (t.totalFees || 0), 0);
    
    // --- Rates ---
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const expectancy = total > 0 ? netPnL / total : 0;
    
    // --- Averages ---
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    
    // --- Hold Times ---
    const holdTimes = trades
      .filter(t => t.exitTime && t.entryTime)
      .map(t => (t.exitTime - t.entryTime) / 60000); // minutes
    const avgHoldTime = holdTimes.length > 0 ? holdTimes.reduce((s, t) => s + t, 0) / holdTimes.length : 0;
    const medianHoldTime = holdTimes.length > 0 ? MetricsCalculator._median(holdTimes) : 0;
    
    // --- Drawdown ---
    const { maxDrawdown, maxDrawdownPct, equityCurve } = MetricsCalculator._computeDrawdown(trades, initialCapital);
    const returnOverDD = maxDrawdownPct > 0 ? (netPnL / initialCapital * 100) / maxDrawdownPct : 0;
    
    // --- MAE / MFE ---
    const maes = trades.filter(t => t.mae != null).map(t => t.mae);
    const mfes = trades.filter(t => t.mfe != null).map(t => t.mfe);
    const avgMAE = maes.length > 0 ? maes.reduce((s, v) => s + v, 0) / maes.length : null;
    const avgMFE = mfes.length > 0 ? mfes.reduce((s, v) => s + v, 0) / mfes.length : null;
    
    // --- Long/Short Breakdown ---
    const longPnL = longs.reduce((s, t) => s + (t.netPnL || 0), 0);
    const shortPnL = shorts.reduce((s, t) => s + (t.netPnL || 0), 0);

    // --- Exposure ---
    const totalMinutes = config.endTime && config.startTime 
      ? (config.endTime - config.startTime) / 60000 
      : null;
    const exposureMinutes = holdTimes.reduce((s, t) => s + t, 0);
    const exposurePct = totalMinutes ? (exposureMinutes / totalMinutes) * 100 : null;

    return {
      // Counts
      trades: total,
      wins: wins.length,
      losses: losses.length,
      winRate: round(winRate, 2),
      
      // PnL
      grossProfit: round(grossProfit, 2),
      grossLoss: round(grossLoss, 2),
      netPnL: round(netPnL, 2),
      totalFees: round(totalFees, 4),
      profitFactor: round(profitFactor, 2),
      expectancy: round(expectancy, 4),
      
      // Averages
      avgWin: round(avgWin, 2),
      avgLoss: round(avgLoss, 2),
      
      // Drawdown
      maxDrawdown: round(maxDrawdown, 2),
      maxDrawdownPct: round(maxDrawdownPct, 2),
      returnOverDD: round(returnOverDD, 2),
      
      // Hold Time
      avgHoldTimeMin: round(avgHoldTime, 1),
      medianHoldTimeMin: round(medianHoldTime, 1),
      
      // Direction Breakdown
      longTrades: longs.length,
      shortTrades: shorts.length,
      longPnL: round(longPnL, 2),
      shortPnL: round(shortPnL, 2),
      
      // MAE/MFE
      avgMAE: avgMAE != null ? round(avgMAE, 4) : null,
      avgMFE: avgMFE != null ? round(avgMFE, 4) : null,

      // Exposure
      exposurePct: exposurePct != null ? round(exposurePct, 2) : null,
      
      // Equity
      equityCurve,
    };
  }

  static _computeDrawdown(trades, initialCapital) {
    let equity = initialCapital;
    let peak = equity;
    let maxDD = 0;
    let maxDDPct = 0;
    const curve = [{ equity, timestamp: trades[0]?.entryTime || 0 }];
    
    for (const t of trades) {
      equity += t.netPnL || 0;
      curve.push({ equity, timestamp: t.exitTime || t.entryTime || 0 });
      
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      if (ddPct > maxDDPct) maxDDPct = ddPct;
    }
    
    return { maxDrawdown: maxDD, maxDrawdownPct: maxDDPct, equityCurve: curve };
  }

  static _median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  static _emptyReport() {
    return {
      trades: 0, wins: 0, losses: 0, winRate: 0,
      grossProfit: 0, grossLoss: 0, netPnL: 0, totalFees: 0,
      profitFactor: 0, expectancy: 0,
      avgWin: 0, avgLoss: 0,
      maxDrawdown: 0, maxDrawdownPct: 0, returnOverDD: 0,
      avgHoldTimeMin: 0, medianHoldTimeMin: 0,
      longTrades: 0, shortTrades: 0, longPnL: 0, shortPnL: 0,
      avgMAE: null, avgMFE: null, exposurePct: null,
      equityCurve: [],
    };
  }

  /**
   * Formats a metrics report for console output (meta-prompt format).
   */
  static formatReport(metrics, label = 'REPORT') {
    const lines = [
      '='.repeat(50),
      `  ${label}`,
      '='.repeat(50),
      `  Trades:          ${metrics.trades}`,
      `  Win Rate:        ${metrics.winRate}%`,
      `  Gross Profit:    $${metrics.grossProfit}`,
      `  Gross Loss:      $${metrics.grossLoss}`,
      `  Net PnL:         $${metrics.netPnL}`,
      `  Profit Factor:   ${metrics.profitFactor}`,
      `  Expectancy:      $${metrics.expectancy}/trade`,
      `  Avg Win:         $${metrics.avgWin}`,
      `  Avg Loss:        $${metrics.avgLoss}`,
      `  Max Drawdown:    $${metrics.maxDrawdown} (${metrics.maxDrawdownPct}%)`,
      `  Return/DD:       ${metrics.returnOverDD}`,
      `  Fees:            $${metrics.totalFees}`,
      `  Exposure:        ${metrics.exposurePct != null ? metrics.exposurePct + '%' : 'N/A'}`,
      `  Avg Hold:        ${metrics.avgHoldTimeMin} min`,
      `  Median Hold:     ${metrics.medianHoldTimeMin} min`,
      `  Long Trades:     ${metrics.longTrades} ($${metrics.longPnL})`,
      `  Short Trades:    ${metrics.shortTrades} ($${metrics.shortPnL})`,
      `  MAE (avg):       ${metrics.avgMAE ?? 'N/A'}`,
      `  MFE (avg):       ${metrics.avgMFE ?? 'N/A'}`,
      '='.repeat(50),
    ];
    return lines.join('\n');
  }
}

function round(val, decimals) {
  if (val === Infinity || val === -Infinity) return val;
  if (isNaN(val)) return 0;
  return parseFloat(val.toFixed(decimals));
}

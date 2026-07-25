/**
 * Lyzer Edge Analyst — Core Statistical Calculations
 *
 * All functions are pure (input → output, no side effects).
 * Every public function handles empty arrays, single trades,
 * and division-by-zero gracefully.
 *
 * @module stats
 */

/**
 * @typedef {Object} Trade
 * @property {number}  id
 * @property {string}  symbol
 * @property {string}  direction       - 'long' or 'short'
 * @property {number}  entryPrice
 * @property {number}  stopLoss
 * @property {number}  takeProfit
 * @property {number}  exitPrice
 * @property {string}  result          - 'win', 'loss', 'breakeven'
 * @property {number}  pnl             - profit/loss in currency
 * @property {number}  rMultiple       - R-multiple of the trade
 * @property {number}  plannedRR       - planned risk-reward ratio
 * @property {number}  realizedRR      - realized risk-reward ratio
 * @property {number}  riskAmount      - amount risked
 * @property {number}  rewardAmount    - amount gained/lost
 * @property {string}  entryDate       - ISO date string
 * @property {string}  exitDate        - ISO date string
 * @property {number}  positionSize
 */

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Safe division – returns `fallback` when the divisor is zero.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} [fallback=0]
 * @returns {number}
 */
const safeDivide = (numerator, denominator, fallback = 0) =>
  denominator === 0 ? fallback : numerator / denominator;

/**
 * Arithmetic mean of a number array.
 * @param {number[]} values
 * @returns {number}
 */
const mean = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
};

/**
 * Population standard deviation.
 * @param {number[]} values
 * @returns {number}
 */
const stddev = (values) => {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

/**
 * Duration between two ISO date strings in milliseconds.
 * @param {string} start - ISO date string
 * @param {string} end   - ISO date string
 * @returns {number}
 */
const durationMs = (start, end) => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, e - s);
};

/* ------------------------------------------------------------------ */
/*  Core metrics                                                       */
/* ------------------------------------------------------------------ */

/**
 * Win rate as a percentage (0-100).
 * Breakeven trades are NOT counted as wins.
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcWinRate(trades) {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.result === 'win').length;
  return (wins / trades.length) * 100;
}

/**
 * Average realized Risk-Reward ratio across all trades.
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcAverageRR(trades) {
  if (trades.length === 0) return 0;
  const sum = trades.reduce((s, t) => s + (t.realizedRR ?? 0), 0);
  return sum / trades.length;
}

/**
 * Expectancy in absolute currency per trade.
 *
 *   E = (winRate × avgWin) – (lossRate × avgLoss)
 *
 * where winRate & lossRate are decimals, avgWin & avgLoss are absolute PnL values.
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcExpectancy(trades) {
  if (trades.length === 0) return 0;

  const wins  = trades.filter((t) => t.result === 'win');
  const losses = trades.filter((t) => t.result === 'loss');

  const winRate  = safeDivide(wins.length, trades.length);
  const lossRate = safeDivide(losses.length, trades.length);

  const avgWin  = wins.length  > 0 ? mean(wins.map((t) => t.pnl))           : 0;
  const avgLoss = losses.length > 0 ? mean(losses.map((t) => Math.abs(t.pnl))) : 0;

  return winRate * avgWin - lossRate * avgLoss;
}

/**
 * Profit Factor = gross profit / gross loss.
 * Returns Infinity when gross loss is zero (all wins).
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcProfitFactor(trades) {
  if (trades.length === 0) return 0;

  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const grossLoss = trades
    .filter((t) => t.pnl < 0)
    .reduce((s, t) => s + Math.abs(t.pnl), 0);

  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

/**
 * Maximum drawdown analysis over the trade sequence.
 *
 * Walks the equity curve starting at 0 (cumulative PnL) and finds the
 * largest peak-to-trough decline.
 *
 * @param {Trade[]} trades
 * @returns {{
 *   maxDrawdown: number,
 *   maxDrawdownAmount: number,
 *   peakEquity: number,
 *   troughEquity: number,
 *   startDate: string|null,
 *   endDate: string|null
 * }}
 */
export function calcMaxDrawdown(trades, startingBalance = 10000) {
  const empty = {
    maxDrawdown: 0,
    maxDrawdownAmount: 0,
    peakEquity: startingBalance,
    troughEquity: startingBalance,
    startDate: null,
    endDate: null,
  };
  if (trades.length === 0) return empty;

  let equity = startingBalance;
  let peak = startingBalance;
  let peakDate = trades[0].exitDate ?? trades[0].entryDate ?? null;
  let maxDD = 0;
  let maxDDAmount = 0;
  let resultPeak = startingBalance;
  let resultTrough = startingBalance;
  let ddStartDate = null;
  let ddEndDate = null;

  for (const t of trades) {
    equity += t.pnl;

    if (equity > peak) {
      peak = equity;
      peakDate = t.exitDate ?? t.entryDate ?? null;
    }

    const dd = peak - equity;
    if (dd > maxDDAmount) {
      maxDDAmount = dd;
      resultPeak = peak;
      resultTrough = equity;
      ddStartDate = peakDate;
      ddEndDate = t.exitDate ?? t.entryDate ?? null;
    }
  }

  // Express as percentage of peak equity; guard against peak = 0
  const maxDrawdownPct = resultPeak > 0
    ? (maxDDAmount / resultPeak) * 100
    : 0;

  return {
    maxDrawdown: maxDrawdownPct,
    maxDrawdownAmount: maxDDAmount,
    peakEquity: resultPeak,
    troughEquity: resultTrough,
    startDate: ddStartDate,
    endDate: ddEndDate,
  };
}

/**
 * Recovery Factor = net profit / max drawdown amount.
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcRecoveryFactor(trades, startingBalance = 10000) {
  if (trades.length === 0) return 0;
  const netProfit = trades.reduce((s, t) => s + t.pnl, 0);
  const { maxDrawdownAmount } = calcMaxDrawdown(trades, startingBalance);
  return safeDivide(netProfit, maxDrawdownAmount);
}

/**
 * Sharpe Ratio (trade-level):
 *
 *   Sharpe = (mean(returns) − riskFreeRate) / σ(returns)
 *
 * where returns = per-trade PnL array.
 *
 * @param {Trade[]} trades
 * @param {number}  [riskFreeRate=0] - per-trade risk-free rate
 * @returns {number}
 */
export function calcSharpeRatio(trades, riskFreeRate = 0) {
  if (trades.length < 2) return 0;
  const returns = trades.map((t) => t.pnl);
  const avg = mean(returns);
  const sd = stddev(returns);
  return safeDivide(avg - riskFreeRate, sd);
}

/**
 * Sortino Ratio (trade-level):
 *
 *   Sortino = (mean(returns) − riskFreeRate) / downside_σ(returns)
 *
 * Downside deviation only considers returns below the target (riskFreeRate).
 *
 * @param {Trade[]} trades
 * @param {number}  [riskFreeRate=0]
 * @returns {number}
 */
export function calcSortinoRatio(trades, riskFreeRate = 0) {
  if (trades.length < 2) return 0;
  const returns = trades.map((t) => t.pnl);
  const avg = mean(returns);

  const downsideSquares = returns
    .filter((r) => r < riskFreeRate)
    .map((r) => (r - riskFreeRate) ** 2);

  if (downsideSquares.length === 0) return avg > riskFreeRate ? Infinity : 0;

  const downsideDev = Math.sqrt(
    downsideSquares.reduce((s, v) => s + v, 0) / downsideSquares.length,
  );

  return safeDivide(avg - riskFreeRate, downsideDev);
}

/**
 * Calmar Ratio = annualized return / max drawdown %.
 *
 * Annualized return is approximated by:
 *   meanPerTrade × periodsPerYear
 * then divided by maxDrawdown percentage.
 *
 * @param {Trade[]} trades
 * @param {number}  [periodsPerYear=252]
 * @param {number}  [startingBalance=10000]
 * @returns {number}
 */
export function calcCalmarRatio(trades, periodsPerYear = 252, startingBalance = 10000) {
  if (trades.length === 0) return 0;
  const { maxDrawdown } = calcMaxDrawdown(trades, startingBalance);
  if (maxDrawdown === 0) return 0;

  const avgReturn = mean(trades.map((t) => t.pnl));
  const annualizedReturn = avgReturn * periodsPerYear;
  return safeDivide(annualizedReturn, maxDrawdown);
}

/* ------------------------------------------------------------------ */
/*  Per-trade calculations                                             */
/* ------------------------------------------------------------------ */

/**
 * R-Multiple = reward achieved per unit of risk.
 *
 *   Long:  (exitPrice − entryPrice) / (entryPrice − stopLoss)
 *   Short: (entryPrice − exitPrice) / (stopLoss − entryPrice)
 *
 * @param {number} entryPrice
 * @param {number} exitPrice
 * @param {number} stopLoss
 * @param {string} direction - 'long' or 'short'
 * @returns {number}
 */
export function calcRMultiple(entryPrice, exitPrice, stopLoss, direction) {
  const risk =
    direction === 'long'
      ? entryPrice - stopLoss
      : stopLoss - entryPrice;

  if (risk === 0) return 0;

  const reward =
    direction === 'long'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice;

  return reward / risk;
}

/**
 * Planned Risk-Reward ratio (based on take-profit target).
 *
 * @param {number} entryPrice
 * @param {number} stopLoss
 * @param {number} takeProfit
 * @param {string} direction - 'long' or 'short'
 * @returns {number}
 */
export function calcPlannedRR(entryPrice, stopLoss, takeProfit, direction) {
  const risk =
    direction === 'long'
      ? entryPrice - stopLoss
      : stopLoss - entryPrice;

  if (risk === 0) return 0;

  const reward =
    direction === 'long'
      ? takeProfit - entryPrice
      : entryPrice - takeProfit;

  return reward / risk;
}

/**
 * Realized Risk-Reward ratio (based on actual exit price).
 *
 * @param {number} entryPrice
 * @param {number} exitPrice
 * @param {number} stopLoss
 * @param {string} direction - 'long' or 'short'
 * @returns {number}
 */
export function calcRealizedRR(entryPrice, exitPrice, stopLoss, direction) {
  return calcRMultiple(entryPrice, exitPrice, stopLoss, direction);
}

/* ------------------------------------------------------------------ */
/*  Duration & time metrics                                            */
/* ------------------------------------------------------------------ */

/**
 * Duration Ratio = avgLoserDuration / avgWinnerDuration.
 *
 * A value > 1 means losers are held longer than winners.
 *
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcDurationRatio(trades) {
  const winners = trades.filter((t) => t.result === 'win');
  const losers  = trades.filter((t) => t.result === 'loss');

  if (winners.length === 0 || losers.length === 0) return 0;

  const avgWinMs  = mean(winners.map((t) => durationMs(t.entryDate, t.exitDate)));
  const avgLossMs = mean(losers.map((t) => durationMs(t.entryDate, t.exitDate)));

  return safeDivide(avgLossMs, avgWinMs);
}

/**
 * Average holding time across all trades in milliseconds.
 * @param {Trade[]} trades
 * @returns {number}
 */
export function calcAvgHoldingTime(trades) {
  if (trades.length === 0) return 0;
  return mean(trades.map((t) => durationMs(t.entryDate, t.exitDate)));
}

/* ------------------------------------------------------------------ */
/*  Probability & streaks                                              */
/* ------------------------------------------------------------------ */

/**
 * Probability of N consecutive losses given a win rate.
 *
 *   P = (1 − winRate)^n
 *
 * @param {number} winRate - as a percentage (0-100)
 * @param {number} n       - number of consecutive losses
 * @returns {number} probability (0-1)
 */
export function calcConsecutiveLossProbability(winRate, n) {
  if (n <= 0) return 0;
  const lossRate = 1 - winRate / 100;
  if (lossRate <= 0) return 0;
  if (lossRate >= 1) return 1;
  return lossRate ** n;
}

/**
 * Win / loss streaks.
 *
 * @param {Trade[]} trades
 * @returns {{
 *   currentStreak: number,
 *   currentStreakType: string|null,
 *   maxWinStreak: number,
 *   maxLossStreak: number
 * }}
 */
export function calcStreaks(trades) {
  const result = {
    currentStreak: 0,
    currentStreakType: null,
    maxWinStreak: 0,
    maxLossStreak: 0,
  };

  if (trades.length === 0) return result;

  let currentStreak = 0;
  let currentType = null;
  let maxWin = 0;
  let maxLoss = 0;

  for (const t of trades) {
    const type = t.result === 'win' ? 'win' : t.result === 'loss' ? 'loss' : null;

    if (type === null) {
      // breakeven — resets the streak
      currentStreak = 0;
      currentType = null;
      continue;
    }

    if (type === currentType) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
      currentType = type;
    }

    if (type === 'win' && currentStreak > maxWin) maxWin = currentStreak;
    if (type === 'loss' && currentStreak > maxLoss) maxLoss = currentStreak;
  }

  result.currentStreak = currentStreak;
  result.currentStreakType = currentType;
  result.maxWinStreak = maxWin;
  result.maxLossStreak = maxLoss;

  return result;
}

/* ------------------------------------------------------------------ */
/*  Equity curve                                                       */
/* ------------------------------------------------------------------ */

/**
 * Build an equity curve from a chronological sequence of trades.
 *
 * @param {Trade[]} trades
 * @param {number}  startingBalance
 * @returns {Array<{date: string, balance: number, drawdown: number, drawdownPct: number}>}
 */
export function calcEquityCurve(trades, startingBalance) {
  if (trades.length === 0) return [];

  let balance = startingBalance;
  let peak = startingBalance;
  const curve = [];

  for (const t of trades) {
    balance += t.pnl;
    if (balance > peak) peak = balance;

    const drawdown = peak - balance;
    const drawdownPct = peak > 0 ? (drawdown / peak) * 100 : 0;

    curve.push({
      date: t.exitDate ?? t.entryDate,
      balance,
      drawdown,
      drawdownPct,
    });
  }

  return curve;
}

/* ------------------------------------------------------------------ */
/*  Comprehensive stats                                                */
/* ------------------------------------------------------------------ */

/**
 * Compute all available statistics at once.
 *
 * @param {Trade[]} trades
 * @param {number} [startingBalance=10000]
 * @returns {Object} comprehensive stats object
 */
export function calcAllStats(trades, startingBalance = 10000) {
  const wins   = trades.filter((t) => t.result === 'win');
  const losses = trades.filter((t) => t.result === 'loss');
  const breakevens = trades.filter((t) => t.result === 'breakeven');

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);

  const avgWin  = wins.length  > 0 ? mean(wins.map((t) => t.pnl))  : 0;
  const avgLoss = losses.length > 0 ? mean(losses.map((t) => t.pnl)) : 0;

  const grossProfit = trades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const grossLoss = trades
    .filter((t) => t.pnl < 0)
    .reduce((s, t) => s + Math.abs(t.pnl), 0);

  return {
    totalTrades: trades.length,
    totalWins: wins.length,
    totalLosses: losses.length,
    totalBreakevens: breakevens.length,

    winRate: calcWinRate(trades),
    avgRR: calcAverageRR(trades),
    expectancy: calcExpectancy(trades),
    profitFactor: calcProfitFactor(trades),

    totalPnl,
    grossProfit,
    grossLoss,
    avgWin,
    avgLoss,
    largestWin: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0,

    maxDrawdown: calcMaxDrawdown(trades, startingBalance),
    recoveryFactor: calcRecoveryFactor(trades, startingBalance),
    sharpeRatio: calcSharpeRatio(trades),
    sortinoRatio: calcSortinoRatio(trades),
    calmarRatio: calcCalmarRatio(trades, 252, startingBalance),

    durationRatio: calcDurationRatio(trades),
    avgHoldingTime: calcAvgHoldingTime(trades),

    streaks: calcStreaks(trades),

    avgRMultiple: trades.length > 0
      ? mean(trades.map((t) => t.rMultiple ?? 0))
      : 0,
    avgPlannedRR: trades.length > 0
      ? mean(trades.map((t) => t.plannedRR ?? 0))
      : 0,
  };
}
 
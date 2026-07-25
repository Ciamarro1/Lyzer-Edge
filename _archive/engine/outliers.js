/**
 * Lyzer Edge Analyst — Outlier Detection Engine
 *
 * Identifies statistical outlier trades and quantifies their impact
 * on portfolio metrics. Supports IQR (Tukey fence) and Z-score methods.
 * All functions are pure.
 *
 * @module outliers
 */

import { calcAllStats } from './stats.js';
import { calcEdgeScore } from './edgescore.js';

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Return a sorted (ascending) copy of a number array.
 * @param {number[]} arr
 * @returns {number[]}
 */
const sorted = (arr) => [...arr].sort((a, b) => a - b);

/**
 * Compute the p-th percentile of a sorted array using the
 * linear interpolation method (inclusive).
 *
 * @param {number[]} sortedArr - already sorted ascending
 * @param {number}   p         - percentile (0-1)
 * @returns {number}
 */
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];

  const idx = p * (sortedArr.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;

  return sortedArr[lo] * (1 - frac) + sortedArr[hi] * frac;
}

/**
 * Arithmetic mean.
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
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Detect outlier trades based on PnL distribution.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @param {'iqr'|'zscore'} [method='iqr'] - detection method
 * @returns {{
 *   outliers: import('./stats.js').Trade[],
 *   nonOutliers: import('./stats.js').Trade[],
 *   upperBound: number,
 *   lowerBound: number,
 * }}
 */
export function detectOutliers(trades, method = 'iqr') {
  const empty = { outliers: [], nonOutliers: [...trades], upperBound: 0, lowerBound: 0 };
  if (trades.length < 4) return empty;

  const pnls = trades.map((t) => t.pnl);

  let lowerBound;
  let upperBound;

  if (method === 'zscore') {
    const m = mean(pnls);
    const sd = stddev(pnls);
    if (sd === 0) return empty;

    lowerBound = m - 3 * sd;
    upperBound = m + 3 * sd;
  } else {
    // IQR (default)
    const sortedPnls = sorted(pnls);
    const q1 = percentile(sortedPnls, 0.25);
    const q3 = percentile(sortedPnls, 0.75);
    const iqr = q3 - q1;

    if (iqr === 0) return empty;

    lowerBound = q1 - 1.5 * iqr;
    upperBound = q3 + 1.5 * iqr;
  }

  const outliers = [];
  const nonOutliers = [];

  for (const t of trades) {
    if (t.pnl < lowerBound || t.pnl > upperBound) {
      outliers.push(t);
    } else {
      nonOutliers.push(t);
    }
  }

  return { outliers, nonOutliers, upperBound, lowerBound };
}

/**
 * Compute all stats with outliers removed (IQR method by default).
 *
 * @param {import('./stats.js').Trade[]} trades
 * @param {'iqr'|'zscore'} [method='iqr']
 * @returns {ReturnType<typeof calcAllStats>}
 */
export function calcStatsWithoutOutliers(trades, method = 'iqr') {
  const { nonOutliers } = detectOutliers(trades, method);
  return calcAllStats(nonOutliers);
}

/**
 * Quantify the impact of outliers on core metrics and Edge Score.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @param {'iqr'|'zscore'} [method='iqr']
 * @returns {{
 *   withOutliers: ReturnType<typeof calcAllStats>,
 *   withoutOutliers: ReturnType<typeof calcAllStats>,
 *   impactSummary: {
 *     profitFactorDelta: number,
 *     winRateDelta: number,
 *     expectancyDelta: number,
 *     edgeScoreDelta: number,
 *   }
 * }}
 */
export function calcOutlierImpact(trades, method = 'iqr') {
  const withOutliers = calcAllStats(trades);
  const { nonOutliers } = detectOutliers(trades, method);
  const withoutOutliers = calcAllStats(nonOutliers);

  const edgeFull = calcEdgeScore(trades);
  const edgeClean = calcEdgeScore(nonOutliers);

  // For profit factor deltas, treat Infinity as a large finite number
  // so the delta is meaningful.
  const capPF = (v) => (Number.isFinite(v) ? v : 1e6);

  return {
    withOutliers,
    withoutOutliers,
    impactSummary: {
      profitFactorDelta:
        capPF(withoutOutliers.profitFactor) - capPF(withOutliers.profitFactor),
      winRateDelta: withoutOutliers.winRate - withOutliers.winRate,
      expectancyDelta: withoutOutliers.expectancy - withOutliers.expectancy,
      edgeScoreDelta: edgeClean.score - edgeFull.score,
    },
  };
}

/**
 * Measure how much a single trade shifts the overall Edge Score.
 *
 * Impact = EdgeScore(allTrades) − EdgeScore(allTrades without this trade).
 *
 * @param {import('./stats.js').Trade} trade
 * @param {import('./stats.js').Trade[]} allTrades
 * @returns {number} positive means the trade HELPED the score
 */
export function getTradeImpactScore(trade, allTrades) {
  if (allTrades.length <= 1) return 0;

  const fullScore = calcEdgeScore(allTrades).score;
  const withoutTrade = allTrades.filter((t) => t !== trade);
  const reducedScore = calcEdgeScore(withoutTrade).score;

  return Math.round((fullScore - reducedScore) * 100) / 100;
}

/**
 * Return the trade with the largest PnL (biggest win).
 * Returns `null` if the array is empty.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @returns {import('./stats.js').Trade|null}
 */
export function getLargestWin(trades) {
  if (trades.length === 0) return null;
  return trades.reduce((best, t) => (t.pnl > best.pnl ? t : best), trades[0]);
}

/**
 * Return the trade with the smallest PnL (biggest loss).
 * Returns `null` if the array is empty.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @returns {import('./stats.js').Trade|null}
 */
export function getLargestLoss(trades) {
  if (trades.length === 0) return null;
  return trades.reduce((worst, t) => (t.pnl < worst.pnl ? t : worst), trades[0]);
}
 
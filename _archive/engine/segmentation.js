/**
 * Lyzer Edge Analyst — Segmented Analysis Engine
 *
 * Groups trades by various dimensions and computes core statistics
 * for each segment. All functions are pure.
 *
 * @module segmentation
 */

import {
  calcWinRate,
  calcAverageRR,
  calcExpectancy,
  calcProfitFactor,
  calcMaxDrawdown,
} from './stats.js';

/**
 * @typedef {Object} Segment
 * @property {string}      key         - segment dimension name
 * @property {string}      value       - segment bucket value (e.g. 'BTCUSDT', 'London')
 * @property {number}      tradeCount
 * @property {number}      winRate
 * @property {number}      avgRR
 * @property {number}      expectancy
 * @property {number}      profitFactor
 * @property {number}      maxDrawdown
 * @property {number|null} edgeScore   - populated later by edgescore engine
 */

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Trading session buckets (UTC hours).
 *
 *   Asia:    00:00 – 07:59
 *   London:  08:00 – 12:59
 *   Overlap: 13:00 – 16:59  (London + NY)
 *   NY:      17:00 – 20:59
 *   Off:     21:00 – 23:59
 *
 * NOTE: Overlap is classified separately first; remaining NY hours
 * and London hours outside the overlap window keep their label.
 */
function deriveSession(isoDate) {
  if (!isoDate) return 'Unknown';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Unknown';

  const hour = d.getUTCHours();

  if (hour >= 0 && hour < 8) return 'Asia';
  if (hour >= 8 && hour < 13) return 'London';
  if (hour >= 13 && hour < 17) return 'Overlap';
  if (hour >= 17 && hour < 21) return 'NY';
  return 'Off-Hours';
}

/**
 * Build a map of  bucketValue → Trade[]  using a key function.
 * @param {import('./stats.js').Trade[]} trades
 * @param {(trade: import('./stats.js').Trade) => string} keyFn
 * @returns {Map<string, import('./stats.js').Trade[]>}
 */
function groupTrades(trades, keyFn) {
  /** @type {Map<string, import('./stats.js').Trade[]>} */
  const groups = new Map();
  for (const t of trades) {
    const key = keyFn(t) ?? 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return groups;
}

/**
 * Turn a group map into a Segment array, computing stats for each group.
 *
 * @param {Map<string, import('./stats.js').Trade[]>} groups
 * @param {string} dimensionKey - human-readable dimension name
 * @returns {Segment[]}
 */
function toSegments(groups, dimensionKey) {
  /** @type {Segment[]} */
  const segments = [];
  for (const [value, groupTrades] of groups) {
    const { maxDrawdown } = calcMaxDrawdown(groupTrades);
    segments.push({
      key: dimensionKey,
      value,
      tradeCount: groupTrades.length,
      winRate: calcWinRate(groupTrades),
      avgRR: calcAverageRR(groupTrades),
      expectancy: calcExpectancy(groupTrades),
      profitFactor: calcProfitFactor(groupTrades),
      maxDrawdown,
      edgeScore: null,
    });
  }
  return segments;
}

/* ------------------------------------------------------------------ */
/*  Public segmentation functions                                      */
/* ------------------------------------------------------------------ */

/**
 * Generic segmentation by an arbitrary key function.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @param {(trade: import('./stats.js').Trade) => string} keyFn
 * @param {string} [dimensionKey='custom']
 * @returns {Segment[]}
 */
export function segmentBy(trades, keyFn, dimensionKey = 'custom') {
  if (trades.length === 0) return [];
  return toSegments(groupTrades(trades, keyFn), dimensionKey);
}

/**
 * Segment by trading symbol.
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentBySymbol(trades) {
  return segmentBy(trades, (t) => t.symbol ?? 'Unknown', 'symbol');
}

/**
 * Segment by timeframe (expects trade.timeframe).
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentByTimeframe(trades) {
  return segmentBy(trades, (t) => t.timeframe ?? 'Unknown', 'timeframe');
}

/**
 * Segment by trading session.
 *
 * Uses trade.session if present; otherwise derives from entryDate UTC hour.
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentBySession(trades) {
  return segmentBy(
    trades,
    (t) => t.session ?? deriveSession(t.entryDate),
    'session',
  );
}

/**
 * Segment by setup type.
 *
 * Uses trade.setupType if present; falls back to
 * trade.marketContext?.structure or 'Unknown'.
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentBySetup(trades) {
  return segmentBy(
    trades,
    (t) => t.setupType ?? t.marketContext?.structure ?? 'Unknown',
    'setup',
  );
}

/**
 * Segment by market condition.
 *
 * Uses trade.marketContext?.marketState or 'Unknown'.
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentByMarketCondition(trades) {
  return segmentBy(
    trades,
    (t) => t.marketContext?.marketState ?? 'Unknown',
    'marketCondition',
  );
}

/** Day-of-week labels (Sunday = 0). */
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Segment by day of the week (0 = Sunday … 6 = Saturday).
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentByDayOfWeek(trades) {
  return segmentBy(
    trades,
    (t) => {
      if (!t.entryDate) return 'Unknown';
      const d = new Date(t.entryDate);
      if (Number.isNaN(d.getTime())) return 'Unknown';
      return DAY_NAMES[d.getUTCDay()];
    },
    'dayOfWeek',
  );
}

/**
 * Segment by hour of the day (0-23 UTC).
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentByHourOfDay(trades) {
  return segmentBy(
    trades,
    (t) => {
      if (!t.entryDate) return 'Unknown';
      const d = new Date(t.entryDate);
      if (Number.isNaN(d.getTime())) return 'Unknown';
      return String(d.getUTCHours()).padStart(2, '0') + ':00';
    },
    'hourOfDay',
  );
}

/**
 * Segment by trade direction ('long' or 'short').
 * @param {import('./stats.js').Trade[]} trades
 * @returns {Segment[]}
 */
export function segmentByDirection(trades) {
  return segmentBy(trades, (t) => t.direction ?? 'Unknown', 'direction');
}

/**
 * Run every built-in segmentation at once.
 *
 * @param {import('./stats.js').Trade[]} trades
 * @returns {{
 *   bySymbol: Segment[],
 *   byTimeframe: Segment[],
 *   bySession: Segment[],
 *   bySetup: Segment[],
 *   byMarketCondition: Segment[],
 *   byDayOfWeek: Segment[],
 *   byHourOfDay: Segment[],
 *   byDirection: Segment[],
 * }}
 */
export function getAllSegments(trades) {
  return {
    bySymbol: segmentBySymbol(trades),
    byTimeframe: segmentByTimeframe(trades),
    bySession: segmentBySession(trades),
    bySetup: segmentBySetup(trades),
    byMarketCondition: segmentByMarketCondition(trades),
    byDayOfWeek: segmentByDayOfWeek(trades),
    byHourOfDay: segmentByHourOfDay(trades),
    byDirection: segmentByDirection(trades),
  };
}
 
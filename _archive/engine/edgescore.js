/**
 * Lyzer Edge Analyst — Proprietary Edge Score Engine
 *
 * Produces a composite 0-100 score that quantifies the statistical edge
 * of a trade set. Versioned so historical scores can be re-evaluated
 * if the formula changes.
 *
 * @module edgescore
 */

import {
  calcWinRate,
  calcAverageRR,
  calcProfitFactor,
  calcMaxDrawdown,
} from './stats.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Current formula version. */
export const EDGE_SCORE_VERSION = '1.0';

/**
 * @typedef {Object} EdgeScoreResult
 * @property {number}  score              - 0-100
 * @property {string}  version            - formula version
 * @property {string}  confidence         - overall confidence label
 * @property {number}  sampleSize
 * @property {Object}  components
 * @property {number}  components.winRateScore       - 0-100
 * @property {number}  components.rrScore             - 0-100
 * @property {number}  components.profitFactorScore   - 0-100
 * @property {number}  components.drawdownScore        - 0-100
 * @property {number}  components.consistencyScore     - 0-100
 * @property {number}  components.sampleConfidence     - 0-100
 * @property {string}  color              - hex color
 * @property {string}  label              - human-readable label
 */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Clamp a value to [min, max].
 */
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/**
 * Linear interpolation between mapped breakpoints.
 *
 * @param {number}      value
 * @param {[number, number][]} points - sorted ascending by x
 * @returns {number} interpolated y clamped to [0, 100]
 */
function interpolate(value, points) {
  if (points.length === 0) return 0;
  if (value <= points[0][0]) return points[0][1];
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1];

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (value >= x0 && value <= x1) {
      const t = (value - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/* ------------------------------------------------------------------ */
/*  Component scoring functions                                        */
/* ------------------------------------------------------------------ */

/**
 * Win Rate Score (0-100).
 *
 * Compares the actual win rate against the breakeven win rate for the
 * given average RR:   BE% = 1 / (1 + avgRR).
 *
 * Score = how far above breakeven, normalized so that being at breakeven
 * gives ≈20, being 2× above gives 100, and being below gives 0-20.
 */
function scoreWinRate(winRatePct, avgRR) {
  // Breakeven win-rate percentage for the average RR
  const breakevenPct = avgRR > 0 ? (1 / (1 + avgRR)) * 100 : 50;

  if (winRatePct <= 0) return 0;

  // Delta above breakeven in percentage points
  const delta = winRatePct - breakevenPct;

  // Map delta: -20 → 0, 0 → 20, +15 → 60, +30 → 85, +50 → 100
  return clamp(
    interpolate(delta, [
      [-20, 0],
      [0, 20],
      [15, 60],
      [30, 85],
      [50, 100],
    ]),
  );
}

/**
 * RR Score (0-100).
 * Maps average realized RR: 0→0, 1→30, 2→60, 3→80, 5+→100.
 */
function scoreRR(avgRR) {
  return clamp(
    interpolate(avgRR, [
      [0, 0],
      [1, 30],
      [2, 60],
      [3, 80],
      [5, 100],
    ]),
  );
}

/**
 * Profit Factor Score (0-100).
 * Maps: <1→0, 1→10, 1.5→40, 2→60, 3→85, 4+→100.
 */
function scoreProfitFactor(pf) {
  if (!Number.isFinite(pf)) {
    // Infinity → all wins, treat as 100
    return pf === Infinity ? 100 : 0;
  }
  return clamp(
    interpolate(pf, [
      [0, 0],
      [1, 10],
      [1.5, 40],
      [2, 60],
      [3, 85],
      [4, 100],
    ]),
  );
}

/**
 * Drawdown Score (0-100) — inverse severity.
 * Maps maxDD%: <5→100, 10→80, 20→60, 30→40, 50→20, >50→0.
 */
function scoreDrawdown(maxDDPct) {
  return clamp(
    interpolate(maxDDPct, [
      [0, 100],
      [5, 100],
      [10, 80],
      [20, 60],
      [30, 40],
      [50, 20],
      [75, 0],
    ]),
  );
}

/**
 * Consistency Score (0-100).
 *
 * Based on the coefficient of variation (CV) of monthly PnL.
 * Low CV = high score.
 *
 *   CV 0   → 100
 *   CV 0.5 → 80
 *   CV 1   → 60
 *   CV 2   → 30
 *   CV 3+  → 0
 *
 * If there are fewer than 2 months of data, returns 50 (neutral).
 */
function scoreConsistency(trades) {
  if (trades.length < 2) return 50;

  // Bucket trades by YYYY-MM
  const monthlyPnl = new Map();
  for (const t of trades) {
    const d = new Date(t.exitDate ?? t.entryDate);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    monthlyPnl.set(key, (monthlyPnl.get(key) ?? 0) + t.pnl);
  }

  const values = [...monthlyPnl.values()];
  if (values.length < 2) return 50;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  if (avg === 0) return 50;

  const sd = Math.sqrt(
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length,
  );

  const cv = Math.abs(sd / avg);

  return clamp(
    interpolate(cv, [
      [0, 100],
      [0.5, 80],
      [1, 60],
      [2, 30],
      [3, 0],
    ]),
  );
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Non-linear step function for sample confidence.
 *
 * @param {number} sampleSize
 * @returns {number} 0-100
 */
export function getConfidenceScore(sampleSize) {
  if (sampleSize < 30)   return 0;
  if (sampleSize < 100)  return 40;
  if (sampleSize < 300)  return 70;
  if (sampleSize < 1000) return 90;
  return 100;
}

/**
 * Human-readable confidence label from sample size.
 *
 * @param {number} sampleSize
 * @returns {string}
 */
export function getConfidenceLabel(sampleSize) {
  if (sampleSize < 30)   return 'Insufficient Data';
  if (sampleSize < 100)  return 'Low';
  if (sampleSize < 300)  return 'Moderate';
  if (sampleSize < 1000) return 'High';
  return 'Very High';
}

/**
 * Map a composite score to a hex color.
 *
 * @param {number} score - 0-100
 * @returns {string} hex color
 */
export function getScoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 50) return '#f59e0b';
  if (score <= 75) return '#3b82f6';
  return '#06d6a0';
}

/**
 * Map a composite score to a human-readable label.
 *
 * @param {number} score - 0-100
 * @returns {string}
 */
export function getScoreLabel(score) {
  if (score <= 20) return 'No Edge';
  if (score <= 40) return 'Weak';
  if (score <= 60) return 'Moderate';
  if (score <= 80) return 'Strong';
  return 'Elite';
}

/**
 * Calculate the composite Edge Score for a set of trades.
 *
 * Formula (v1.0):
 *   EdgeScore = 0.15 × WinRateScore
 *             + 0.20 × RRScore
 *             + 0.20 × ProfitFactorScore
 *             + 0.15 × DrawdownScore
 *             + 0.15 × ConsistencyScore
 *             + 0.15 × SampleConfidence
 *
 * @param {import('./stats.js').Trade[]} trades
 * @param {Object} [options]
 * @param {string} [options.version] - reserved for future formula versions
 * @returns {EdgeScoreResult}
 */
export function calcEdgeScore(trades, options = {}) {
  const sampleSize = trades.length;

  // Components — safe defaults for empty input
  const winRatePct = calcWinRate(trades);
  const avgRR = calcAverageRR(trades);
  const pf = calcProfitFactor(trades);
  const { maxDrawdown: maxDDPct } = calcMaxDrawdown(trades);

  const winRateScore = sampleSize > 0 ? scoreWinRate(winRatePct, avgRR) : 0;
  const rrScore = sampleSize > 0 ? scoreRR(avgRR) : 0;
  const profitFactorScore = sampleSize > 0 ? scoreProfitFactor(pf) : 0;
  const drawdownScore = sampleSize > 0 ? scoreDrawdown(maxDDPct) : 0;
  const consistencyScore = scoreConsistency(trades);
  const sampleConfidence = getConfidenceScore(sampleSize);

  const score = clamp(
    0.15 * winRateScore +
    0.20 * rrScore +
    0.20 * profitFactorScore +
    0.15 * drawdownScore +
    0.15 * consistencyScore +
    0.15 * sampleConfidence,
  );

  return {
    score: Math.round(score * 100) / 100,
    version: EDGE_SCORE_VERSION,
    confidence: getConfidenceLabel(sampleSize),
    sampleSize,
    components: {
      winRateScore: Math.round(winRateScore * 100) / 100,
      rrScore: Math.round(rrScore * 100) / 100,
      profitFactorScore: Math.round(profitFactorScore * 100) / 100,
      drawdownScore: Math.round(drawdownScore * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      sampleConfidence: Math.round(sampleConfidence * 100) / 100,
    },
    color: getScoreColor(score),
    label: getScoreLabel(score),
  };
}
 
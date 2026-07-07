// mdd.js
/**
 * Microstructure Decay Detector (MDD)
 * Pure function that analyses a window of observations and produces decay metrics.
 * Returns performance_decay, structural_decay and a qualitative trend_direction.
 */
 
/** Helper to compute simple mean of an array of numbers */
function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
 
/**
 * Compute a simple trend between two windows.
 * Returns an object with `value` (0‑1 scale) and `direction` string.
 */
function trend(current, previous) {
  const curMean = mean(current);
  const prevMean = mean(previous);
  const diff = curMean - prevMean;
  const direction = diff > 0 ? "improving" : diff < 0 ? "degrading" : "stable";
  // Normalize absolute difference to 0‑1 (clamp for safety)
  const maxPossible = Math.max(Math.abs(curMean), Math.abs(prevMean), 1);
  const value = Math.min(Math.abs(diff) / maxPossible, 1);
  return { value, direction };
}
 
/**
 * Detect decay from a window of observations.
 * @param {Array} observationsWindow - array of Observation objects.
 * @param {object} context - optional metadata (ignored for now).
 * @returns {object} { performance_decay, structural_decay, trend_direction }
 */
export function detectDecay(observationsWindow = [], context = {}) {
  // If not enough data, return neutral values.
  if (!Array.isArray(observationsWindow) || observationsWindow.length < 2) {
    return { performance_decay: 0, structural_decay: 0, trend_direction: "stable" };
  }
 
  // Extract numeric series – placeholder fields.
  const expectancySeries = observationsWindow.map(o => o.evidence?.expectancy ?? 0);
  const hitRateSeries = observationsWindow.map(o => o.evidence?.hit_rate ?? 0);
  const sampleSizeSeries = observationsWindow.map(o => o.evidence?.sample_size ?? 0);
  const opportunitySeries = observationsWindow.map(o => o.evidence?.opportunity_count ?? 0);
 
  // Split series into last 10 and previous 10 (or as many as available).
  const split = arr => {
    const len = arr.length;
    const half = Math.min(10, Math.floor(len / 2));
    const last = arr.slice(len - half);
    const previous = arr.slice(len - 2 * half, len - half);
    return { last, previous };
  };
 
  const { last: expLast, previous: expPrev } = split(expectancySeries);
  const { last: hrLast, previous: hrPrev } = split(hitRateSeries);
  const { last: ssLast, previous: ssPrev } = split(sampleSizeSeries);
  const { last: opLast, previous: opPrev } = split(opportunitySeries);
 
  const perfTrend = trend([...expLast, ...hrLast], [...expPrev, ...hrPrev]);
  const structTrend = trend([...ssLast, ...opLast], [...ssPrev, ...opPrev]);
 
  return {
    performance_decay: perfTrend.value,
    structural_decay: structTrend.value,
    trend_direction: perfTrend.direction, // choose performance direction as overall direction
  };
}
 
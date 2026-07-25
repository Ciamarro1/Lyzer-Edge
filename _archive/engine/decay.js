/**
 * Lyzer Edge - Edge Decay Calculations
 */

/**
 * Calculates exponential time weights for trades.
 * 
 * @param {Array<{rMultiple: number, date: string|Date}>} trades - Chronologically ordered trades
 * @param {number} halfLife - Number of trades for the weight to halve
 * @returns {Array<number>} Array of weights
 */
export function calculateTimeWeights(trades, halfLife = 50) {
  if (!trades || trades.length === 0) return [];
  const weights = [];
  const n = trades.length;
  // Last trade gets weight 1, previous decay
  const lambda = Math.LN2 / halfLife;
  
  for (let i = 0; i < n; i++) {
    // i is index, n-1 is the most recent
    const distance = n - 1 - i;
    weights.push(Math.exp(-lambda * distance));
  }
  return weights;
}

/**
 * Calculates time-decayed expectancy.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} halfLife 
 * @returns {number} Decayed expectancy
 */
export function calculateDecayedExpectancy(trades, halfLife = 50) {
  if (!trades || trades.length === 0) return 0;
  const weights = calculateTimeWeights(trades, halfLife);
  
  let weightedSum = 0;
  let weightSum = 0;
  
  for (let i = 0; i < trades.length; i++) {
    const r = typeof trades[i].rMultiple === 'number' ? trades[i].rMultiple : 0;
    weightedSum += r * weights[i];
    weightSum += weights[i];
  }
  
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}

/**
 * Detects edge decay by calculating the linear regression slope 
 * of a rolling expectancy metric.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} windowSize 
 * @returns {number} Slope of the edge (negative indicates decay)
 */
export function calculateEdgeSlope(trades, windowSize = 30) {
  if (!trades || trades.length < windowSize + 1) return 0;
  
  const rollingExpectancies = [];
  for (let i = windowSize; i <= trades.length; i++) {
    const window = trades.slice(i - windowSize, i);
    const sum = window.reduce((acc, t) => acc + (typeof t.rMultiple === 'number' ? t.rMultiple : 0), 0);
    rollingExpectancies.push(sum / windowSize);
  }
  
  // Linear regression on rollingExpectancies
  const n = rollingExpectancies.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += rollingExpectancies[i];
    sumXY += i * rollingExpectancies[i];
    sumX2 += i * i;
  }
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return 0;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}
 
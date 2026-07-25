/**
 * Lyzer Edge - Reliability Metrics
 */

/**
 * Calculates Standard Error of the mean R-Multiple.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @returns {number} Standard Error
 */
export function calculateStandardError(trades) {
  if (!trades || trades.length < 2) return 0;

  const n = trades.length;
  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  
  const mean = rMultiples.reduce((a, b) => a + b, 0) / n;
  
  const variance = rMultiples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  
  return stdDev / Math.sqrt(n);
}

/**
 * Calculates Confidence Interval for the Expectancy (Mean R-Multiple)
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} zScore - Default 1.96 for 95% confidence
 * @returns {{lower: number, mean: number, upper: number}}
 */
export function calculateExpectancyConfidenceInterval(trades, zScore = 1.96) {
  if (!trades || trades.length === 0) return { lower: 0, mean: 0, upper: 0 };
  
  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  const n = trades.length;
  const mean = rMultiples.reduce((a, b) => a + b, 0) / n;
  
  const se = calculateStandardError(trades);
  const marginOfError = zScore * se;
  
  return {
    lower: mean - marginOfError,
    mean: mean,
    upper: mean + marginOfError
  };
}

/**
 * Calculates System Reliability Score (0-100)
 * Uses SQN (System Quality Number) mapped to a 0-100 score.
 * SQN = (Expectancy / Standard Deviation) * sqrt(100) (normalized to 100 trades)
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @returns {number}
 */
export function calculateSystemReliabilityScore(trades) {
  if (!trades || trades.length < 30) return 0; // Not reliable enough data
  
  const n = trades.length;
  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  const mean = rMultiples.reduce((a, b) => a + b, 0) / n;
  
  const variance = rMultiples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return mean > 0 ? 100 : 0;
  
  // Normalized to 100 trades for SQN
  const sqn = (mean / stdDev) * Math.sqrt(100);
  
  // Map SQN to 0-100 score
  // Excellent SQN is > 3.0, Good > 2.0, Average 1.6-2.0
  let score = 0;
  if (sqn <= 0) score = 0;
  else if (sqn >= 4.0) score = 100;
  else {
    score = (sqn / 4.0) * 100;
  }
  
  return Math.min(100, Math.max(0, Math.round(score)));
}
 
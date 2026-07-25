/**
 * Lyzer Edge - Regime Detection
 */

/**
 * Detects regimes (e.g. High/Low Volatility or High/Low Expectancy) 
 * using rolling window K-means (K=2) clustering.
 * Returns an array of regime labels matching the trades.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} windowSize 
 * @returns {Array<number>} Regime labels (0 or 1) for each trade
 */
export function detectRegimes(trades, windowSize = 20) {
  const n = trades?.length || 0;
  const labels = new Array(n).fill(0);
  
  if (n < windowSize) return labels;

  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  const rollingFeatures = []; // [rolling_mean, rolling_std]

  for (let i = 0; i < n; i++) {
    if (i < windowSize - 1) {
      rollingFeatures.push({ mean: 0, std: 0 });
      continue;
    }
    
    const window = rMultiples.slice(i - windowSize + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / windowSize;
    const variance = window.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / windowSize;
    const std = Math.sqrt(variance);
    
    rollingFeatures.push({ mean, std });
  }

  // Simple K-means on rolling standard deviation to detect High/Low Volatility Regimes
  // Find min and max std to initialize centroids
  let minStd = Infinity;
  let maxStd = -Infinity;
  for (let i = windowSize - 1; i < n; i++) {
    const std = rollingFeatures[i].std;
    if (std < minStd) minStd = std;
    if (std > maxStd) maxStd = std;
  }

  let c0 = minStd; // Regime 0: Low Vol
  let c1 = maxStd; // Regime 1: High Vol
  let changed = true;
  let iterations = 0;

  // Assignments for indices >= windowSize - 1
  const assignments = new Array(n).fill(0);

  while (changed && iterations < 100) {
    changed = false;
    let sum0 = 0, count0 = 0;
    let sum1 = 0, count1 = 0;

    for (let i = windowSize - 1; i < n; i++) {
      const val = rollingFeatures[i].std;
      const d0 = Math.abs(val - c0);
      const d1 = Math.abs(val - c1);
      
      const newLabel = d0 <= d1 ? 0 : 1;
      if (assignments[i] !== newLabel) {
        changed = true;
        assignments[i] = newLabel;
      }

      if (assignments[i] === 0) {
        sum0 += val;
        count0++;
      } else {
        sum1 += val;
        count1++;
      }
    }

    if (count0 > 0) c0 = sum0 / count0;
    if (count1 > 0) c1 = sum1 / count1;
    iterations++;
  }

  // Copy assignments back, handling initial window
  for (let i = 0; i < n; i++) {
    if (i < windowSize - 1) {
      labels[i] = assignments[windowSize - 1]; // Assume initial regime is same as first valid window
    } else {
      labels[i] = assignments[i];
    }
  }

  return labels;
}

/**
 * Calculates average R-Multiple performance split by regimes.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {Array<number>} labels - Array of 0s and 1s indicating regimes
 * @returns {{ regime0: number, regime1: number }}
 */
export function calculateRegimePerformance(trades, labels) {
  const result = { regime0: 0, regime1: 0 };
  if (!trades || !labels || trades.length !== labels.length) return result;

  let sum0 = 0, count0 = 0;
  let sum1 = 0, count1 = 0;

  for (let i = 0; i < trades.length; i++) {
    const r = typeof trades[i].rMultiple === 'number' ? trades[i].rMultiple : 0;
    if (labels[i] === 0) {
      sum0 += r;
      count0++;
    } else {
      sum1 += r;
      count1++;
    }
  }

  result.regime0 = count0 > 0 ? sum0 / count0 : 0;
  result.regime1 = count1 > 0 ? sum1 / count1 : 0;

  return result;
}
 
/**
 * Lyzer Edge - Monte Carlo Engine
 * Operations are strictly based on R-Multiples to remain currency-agnostic.
 */

function calcPercentile(arr, p) {
  if (arr.length === 0) return 0;
  const pos = (arr.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (arr[base + 1] !== undefined) {
    return arr[base] + rest * (arr[base + 1] - arr[base]);
  } else {
    return arr[base];
  }
}

// Box-Muller transform for normally distributed noise
function randomNormal() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function buildDrawdownDistribution(drawdowns) {
  const sorted = [...drawdowns].sort((a, b) => a - b);
  return {
    p5: calcPercentile(sorted, 0.05),
    p25: calcPercentile(sorted, 0.25),
    median: calcPercentile(sorted, 0.5),
    p75: calcPercentile(sorted, 0.75),
    p95: calcPercentile(sorted, 0.95),
    max: sorted[sorted.length - 1] || 0
  };
}

/**
 * Runs a Monte Carlo bootstrap simulation by sampling with replacement from historical trades.
 * 
 * @param {Array<{rMultiple: number}>} trades 
 * @param {number} [iterations=10000]
 * @returns {Object} Simulation results including percentiles and drawdown distribution
 */
export function runBootstrapSimulation(trades, iterations = 10000) {
  if (!trades || trades.length === 0) {
    return {
      medianEquity: 0,
      percentile5: 0,
      percentile95: 0,
      drawdownDistribution: { p5: 0, p25: 0, median: 0, p75: 0, p95: 0, max: 0 }
    };
  }

  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  const numTrades = rMultiples.length;
  const equities = new Float64Array(iterations);
  const drawdowns = new Float64Array(iterations);

  for (let i = 0; i < iterations; i++) {
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (let j = 0; j < numTrades; j++) {
      const randIdx = Math.floor(Math.random() * numTrades);
      equity += rMultiples[randIdx];
      
      if (equity > peak) {
        peak = equity;
      }
      
      const dd = peak - equity;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    equities[i] = equity;
    drawdowns[i] = maxDrawdown; // positive value in R-Multiples
  }

  const sortedEquities = [...equities].sort((a, b) => a - b);

  return {
    medianEquity: calcPercentile(sortedEquities, 0.5),
    percentile5: calcPercentile(sortedEquities, 0.05),
    percentile95: calcPercentile(sortedEquities, 0.95),
    drawdownDistribution: buildDrawdownDistribution(drawdowns)
  };
}

/**
 * Runs a Monte Carlo simulation synthetically using aggregate statistics.
 * 
 * @param {Object} params
 * @param {number} params.winRate - Win rate as percentage (e.g. 60) or decimal (e.g. 0.6)
 * @param {number} params.avgWinR - Average win in R-Multiples
 * @param {number} params.avgLossR - Average loss in R-Multiples
 * @param {number} [params.stdDev=0] - Standard deviation for random noise
 * @param {number} [params.iterations=10000]
 * @param {number} [params.numTrades=100] - Number of trades per iteration sequence
 * @returns {Object} Simulation results including percentiles and drawdown distribution
 */
export function runSyntheticSimulation({ winRate, avgWinR, avgLossR, stdDev = 0, iterations = 10000, numTrades = 100 }) {
  const equities = new Float64Array(iterations);
  const drawdowns = new Float64Array(iterations);

  const w = winRate > 1 ? winRate / 100 : winRate;
  const actualWin = Math.abs(avgWinR);
  const actualLoss = -Math.abs(avgLossR);
  
  for (let i = 0; i < iterations; i++) {
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    for (let j = 0; j < numTrades; j++) {
      let r = 0;
      if (Math.random() < w) {
        r = actualWin;
      } else {
        r = actualLoss;
      }
      
      if (stdDev > 0) {
        r += randomNormal() * stdDev;
      }

      equity += r;
      
      if (equity > peak) {
        peak = equity;
      }
      
      const dd = peak - equity;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    equities[i] = equity;
    drawdowns[i] = maxDrawdown; // positive value in R-Multiples
  }

  const sortedEquities = [...equities].sort((a, b) => a - b);

  return {
    medianEquity: calcPercentile(sortedEquities, 0.5),
    percentile5: calcPercentile(sortedEquities, 0.05),
    percentile95: calcPercentile(sortedEquities, 0.95),
    drawdownDistribution: buildDrawdownDistribution(drawdowns)
  };
}
 
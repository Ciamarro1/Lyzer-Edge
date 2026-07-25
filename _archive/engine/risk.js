/**
 * Lyzer Edge - Risk and Ruin Calculations
 * Operates on R-Multiples where appropriate.
 */

/**
 * Calculates the Kelly Criterion (Full, Half, Quarter).
 * 
 * @param {number} winRate - Win rate as a percentage (0-100) or decimal (0-1)
 * @param {number} avgWinR - Average win in R-Multiples
 * @param {number} avgLossR - Average loss in R-Multiples
 * @param {number} [maxCap=1] - Maximum Kelly fraction to cap at (default 1 for 100%)
 * @returns {{full: number, half: number, quarter: number}}
 */
export function calcKellyCriterion(winRate, avgWinR, avgLossR, maxCap = 1) {
  const w = winRate > 1 ? winRate / 100 : winRate;
  const win = Math.abs(avgWinR);
  const loss = Math.abs(avgLossR);
  
  if (loss === 0) {
    return { full: 0, half: 0, quarter: 0 };
  }
  
  const rr = win / loss;
  if (rr === 0) {
    return { full: 0, half: 0, quarter: 0 };
  }

  // Kelly Formula: K = W - ((1 - W) / RR)
  const kelly = w - ((1 - w) / rr);
  const full = Math.min(maxCap, Math.max(0, kelly));

  return {
    full: full,
    half: full / 2,
    quarter: full / 4
  };
}

/**
 * Calculates the analytical Risk of Ruin using exponential bound.
 * 
 * @param {number} winRate - Win rate as a percentage or decimal
 * @param {number} avgWinR - Average win in R-Multiples
 * @param {number} avgLossR - Average loss in R-Multiples
 * @param {number} capitalR - Total capital expressed in R-Multiples
 * @returns {number} Probability of ruin (0 to 1)
 */
export function calcRiskOfRuin(winRate, avgWinR, avgLossR, capitalR) {
  const w = winRate > 1 ? winRate / 100 : winRate;
  const l = 1 - w;
  const win = Math.abs(avgWinR);
  const loss = -Math.abs(avgLossR);
  
  const mean = w * win + l * loss;
  if (mean <= 0) return 1; // 100% risk of ruin if no edge

  // Variance of discrete binary variable
  const varX = (w * Math.pow(win, 2) + l * Math.pow(loss, 2)) - Math.pow(mean, 2);
  
  if (varX === 0) return 0; // Pure winner

  // Risk of Ruin using exponential bound: P(Ruin) = exp(-2 * mean * capitalR / varX)
  const ruinProb = Math.exp(-2 * mean * capitalR / varX);
  return Math.min(1, Math.max(0, ruinProb));
}

/**
 * Calculates Empirical Risk of Ruin using Monte Carlo bootstrap.
 * 
 * @param {Array<{rMultiple: number}>} trades - Array of trade objects
 * @param {number} capitalR - Total capital expressed in R-Multiples
 * @param {number} [iterations=10000] - Number of simulation paths
 * @returns {number} Probability of ruin (0 to 1)
 */
export function calcEmpiricalRiskOfRuin(trades, capitalR, iterations = 10000) {
  if (!trades || trades.length === 0) return 0;
  
  const rMultiples = trades.map(t => typeof t.rMultiple === 'number' ? t.rMultiple : 0);
  const numTrades = rMultiples.length;
  let ruinedCount = 0;

  for (let i = 0; i < iterations; i++) {
    let equity = 0;
    let ruined = false;
    for (let j = 0; j < numTrades; j++) {
      const randIdx = Math.floor(Math.random() * numTrades);
      equity += rMultiples[randIdx];
      
      // Ruin is reached if cumulative loss meets or exceeds total capital
      if (equity <= -capitalR) {
        ruined = true;
        break;
      }
    }
    if (ruined) {
      ruinedCount++;
    }
  }

  return ruinedCount / iterations;
}
 
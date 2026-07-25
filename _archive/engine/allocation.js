/**
 * Lyzer Edge - Capital Allocation Engine
 * 
 * Answers: "Where do I place my next 1% of risk?"
 * 
 * Uses the Allocation Score:
 * (Edge * Confidence * Persistence * Regime Match * Capacity Score) / Correlation Penalty
 */

/**
 * Calculate Capacity Score based on trade sample size depth.
 * Scales from 0 to 100, reaching 100 at 100+ trades.
 * 
 * @param {number} sampleSize 
 * @returns {number} Capacity Score (0-100)
 */
export function calcCapacityScore(sampleSize) {
  if (sampleSize <= 0) return 0;
  // Non-linear scaling: reaches ~63 at 30 trades, ~100 at 100 trades
  const score = Math.sqrt(sampleSize) * 10;
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates a basic correlation between two equity curves or trade sets based on PnL.
 * Returns a value between -1 and 1.
 * 
 * @param {Array<number>} returnsA 
 * @param {Array<number>} returnsB 
 * @returns {number} Correlation coefficient
 */
export function calculateCorrelation(returnsA, returnsB) {
  if (!returnsA || !returnsB || returnsA.length === 0 || returnsB.length === 0) return 0;
  
  const len = Math.min(returnsA.length, returnsB.length);
  if (len < 2) return 0;

  const a = returnsA.slice(-len);
  const b = returnsB.slice(-len);

  const meanA = a.reduce((sum, val) => sum + val, 0) / len;
  const meanB = b.reduce((sum, val) => sum + val, 0) / len;

  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < len; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  if (varA === 0 || varB === 0) return 0;
  
  return cov / Math.sqrt(varA * varB);
}

/**
 * Ranks candidate setups/strategies for capital allocation.
 * 
 * @param {Array} candidates - Array of candidate strategies/setups to allocate to
 * @param {Array} portfolio - Array of currently active strategies/setups (to measure correlation)
 * @returns {Array} Ranked candidates with their Allocation Score
 */
export function rankAllocations(candidates, portfolio = []) {
  return candidates.map(candidate => {
    // Extract scores (0-100 scale ideally)
    const edge = candidate.edgeScore || 0;
    const confidence = candidate.confidenceScore || 0;
    const persistence = candidate.persistenceScore || 0;
    const regimeMatch = candidate.regimeMatchScore || 50; 
    
    // Late Requirement: Capacity Score
    const sampleSize = candidate.tradeCount || 0;
    const capacityScore = calcCapacityScore(sampleSize);

    // CRITICAL CONSTRAINT: Allocation is gated by Confidence. 
    // If confidence score is below 40 (Low or Insufficient Data), zero out allocation.
    if (confidence < 40) {
      return {
        ...candidate,
        capacityScore,
        correlationPenalty: 1,
        allocationScore: 0
      };
    }

    // Calculate Correlation Penalty
    let maxCorrelation = 0;
    if (portfolio.length > 0 && candidate.returns) {
      for (const p of portfolio) {
        if (p.returns) {
          const corr = calculateCorrelation(candidate.returns, p.returns);
          if (corr > maxCorrelation) {
            maxCorrelation = corr;
          }
        }
      }
    }
    
    // Penalty is 1 (no penalty) if correlation <= 0.
    // If highly correlated (e.g. 0.92), penalty is 1.92.
    const correlationPenalty = 1 + Math.max(0, maxCorrelation);

    // Formula: (Edge * Confidence * Persistence * Regime Match * Capacity Score) / Correlation Penalty
    // To keep the number manageable, we normalize by dividing by 100^4
    const rawNumerator = edge * confidence * persistence * regimeMatch * capacityScore;
    const normalizedNumerator = rawNumerator / Math.pow(100, 4); 
    
    const allocationScore = normalizedNumerator / correlationPenalty;

    return {
      ...candidate,
      capacityScore,
      correlationPenalty,
      allocationScore: Math.round(allocationScore * 100) / 100
    };
  }).sort((a, b) => b.allocationScore - a.allocationScore);
}
 
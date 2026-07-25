/**
 * executionReality.js
 * Execution Reality Layer (ERL) — 2026.6.3
 * Computes realistic slippage, fill probability, and microstructure distortion.
 */

/**
 * Calculates execution slippage.
 * @param {string} orderType - 'MARKET' or 'LIMIT'
 * @param {number} size - Order size
 * @param {number} avgVolume - Average volume of recent candles
 * @param {number} spread - Bid-ask spread
 * @param {number} price - Current close price
 * @param {number} [k=0.05] - Market impact coefficient
 */
export function calculateSlippage(orderType, size, avgVolume, spread, price, k = 0.05) {
  if (orderType === 'LIMIT') {
    return 0; // Limit orders do not suffer slippage on entry, only non-fills
  }
  const normSize = Math.max(1, size);
  const normVolume = Math.max(1, avgVolume);
  const impact = k * Math.sqrt(normSize / normVolume);
  return spread + impact;
}

/**
 * Calculates fill probability of a limit order before expiry.
 * @param {number} limitOffset - Price difference from market close (absolute)
 * @param {number} volPct - Current volatility percentage
 * @param {number} price - Close price
 * @param {number} timeToExpiry - Number of periods to live
 * @param {number} [alpha=1.5] - Sensitivity coefficient
 * @param {number} [beta=0.4] - Time decay coefficient
 */
export function calculateFillProbability(limitOffset, volPct, price, timeToExpiry, alpha = 1.5, beta = 0.4) {
  const normOffset = limitOffset / (price || 1);
  const safeVol = Math.max(volPct, 0.0001);
  const offsetRatio = normOffset / safeVol;
  
  const fillProb = Math.exp(-alpha * offsetRatio) * (1 - Math.exp(-beta * timeToExpiry));
  return Math.max(0, Math.min(1.0, fillProb));
}

/**
 * Calculates microstructure distortion factor.
 * @param {number} orderBookImbalance - Bid-ask volume imbalance (-1 to 1)
 * @param {number} latencyMs - Execution latency in ms
 * @param {number} queuePosition - Rank in execution queue
 * @param {number} totalQueue - Total size of queue
 */
export function calculateMicrostructureDistortion(orderBookImbalance, latencyMs, queuePosition, totalQueue) {
  const normImbalance = Math.max(-1.0, Math.min(1.0, orderBookImbalance));
  const queueRatio = totalQueue > 0 ? queuePosition / totalQueue : 0.5;
  const latencyFactor = Math.max(0, latencyMs / 100);

  const distortion = 1.0 - 0.1 * normImbalance - 0.05 * latencyFactor - 0.2 * queueRatio;
  return Math.max(0.2, Math.min(1.0, distortion));
}

/**
 * Unified evaluator for ERL execution metrics.
 */
export function evaluateExecution({
  orderType = 'MARKET',
  price = 1.0,
  size = 1.0,
  avgVolume = 1000.0,
  volPct = 0.005,
  spread = 0.0001,
  limitOffset = 0.0,
  timeToExpiry = 3,
  orderBookImbalance = 0.0,
  latencyMs = 15,
  queuePosition = 10,
  totalQueue = 100
}) {
  const slippage = calculateSlippage(orderType, size, avgVolume, spread, price);
  const fillProbability = calculateFillProbability(limitOffset, volPct, price, timeToExpiry);
  const distortionFactor = calculateMicrostructureDistortion(orderBookImbalance, latencyMs, queuePosition, totalQueue);

  // Compute actual execution entry price
  let executedPrice = price;
  if (orderType === 'MARKET') {
    executedPrice = price * (1 + slippage); // slippage shifts execution price negatively
  } else {
    executedPrice = price - limitOffset; // limit order price
  }

  return {
    orderType,
    executedPrice,
    slippage,
    fillProbability,
    distortionFactor
  };
}
 
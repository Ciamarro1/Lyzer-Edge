/**
 * evProfiler.js
 * Core engine for attributing ex-post PnL to decisions, regimes, and frictions.
 */

/**
 * Computes the EV breakdown for a specific trade or signal candidate.
 * @param {Object} trade - The trade object conforming to TradeLogSchema.
 * @param {Object} context - Optional configuration context.
 * @param {Array} history - The local tradeHistoryByAsset list for the asset.
 * @param {Object} [globalMemory] - Optional global EV stats tracking.
 * @returns {Object} Enriched EV report.
 */
export function computeTradeEV(trade, context, history, globalMemory) {
  const {
    direction,
    entryPrice,
    exitPrice,
    pnl,
    signal,
    regime,
    governanceDecision,
    reasonCodes,
    slippage = 0,
    spread = 0,
    timingOffset = 0
  } = trade;

  // 1. Calculate Individual EV Metrics
  const signalEV = estimateSignalEV(trade, history);
  const regimeEV = estimateRegimeEV(trade, pnl, history);
  const governanceEV = estimateGovernanceEV(trade, history);
  const executionEV = estimateExecutionEV(trade);
  const timingEV = estimateTimingEV(trade);

  // 2. Sum to Total EV
  const totalEV = signalEV + regimeEV + governanceEV + executionEV + timingEV;

  // 3. Classify decision quality
  const classification = classifyTrade(signalEV, pnl, governanceDecision);

  // 4. Update Global Memory if provided
  if (globalMemory) {
    updateGlobalMemory(trade, { totalEV, signalEV, regimeEV, governanceEV, executionEV, timingEV }, classification, globalMemory);
  }

  return {
    tradeId: trade.id,
    pnl,
    totalEV,
    breakdown: {
      signalEV,
      regimeEV,
      governanceEV,
      executionEV,
      timingEV
    },
    classification,
    meta: {
      confidence: signal.confidence,
      regime,
      reasonCodes
    }
  };
}

/* ----------------------------- ESTIMATORS ----------------------------- */

/**
 * Estimate Signal EV based on average PnL of historical signals with similar confidence.
 */
function estimateSignalEV(trade, history) {
  const similar = history.filter(h =>
    h.id !== trade.id &&
    h.direction === trade.direction &&
    Math.abs(h.signal.confidence - trade.signal.confidence) <= 5
  );

  if (!similar.length) return 0;
  return similar.reduce((sum, h) => sum + h.pnl, 0) / similar.length;
}

/**
 * Estimate Regime EV: performance deviation relative to the average PnL of the regime.
 */
function estimateRegimeEV(trade, pnl, history) {
  const regimeTrades = history.filter(h => h.id !== trade.id && h.regime === trade.regime);
  if (!regimeTrades.length) return 0;
  const avg = regimeTrades.reduce((sum, h) => sum + h.pnl, 0) / regimeTrades.length;
  return pnl - avg;
}

/**
 * Estimate Governance EV: isolates decision-making added/destroyed value.
 */
function estimateGovernanceEV(trade, history) {
  if (trade.governanceDecision === 'CAPACITY_CONSTRAINED') {
    return 0;
  }

  if (trade.governanceDecision === 'REJECT' || trade.governanceDecision === 'CANCELLED_LIMIT') {
    // Reverting/cancelling losses = positive EV. Missing profits = negative EV.
    return -trade.pnl;
  }

  if (trade.governanceDecision === 'ALLOW') {
    // Compare ALLOW PnL against average PnL of similar REJECT/shadow trades
    const similarRejected = history.filter(h =>
      h.id !== trade.id &&
      (h.governanceDecision === 'REJECT' || h.governanceDecision === 'CANCELLED_LIMIT') &&
      h.direction === trade.direction
    );

    if (!similarRejected.length) return 0;
    const avgMissed = similarRejected.reduce((sum, h) => sum + h.pnl, 0) / similarRejected.length;
    return trade.pnl - avgMissed;
  }

  return 0;
}

/**
 * Estimate Execution EV: friction penalties adjusted by microstructure distortion.
 */
function estimateExecutionEV(trade) {
  const slippage = trade.slippage || 0;
  const spread = trade.spread || 0;
  const distortionFactor = trade.distortionFactor ?? 1.0;
  return -(slippage + spread) * (2 - distortionFactor);
}

/**
 * Estimate Timing EV: timing offset penalty.
 */
function estimateTimingEV(trade) {
  const timingOffset = trade.timingOffset || 0;
  return -timingOffset;
}

/* ----------------------------- DECISION CLASSIFICATION ----------------------------- */

/**
 * Classifies the decision based on expected signal quality vs ex-post outcome.
 */
function classifyTrade(signalEV, pnl, governanceDecision) {
  if (governanceDecision === 'CAPACITY_CONSTRAINED') {
    return 'CAPACITY_CONSTRAINED';
  }
  if (governanceDecision === 'CANCELLED_LIMIT') {
    return 'CANCELLED_LIMIT';
  }

  const signalIsProfitable = signalEV >= 0;
  const tradeIsProfitable = pnl > 0;
  const passed = governanceDecision === 'ALLOW';

  if (passed) {
    return tradeIsProfitable ? 'TRUE_POSITIVE' : 'FALSE_POSITIVE';
  } else {
    // REJECT
    return !tradeIsProfitable ? 'TRUE_NEGATIVE' : 'FALSE_NEGATIVE';
  }
}

/* ----------------------------- GLOBAL MEMORY UPDATER ----------------------------- */

function updateGlobalMemory(trade, breakdown, classification, globalMemory) {
  const symbol = trade.symbol;
  
  // Initialize buckets if needed
  if (!globalMemory.signalBuckets) globalMemory.signalBuckets = {};
  if (!globalMemory.regimeBuckets) globalMemory.regimeBuckets = {};
  if (!globalMemory.governanceStats) globalMemory.governanceStats = { allowed: 0, rejected: 0, capacityConstrained: 0, cancelledLimit: 0 };
  
  // Categorize confidence into 10% buckets
  const bucketKey = Math.floor(trade.signal.confidence / 10) * 10;
  if (!globalMemory.signalBuckets[bucketKey]) {
    globalMemory.signalBuckets[bucketKey] = { count: 0, avgPnL: 0, avgEV: 0 };
  }
  const sb = globalMemory.signalBuckets[bucketKey];
  sb.avgPnL = (sb.avgPnL * sb.count + trade.pnl) / (sb.count + 1);
  sb.avgEV = (sb.avgEV * sb.count + breakdown.totalEV) / (sb.count + 1);
  sb.count++;

  // Regime buckets
  const regimeKey = trade.regime;
  if (!globalMemory.regimeBuckets[regimeKey]) {
    globalMemory.regimeBuckets[regimeKey] = { count: 0, avgPnL: 0, avgRegimeEV: 0 };
  }
  const rb = globalMemory.regimeBuckets[regimeKey];
  rb.avgPnL = (rb.avgPnL * rb.count + trade.pnl) / (rb.count + 1);
  rb.avgRegimeEV = (rb.avgRegimeEV * rb.count + breakdown.regimeEV) / (rb.count + 1);
  rb.count++;

  // Governance stats
  if (trade.governanceDecision === 'ALLOW') globalMemory.governanceStats.allowed++;
  else if (trade.governanceDecision === 'REJECT') globalMemory.governanceStats.rejected++;
  else if (trade.governanceDecision === 'CAPACITY_CONSTRAINED') globalMemory.governanceStats.capacityConstrained++;
  else if (trade.governanceDecision === 'CANCELLED_LIMIT') {
    if (!globalMemory.governanceStats.cancelledLimit) globalMemory.governanceStats.cancelledLimit = 0;
    globalMemory.governanceStats.cancelledLimit++;
  }
}
 
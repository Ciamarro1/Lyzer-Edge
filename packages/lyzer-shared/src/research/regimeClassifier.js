/**
 * Regime Classifier - Lyzer Edge Research
 * Pure function to classify market regime based on statistical features.
 * Integrates with ReplayEngine and Transition Probability Matrix (Markov Chain).
 */

const TRANSITION_MATRIX = {
  'COMPRESSION': { 'EXPANSION': 0.6, 'RANGE_NARROW': 0.3, 'TREND_BULLISH': 0.05, 'TREND_BEARISH': 0.05 },
  'EXPANSION': { 'TREND_BULLISH': 0.4, 'TREND_BEARISH': 0.4, 'RANGE_WIDE': 0.2 },
  'TREND_BULLISH': { 'TREND_BULLISH': 0.5, 'RANGE_WIDE': 0.3, 'COMPRESSION': 0.2 },
  'TREND_BEARISH': { 'TREND_BEARISH': 0.5, 'RANGE_WIDE': 0.3, 'COMPRESSION': 0.2 },
  'RANGE_WIDE': { 'COMPRESSION': 0.5, 'RANGE_NARROW': 0.3, 'EXPANSION': 0.2 },
  'RANGE_NARROW': { 'COMPRESSION': 0.4, 'EXPANSION': 0.4, 'RANGE_WIDE': 0.2 },
  'NEWS_SHOCK': { 'RANGE_WIDE': 0.5, 'EXPANSION': 0.3, 'COMPRESSION': 0.2 },
  'UNKNOWN': { 'COMPRESSION': 1.0 }
};

function getNextProbableRegime(currentRegime) {
  const transitions = TRANSITION_MATRIX[currentRegime] || TRANSITION_MATRIX['UNKNOWN'];
  let maxProb = 0;
  let nextRegime = currentRegime;
  
  for (const [regime, prob] of Object.entries(transitions)) {
    if (prob > maxProb) {
      maxProb = prob;
      nextRegime = regime;
    }
  }
  return { predictedNext: nextRegime, transitionProbability: maxProb };
}

/**
 * Calculates True Range
 */
function getTrueRange(current, previous) {
  if (!previous) return current.high - current.low;
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

/**
 * Classifies market regime from an array of candles.
 * @param {Array} candles - Array of OHLCV candle objects.
 * @returns {Object} { regime, confidence, metrics }
 */
export function classifyRegime(candles) {
  if (!candles || candles.length < 30) {
    return { regime: 'UNKNOWN', confidence: 0, metrics: {} };
  }

  // Calculate ATR for short (10) and long (30) periods
  const shortPeriod = 10;
  const longPeriod = 30;
  
  let recentTRs = [];
  for (let i = candles.length - longPeriod; i < candles.length; i++) {
    recentTRs.push(getTrueRange(candles[i], candles[i-1]));
  }

  const shortATR = recentTRs.slice(-shortPeriod).reduce((a,b)=>a+b, 0) / shortPeriod;
  const longATR = recentTRs.reduce((a,b)=>a+b, 0) / longPeriod;
  
  const atrRatio = shortATR / (longATR || 1); // Volatility expansion/compression ratio

  // Directional Movement (Simplified ADX)
  let upMoves = 0;
  let downMoves = 0;
  let totalMoves = 0;
  
  for(let i = candles.length - shortPeriod; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i-1];
    
    const up = current.high - prev.high;
    const down = prev.low - current.low;
    
    if (up > down && up > 0) upMoves += up;
    if (down > up && down > 0) downMoves += down;
    totalMoves += Math.max(up, down, 0);
  }
  
  const directionalBias = totalMoves === 0 ? 0 : (upMoves - downMoves) / totalMoves; // -1 to 1

  // Range Compression Ratio (Bollinger Band Width proxy)
  const recentCloses = candles.slice(-shortPeriod).map(c => c.close);
  const mean = recentCloses.reduce((a,b) => a+b, 0) / shortPeriod;
  const variance = recentCloses.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / shortPeriod;
  const stdDev = Math.sqrt(variance);
  
  const compressionRatio = stdDev / (mean * 0.001 || 1); // Normalized to price

  let regime = 'RANGE_NARROW';
  let confidence = 0.5;

  if (atrRatio > 2.0) {
    regime = 'NEWS_SHOCK';
    confidence = 0.9;
  } else if (atrRatio > 1.3 && Math.abs(directionalBias) > 0.4) {
    regime = 'EXPANSION';
    confidence = 0.85;
  } else if (atrRatio < 0.7 && compressionRatio < 0.5) {
    regime = 'COMPRESSION';
    confidence = 0.8;
  } else if (directionalBias > 0.6) {
    regime = 'TREND_BULLISH';
    confidence = 0.75;
  } else if (directionalBias < -0.6) {
    regime = 'TREND_BEARISH';
    confidence = 0.75;
  } else if (atrRatio > 1.1) {
    regime = 'RANGE_WIDE';
    confidence = 0.6;
  }

  const transitionPrediction = getNextProbableRegime(regime);

  return {
    regime,
    confidence,
    metrics: {
      atrRatio,
      directionalBias,
      compressionRatio,
      shortATR,
      longATR
    },
    transition: transitionPrediction
  };
}

/**
 * evMTFEngine.js
 * Multi-Timeframe Belief Fusion Engine — 2026.6.3
 * Performs scale alignment, entropy-based consistency checks,
 * and hierarchical regime confirmations.
 */

// ==========================================
// Math Helper functions (Native JS)
// ==========================================

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function variance(arr) {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return sum(arr.map(x => Math.pow(x - m, 2))) / arr.length;
}

function entropy(arr) {
  const freq = { up: 0, down: 0, flat: 0 };
  arr.forEach(v => {
    if (v > 0) freq.up++;
    else if (v < 0) freq.down++;
    else freq.flat++;
  });
  const total = arr.length || 1;
  let ent = 0;
  for (const key in freq) {
    if (freq[key] > 0) {
      const p = freq[key] / total;
      ent -= p * Math.log2(p);
    }
  }
  return ent;
}

// ==========================================
// Core MTF Pipeline Methods
// ==========================================

/**
 * Synchronizes candle streams across multiple timeframes.
 */
export function syncTimeframes(dataByTF) {
  const synced = [];
  const tfs = ["1m", "5m", "15m", "1h"];
  
  const minLength = Math.min(...tfs.map(tf => dataByTF[tf]?.length || 0));

  for (let i = 0; i < minLength; i++) {
    synced.push({
      "1m": dataByTF["1m"][i],
      "5m": dataByTF["5m"][i],
      "15m": dataByTF["15m"][i],
      "1h": dataByTF["1h"][i]
    });
  }
  return synced;
}

/**
 * Maps synced frames to feature vectors via a feature extractor.
 */
export function alignFeatures(syncFrames, featureExtractor) {
  return syncFrames.map(frame => {
    return {
      "1m": featureExtractor(frame["1m"]),
      "5m": featureExtractor(frame["5m"]),
      "15m": featureExtractor(frame["15m"]),
      "1h": featureExtractor(frame["1h"])
    };
  });
}

/**
 * Computes cross-timeframe entropy and instability variance.
 */
export function crossEntropyConsistency(alignedFeatures) {
  return alignedFeatures.map(frame => {
    const entropies = Object.keys(frame).map(tf => entropy(frame[tf]));
    const instab = variance(entropies);
    return {
      entropies: {
        "1m": entropies[0],
        "5m": entropies[1],
        "15m": entropies[2],
        "1h": entropies[3]
      },
      instability: instab
    };
  });
}

/**
 * Evaluates hierarchical regime alignment across timeframes.
 */
export function regimeStacking(alignedFeatures, regimeExtractor) {
  return alignedFeatures.map(frame => {
    const regimes = {
      "1m": regimeExtractor(frame["1m"]),
      "5m": regimeExtractor(frame["5m"]),
      "15m": regimeExtractor(frame["15m"]),
      "1h": regimeExtractor(frame["1h"])
    };

    const bias = regimes["1h"]; // Macro bias is the boss (1h)
    let agreement = 0;

    if (bias !== 0) {
      // 15m structure confirmation
      agreement += (regimes["15m"] === bias) ? 0.5 : -0.5;
      // 5m execution validation
      agreement += (regimes["5m"] === bias) ? 0.3 : -0.3;
      // 1m timing filter
      agreement += (regimes["1m"] === bias) ? 0.2 : -0.2;
    }

    return {
      regimes,
      bias,
      agreement
    };
  });
}

/**
 * Fuses the multi-timeframe features into a single directional signal.
 */
export function fuseMTFSignals(alignedFeatures, entropyScores, regimeStacks, options = {}) {
  const finalSignals = [];
  const instabilityThreshold = options.instabilityThreshold ?? 0.40;

  for (let i = 0; i < alignedFeatures.length; i++) {
    const frame = alignedFeatures[i];
    const score = entropyScores[i];
    const stack = regimeStacks[i];

    // Cognitive Circuit Breaker
    if (score.instability > instabilityThreshold) {
      finalSignals.push({
        score: 0,
        circuitBreakerTriggered: true,
        reason: 'MTF_DIVERGENCE_BLOCKED'
      });
      continue;
    }

    // Dynamic weights based on inverse entropy
    const tfs = ["1m", "5m", "15m", "1h"];
    const rawWeights = tfs.map(tf => 1.0 / (score.entropies[tf] + 1e-5));
    const totalRawWeight = sum(rawWeights) || 1;
    const weights = tfs.reduce((acc, tf, idx) => {
      acc[tf] = rawWeights[idx] / totalRawWeight;
      return acc;
    }, {});

    let fusedScore = 0;
    for (const tf of tfs) {
      const meanFeature = mean(frame[tf]);
      fusedScore += meanFeature * weights[tf];
    }

    // Apply regime confirmation stacking multiplier
    const agreementFactor = 1 + 0.6 * stack.agreement;
    fusedScore *= agreementFactor;

    // Soft clip to [-1, 1]
    fusedScore = Math.max(-1.0, Math.min(1.0, fusedScore));

    finalSignals.push({
      score: fusedScore,
      circuitBreakerTriggered: false,
      weights,
      instability: score.instability,
      agreement: stack.agreement
    });
  }

  return finalSignals;
}

/**
 * Pipeline Entry Point
 */
export function runMTFEngine(dataByTF, featureExtractor, regimeExtractor, options = {}) {
  const synced = syncTimeframes(dataByTF);
  const aligned = alignFeatures(synced, featureExtractor);
  const entropyScores = crossEntropyConsistency(aligned);
  // Pass synced (raw candles) rather than aligned (feature arrays) to regimeExtractor
  const regimeStacks = regimeStacking(synced, regimeExtractor);
  const fused = fuseMTFSignals(aligned, entropyScores, regimeStacks, options);

  return {
    signals: fused,
    entropyScores,
    regimeStacks,
    aligned
  };
}
 
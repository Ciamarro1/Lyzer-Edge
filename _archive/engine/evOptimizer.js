/**
 * evOptimizer.js
 * Optimization engine that maximizes robust EV across regimes and assets.
 */

import { computeTradeEV } from "./evProfiler.js";

/* =========================================================
   CONFIG SEARCH SPACE
========================================================= */

export const PARAM_SPACE = {
  confidenceThreshold: [45, 50, 55, 60, 65, 70, 75],
  riskReward: [1.5, 2.0, 2.5],
  regimeWeight: [0.8, 1.0, 1.2],
  chopPenalty: [0.3, 0.5, 0.7],
  governanceStrictness: [0.8, 1.0, 1.2],
  limitDiscountFactor: [0.0, 0.2, 0.4, 0.6],
  limitExpiry: [1, 3, 5]
};

/* =========================================================
   CORE ENTRY POINT
========================================================= */

export function runEVOptimization({
  assets = [],
  simulateFn,
  baseHistory = {}
}) {
  const candidates = generateGrid(PARAM_SPACE);
  const results = [];

  for (const config of candidates) {
    const evaluation = evaluateConfig({
      config,
      assets,
      simulateFn,
      baseHistory
    });
    results.push(evaluation);
  }

  const ranked = rankCandidates(results);
  const best = ranked[0];

  return {
    bestConfig: best.config,
    ranked,
    diagnostics: buildDiagnostics(ranked)
  };
}

/* =========================================================
   GRID SEARCH (SMART PRUNING)
========================================================= */

function generateGrid(space) {
  const keys = Object.keys(space);
  let combinations = [{}];

  for (const key of keys) {
    const values = space[key];
    const next = [];

    for (const combo of combinations) {
      for (const v of values) {
        next.push({
          ...combo,
          [key]: v
        });
      }
    }
    combinations = pruneIfTooLarge(next);
  }

  return combinations;
}

/* =========================================================
   SMART PRUNING (anti-combinatorial explosion)
========================================================= */

function pruneIfTooLarge(combos) {
  const MAX = 80;
  if (combos.length <= MAX) return combos;

  // keep diversity sampling instead of full cartesian explosion
  return combos
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX);
}

/* =========================================================
   CONFIG EVALUATION
========================================================= */

function evaluateConfig({
  config,
  assets,
  simulateFn,
  baseHistory
}) {
  const assetResults = [];

  for (const asset of assets) {
    const simTrades = simulateFn(asset, config);
    const evStats = computeAggregateEV(simTrades, baseHistory[asset] || []);

    assetResults.push({
      asset,
      ...evStats
    });
  }

  const crossAssetScore = computeCrossAssetConsistency(assetResults);
  const overfitPenalty = computeOverfitPenalty(assetResults);
  const regimeRobustness = computeRegimeRobustness(assetResults);

  const totalEV =
    avg(assetResults.map(a => a.totalEV)) *
    crossAssetScore *
    regimeRobustness *
    (1 - overfitPenalty);

  return {
    config,
    totalEV,
    breakdown: {
      crossAssetScore,
      overfitPenalty,
      regimeRobustness,
      assets: assetResults
    }
  };
}

/* =========================================================
   EV AGGREGATION & STATISTICS
========================================================= */

function computeAggregateEV(trades, history) {
  let sum = 0;
  const regimeSum = {};
  const regimeCount = {};
  const signalEVs = [];
  const regimeEVs = [];

  for (const t of trades) {
    // Feed empty history if we are optimizing from scratch, or use the historical database
    const ev = computeTradeEV(t, {}, history);
    sum += ev.totalEV;

    signalEVs.push(ev.breakdown.signalEV);
    regimeEVs.push(ev.breakdown.regimeEV);

    const r = t.regime;
    if (!regimeSum[r]) {
      regimeSum[r] = 0;
      regimeCount[r] = 0;
    }
    regimeSum[r] += ev.totalEV;
    regimeCount[r]++;
  }

  const regimeStats = {};
  for (const r of Object.keys(regimeSum)) {
    regimeStats[r] = regimeSum[r] / regimeCount[r];
  }

  return {
    totalEV: sum / Math.max(trades.length, 1),
    regimeStats,
    signalVariance: variance(signalEVs),
    regimeVariance: variance(regimeEVs)
  };
}

function variance(arr) {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sqDiff = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
  return sqDiff / arr.length;
}

/* =========================================================
   CROSS-ASSET VALIDATION
========================================================= */

function computeCrossAssetConsistency(assetResults) {
  const evs = assetResults.map(a => a.totalEV);
  const mean = avg(evs);
  const varVal = variance(evs);

  // Penalize high variance/divergence between assets
  return 1 / (1 + varVal);
}

/* =========================================================
   REGIME ROBUSTNESS
========================================================= */

function computeRegimeRobustness(assetResults) {
  let stability = 0;

  for (const a of assetResults) {
    const regimes = a.regimeStats || {};
    const values = Object.values(regimes);
    if (!values.length) {
      stability += 1;
      continue;
    }

    const spread = max(values) - min(values);
    stability += 1 / (1 + spread);
  }

  return stability / Math.max(assetResults.length, 1);
}

/* =========================================================
   OVERFIT PENALTY (CORE SAFETY LAYER)
========================================================= */

function computeOverfitPenalty(assetResults) {
  let instability = 0;

  for (const a of assetResults) {
    const signalVar = a.signalVariance || 0;
    const regimeVar = a.regimeVariance || 0;
    instability += signalVar + regimeVar;
  }

  return clamp(instability / 10, 0, 0.7);
}

/* =========================================================
   RANKING + BAYESIAN UPDATE
========================================================= */

function rankCandidates(results) {
  return results
    .map(r => ({
      ...r,
      posteriorScore: bayesianUpdate(r.totalEV)
    }))
    .sort((a, b) => b.posteriorScore - a.posteriorScore);
}

/* =========================================================
   BAYESIAN UPDATE (LIGHTWEIGHT PRIOR SHIFT)
========================================================= */

function bayesianUpdate(ev) {
  const prior = 0.5;
  const likelihood = sigmoid(ev);
  return (prior * likelihood) / (prior + 0.0001);
}

/* =========================================================
   DIAGNOSTICS
========================================================= */

function buildDiagnostics(ranked) {
  return {
    bestEV: ranked[0]?.totalEV,
    worstEV: ranked[ranked.length - 1]?.totalEV,
    spread: ranked[0]?.totalEV - ranked[ranked.length - 1]?.totalEV,
    stability: ranked[0]?.breakdown?.crossAssetScore
  };
}

/* =========================================================
   UTILS
========================================================= */

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
}

function max(arr) {
  return Math.max(...arr);
}

function min(arr) {
  return Math.min(...arr);
}

function clamp(v, minV, maxV) {
  return Math.max(minV, Math.min(maxV, v));
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
 
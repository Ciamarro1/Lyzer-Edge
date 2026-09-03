import fs from 'fs';
import path from 'path';

// Normal CDF approximation
export function normalCDF(z) {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p  = 0.2316419;
  const c2 = 0.39894228;

  if (z >= 0.0) {
    const t = 1.0 / (1.0 + p * z);
    return (1.0 - c2 * Math.exp(-z * z / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
  } else {
    const t = 1.0 / (1.0 - p * z);
    return (c2 * Math.exp(-z * z / 2.0) * t *
      (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
  }
}

export function twoTailedPValue(t) {
  return 2.0 * (1.0 - normalCDF(Math.abs(t)));
}

// Pearson Correlation
export function pearsonCorr(x, y) {
  const n = x.length;
  if (n < 3) return 0;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den > 1e-12 ? num / den : 0;
}

// Spearman Rank Correlation
export function spearmanCorr(x, y) {
  const n = x.length;
  if (n < 3) return 0;
  function getRanks(arr) {
    const indexed = arr.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Float64Array(n);
    for (let r = 0; r < n; r++) {
      ranks[indexed[r].i] = r + 1;
    }
    return ranks;
  }
  return pearsonCorr(getRanks(x), getRanks(y));
}

// Newey-West HAC Covariance & Standard Error Estimator
export function calculateNeweyWestHAC(series, maxLag = 5) {
  const n = series.length;
  if (n <= maxLag + 1) {
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const s2 = series.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / Math.max(1, n - 1);
    return { mean, seHAC: Math.sqrt(s2 / n), tHAC: mean / Math.sqrt(s2 / n), pValHAC: 1.0 };
  }

  const mean = series.reduce((a, b) => a + b, 0) / n;
  const e = series.map(x => x - mean);

  let gamma0 = e.reduce((acc, val) => acc + val * val, 0) / n;
  let longRunVar = gamma0;

  for (let l = 1; l <= maxLag; l++) {
    let gammaL = 0;
    for (let i = l; i < n; i++) {
      gammaL += e[i] * e[i - l];
    }
    gammaL /= n;
    const weight = 1.0 - (l / (maxLag + 1));
    longRunVar += 2.0 * weight * gammaL;
  }

  const seHAC = Math.sqrt(Math.max(1e-12, longRunVar / n));
  const tHAC = mean / seHAC;
  const pValHAC = twoTailedPValue(tHAC);

  return { mean, seHAC, tHAC, pValHAC };
}

// Cost Sensitivity Grid Calculator
export function calculateCostSensitivity(returns, frictionsBps = [0, 5, 10, 20]) {
  const n = returns.length;
  if (n === 0) return {};
  const res = {};
  for (const bps of frictionsBps) {
    const frictionDec = bps / 10000;
    const netReturns = returns.map(r => r - frictionDec);
    const mean = netReturns.reduce((a, b) => a + b, 0) / n;
    const wins = netReturns.filter(r => r > 0).length;
    const hitRate = wins / n;
    const grossWins = netReturns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(netReturns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossWins / grossLoss : (grossWins > 0 ? 999 : 1.0);
    const variance = netReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / Math.max(1, n - 1);
    const std = Math.sqrt(variance);
    const sharpe = std > 1e-8 ? mean / std : 0;

    res[`cost_${bps}bps`] = {
      meanReturnPercent: Number((mean * 100).toFixed(4)),
      expectancyBps: Number((mean * 10000).toFixed(2)),
      hitRatePercent: `${(hitRate * 100).toFixed(2)}%`,
      profitFactor: Number(profitFactor.toFixed(3)),
      unannualizedSharpe: Number(sharpe.toFixed(4))
    };
  }
  return res;
}

// Benjamini-Hochberg False Discovery Rate (FDR)
export function applyBenjaminiHochberg(hypotheses, qThreshold = 0.05) {
  const m = hypotheses.length;
  if (m === 0) return [];
  // Sort by p-value ascending
  const indexed = hypotheses.map((h, i) => ({ ...h, originalIndex: i }));
  indexed.sort((a, b) => a.pValue - b.pValue);

  let maxK = -1;
  for (let k = 0; k < m; k++) {
    const rank = k + 1;
    const bhCritical = (rank / m) * qThreshold;
    indexed[k].fdrCriticalThreshold = Number(bhCritical.toFixed(6));
    indexed[k].fdrQValue = Number(Math.min(1.0, (indexed[k].pValue * m) / rank).toFixed(6));
    if (indexed[k].pValue <= bhCritical) {
      maxK = k;
    }
  }

  for (let k = 0; k < m; k++) {
    indexed[k].fdrSignificant = k <= maxK;
  }

  // Restore original order
  indexed.sort((a, b) => a.originalIndex - b.originalIndex);
  return indexed;
}

// PRNG: Mulberry32
export function createMulberry32(seed) {
  return function() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

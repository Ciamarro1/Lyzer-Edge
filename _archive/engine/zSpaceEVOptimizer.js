/**
 * zSpaceEVOptimizer.js
 * Z-Space EV Optimizer — 2026.6.3
 * Maps continuous latent state approximations (Z_t) to ex-post trade performance bins.
 */

import { EVFeatureCausalEngine } from './evFeatureCausalEngine.js';

export class ZSpaceEVOptimizer {
  constructor(candles, trades, params = {}) {
    this.candles = candles;
    this.trades = trades; // expects candidatesList (which contains timestamp and pnl)
    this.fce = new EVFeatureCausalEngine();
    this.params = {
      zBins: params.zBins ?? 20,
      minSamplesPerBin: params.minSamplesPerBin ?? 10,
      ...params
    };
  }

  // -----------------------------
  // 1. CONSTRUCT Z-SPACE
  // -----------------------------

  buildZSpace() {
    const space = [];
    const warmup = 51; // matches verify_stream start index

    for (let i = warmup; i < this.candles.length; i++) {
      const features = this.fce.generateFeatures(this.candles, i);
      space.push({
        z: features.z_hat,
        entropy: features.entropy,
        regime: features.regime,
        index: i
      });
    }
    return space;
  }

  // -----------------------------
  // 2. DISCRETIZE LATENT Z-SPACE
  // -----------------------------

  discretizeZ(space) {
    const bins = new Map();

    space.forEach(p => {
      // Discretize into bin indices. Since z is typically around [-2.0, 2.0],
      // multiplying by zBins (e.g. 20) and floor grouping will segment it cleanly.
      const key = Math.floor(p.z * this.params.zBins);

      if (!bins.has(key)) {
        bins.set(key, {
          points: [],
          ev: 0
        });
      }
      bins.get(key).points.push(p);
    });
    return bins;
  }

  // -----------------------------
  // 3. MAP EX-POST EV PER STATE
  // -----------------------------

  attachEV(bins) {
    for (const [key, bin] of bins.entries()) {
      let evSum = 0;
      let count = 0;

      bin.points.forEach(p => {
        // Find matching trade candidate from candidatesList by timestamp/index
        const trade = this.trades.find(t => t.timestamp === p.index);
        if (trade && trade.pnl !== undefined) {
          evSum += trade.pnl;
          count++;
        }
      });
      bin.ev = count > 0 ? evSum / count : 0;
    }
    return bins;
  }

  // -----------------------------
  // 4. BAYESIAN SMOOTHING
  // -----------------------------

  smoothEV(bins) {
    const allEV = [...bins.values()].map(b => b.ev);
    const globalMean = allEV.length > 0
      ? allEV.reduce((a, b) => a + b, 0) / allEV.length
      : 0;

    for (const bin of bins.values()) {
      // Prior weight is a function of bin sample size.
      // Small sample size pulls bin expectation toward global mean.
      const weight = bin.points.length / (bin.points.length + 5);
      bin.ev = weight * bin.ev + (1 - weight) * globalMean;
    }
    return bins;
  }

  // -----------------------------
  // 5. RANK CAUSAL STATES
  // -----------------------------

  rankStates(bins) {
    const ranked = [...bins.entries()]
      .map(([key, bin]) => ({
        zBin: key,
        ev: bin.ev,
        sampleSize: bin.points.length
      }))
      .sort((a, b) => b.ev - a.ev);

    return ranked;
  }

  // -----------------------------
  // 6. PIPELINE RUN
  // -----------------------------

  run() {
    const zSpace = this.buildZSpace();
    const bins = this.discretizeZ(zSpace);
    this.attachEV(bins);
    this.smoothEV(bins);

    const ranked = this.rankStates(bins);

    return {
      topPositiveStates: ranked.slice(0, 5),
      worstStates: ranked.slice(-5),
      fullRanking: ranked
    };
  }
}
 
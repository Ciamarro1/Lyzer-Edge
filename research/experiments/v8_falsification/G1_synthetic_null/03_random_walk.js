/**
 * N3: Random Walk / Geometric Brownian Motion Null Generator
 * Discrete integrated log-price random walk with zero drift.
 */

import { createMulberry32, sampleStandardNormal } from './01_gaussian_iid.js';

export function generateRandomWalk(seed, length = 200, sigma = 0.012, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  for (let i = 0; i < length; i++) {
    // Pure Brownian step
    const dW = sampleStandardNormal(prng) * sigma;
    const open = currentClose;
    const close = Math.max(1.0, open * Math.exp(dW));

    const zHigh = Math.abs(sampleStandardNormal(prng));
    const zLow = Math.abs(sampleStandardNormal(prng));
    const zVol = sampleStandardNormal(prng);

    const high = Math.max(open, close) * Math.exp(zHigh * 0.0035);
    const low = Math.min(open, close) * Math.exp(-zLow * 0.0035);
    const volume = Math.max(10, 1000 * Math.exp(zVol * 0.20));

    candles.push({
      timestamp: timestamp + i * 3600000,
      open,
      high,
      low,
      close,
      volume
    });

    currentClose = close;
  }

  return candles;
}

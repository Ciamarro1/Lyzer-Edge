/**
 * N4: Temporal Shuffle Null Generator
 * Empirical returns sampled from BTCUSDT_1h.json and permuted via deterministic Fisher-Yates.
 */

import { createMulberry32, sampleStandardNormal } from './01_gaussian_iid.js';

export function generateTemporalShuffle(seed, empiricalReturns, length = 200, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  const nAvailable = empiricalReturns.length;
  
  // Deterministic starting slice
  const maxStart = Math.max(0, nAvailable - length * 2);
  const startIdx = Math.floor(prng() * maxStart);
  const sampledReturns = empiricalReturns.slice(startIdx, startIdx + length);

  // Fisher-Yates shuffle
  for (let i = sampledReturns.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = sampledReturns[i];
    sampledReturns[i] = sampledReturns[j];
    sampledReturns[j] = temp;
  }

  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  for (let i = 0; i < sampledReturns.length; i++) {
    const r_t = sampledReturns[i];
    const open = currentClose;
    const close = Math.max(1.0, open * Math.exp(r_t));

    const zHigh = Math.abs(sampleStandardNormal(prng));
    const zLow = Math.abs(sampleStandardNormal(prng));
    const zVol = sampleStandardNormal(prng);

    const high = Math.max(open, close) * Math.exp(zHigh * 0.003);
    const low = Math.min(open, close) * Math.exp(-zLow * 0.003);
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

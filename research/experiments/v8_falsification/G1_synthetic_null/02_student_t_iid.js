/**
 * N2: Student-t IID Null Generator
 * Fat-tailed independent returns with nu in {3, 5, 8}. Zero directional drift.
 */

import { createMulberry32, sampleStandardNormal } from './01_gaussian_iid.js';

export function sampleStudentT(prng, nu = 5) {
  const z0 = sampleStandardNormal(prng);
  let sumSq = 0;
  for (let k = 0; k < nu; k++) {
    const zk = sampleStandardNormal(prng);
    sumSq += zk * zk;
  }
  const chiSqOverNu = sumSq / nu;
  return z0 / Math.sqrt(chiSqOverNu);
}

export function generateStudentTIID(seed, length = 200, nu = 5, sigma = 0.010, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  // Normalization factor so that Var(r_t) = sigma^2 for nu > 2
  const scale = nu > 2 ? sigma * Math.sqrt((nu - 2) / nu) : sigma * 0.7;

  for (let i = 0; i < length; i++) {
    const tVal = sampleStudentT(prng, nu);
    const r_t = tVal * scale;
    const open = currentClose;
    const close = open * Math.exp(r_t);

    const zHigh = Math.abs(sampleStandardNormal(prng));
    const zLow = Math.abs(sampleStandardNormal(prng));
    const zVol = sampleStandardNormal(prng);

    const high = Math.max(open, close) * Math.exp(zHigh * 0.003);
    const low = Math.min(open, close) * Math.exp(-zLow * 0.003);
    const volume = Math.max(10, 1000 * Math.exp(zVol * 0.25));

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

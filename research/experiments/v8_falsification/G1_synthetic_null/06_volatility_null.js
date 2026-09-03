/**
 * N6: Volatility-Only GARCH(1,1) Null Generator
 * Strong volatility clustering, conditional heteroskedasticity, strictly zero conditional directional drift.
 */

import { createMulberry32, sampleStandardNormal } from './01_gaussian_iid.js';

export function generateGARCHNull(seed, length = 200, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  
  // Standard GARCH(1,1) parameters calibrated for intraday crypto returns
  const omega = 1.0e-5;
  const alpha = 0.12;
  const beta = 0.82; // persistence = 0.94 < 1
  const unconditionalVar = omega / (1 - alpha - beta);

  let currentVar = unconditionalVar;
  let prevReturn = 0;

  // Warm up GARCH variance process
  for (let w = 0; w < 50; w++) {
    currentVar = omega + alpha * Math.pow(prevReturn, 2) + beta * currentVar;
    const eps = sampleStandardNormal(prng);
    prevReturn = Math.sqrt(currentVar) * eps;
  }

  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  for (let i = 0; i < length; i++) {
    currentVar = omega + alpha * Math.pow(prevReturn, 2) + beta * currentVar;
    const eps = sampleStandardNormal(prng);
    const r_t = Math.sqrt(currentVar) * eps; // Strictly zero conditional drift: E[r_t | F_{t-1}] = 0
    prevReturn = r_t;

    const open = currentClose;
    const close = Math.max(1.0, open * Math.exp(r_t));

    const zHigh = Math.abs(sampleStandardNormal(prng));
    const zLow = Math.abs(sampleStandardNormal(prng));
    const zVol = sampleStandardNormal(prng);

    const high = Math.max(open, close) * Math.exp(zHigh * Math.sqrt(currentVar) * 0.4);
    const low = Math.min(open, close) * Math.exp(-zLow * Math.sqrt(currentVar) * 0.4);
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

/**
 * N1: Gaussian IID Null Generator
 * Returns r_t ~ N(0, sigma^2), strictly zero drift (mu = 0).
 */

export function createMulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleStandardNormal(prng) {
  let u = 0, v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function generateGaussianIID(seed, length = 200, sigma = 0.010, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  for (let i = 0; i < length; i++) {
    const r_t = sampleStandardNormal(prng) * sigma;
    const open = currentClose;
    const close = open * Math.exp(r_t);

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

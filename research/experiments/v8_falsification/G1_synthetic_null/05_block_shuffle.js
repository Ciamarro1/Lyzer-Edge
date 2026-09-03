/**
 * N5: Block Shuffle / Block Bootstrap Null Generator
 * Empirical returns sampled in coherent blocks (size B in {5, 10, 20}) and permuted.
 */

import { createMulberry32, sampleStandardNormal } from './01_gaussian_iid.js';

export function generateBlockShuffle(seed, empiricalReturns, length = 200, blockSize = 10, initialPrice = 50000) {
  const prng = createMulberry32(seed);
  const nBlocks = Math.ceil(length / blockSize);
  const maxStart = Math.max(0, empiricalReturns.length - length * 2);
  const sourceStart = Math.floor(prng() * maxStart);
  
  // Extract contiguous chunk
  const chunk = empiricalReturns.slice(sourceStart, sourceStart + length * 2);
  
  // Partition into blocks
  const blocks = [];
  for (let i = 0; i < chunk.length - blockSize; i += blockSize) {
    blocks.push(chunk.slice(i, i + blockSize));
  }

  // Shuffle blocks
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = blocks[i];
    blocks[i] = blocks[j];
    blocks[j] = temp;
  }

  // Concatenate blocks
  const reconstructedReturns = [];
  for (let b = 0; b < nBlocks && reconstructedReturns.length < length; b++) {
    if (blocks[b]) {
      reconstructedReturns.push(...blocks[b]);
    }
  }

  const finalReturns = reconstructedReturns.slice(0, length);
  const candles = [];
  let currentClose = initialPrice;
  let timestamp = 1700000000000;

  for (let i = 0; i < finalReturns.length; i++) {
    const r_t = finalReturns[i];
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

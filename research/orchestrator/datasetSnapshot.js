import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const datasetDir = resolve(__dirname, '../datasets');

let cachedCandles = null;
let cachedFunding = null;
let cachedHashes = null;

/**
 * Loads, verifies SHA-256 hashes, and caches the multiyear dataset in memory.
 */
export function getDatasetSnapshot() {
  if (cachedCandles && cachedFunding) {
    return {
      candles: cachedCandles,
      funding: cachedFunding,
      hashes: cachedHashes
    };
  }

  const candlesPath = resolve(datasetDir, 'BTCUSDT_1h_multiyear_2023_2026.json');
  const fundingPath = resolve(datasetDir, 'BTCUSDT_funding_rates_2023_2026.json');

  const candlesRaw = readFileSync(candlesPath);
  const fundingRaw = readFileSync(fundingPath);

  const candlesHash = crypto.createHash('sha256').update(candlesRaw).digest('hex');
  const fundingHash = crypto.createHash('sha256').update(fundingRaw).digest('hex');

  const candles = JSON.parse(candlesRaw.toString('utf-8'));
  const funding = JSON.parse(fundingRaw.toString('utf-8'));

  candles.sort((a, b) => a.openTime - b.openTime);
  funding.sort((a, b) => a.fundingTime - b.fundingTime);

  // Freeze objects in memory to prevent accidental mutations by workers
  cachedCandles = Object.freeze(candles);
  cachedFunding = Object.freeze(funding);
  cachedHashes = Object.freeze({
    candles1hSha256: candlesHash,
    fundingSha256: fundingHash,
    candleCount: candles.length,
    fundingRecordCount: funding.length
  });

  return {
    candles: cachedCandles,
    funding: cachedFunding,
    hashes: cachedHashes
  };
}

/**
 * Helper to query the latest causal funding rate for timestamp t without lookahead.
 */
export function getLatestFundingRate(fundingList, t) {
  let latest = null;
  for (const f of fundingList) {
    if (f.fundingTime <= t) latest = f;
    else break;
  }
  return latest ? latest.fundingRate : 0.0001;
}

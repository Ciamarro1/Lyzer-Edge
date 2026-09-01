/**
 * 🏛️ LYZER EDGE — BATCH 037 POPULATION EXTRACTION
 * 
 * Extracts Point-in-Time (PIT) conditional state tuples:
 * S_t = (Funding State F_t, Volatility Regime V_t, Price Structure P_t)
 * with State Persistence D_t and Multi-Horizon Forward Returns (H+24, H+72, H+168).
 * 
 * Strict Constraint: ZERO Lookahead. Pure Point-in-Time causal extraction.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

import { WyckoffVolumeProfileEngine } from '../../../packages/lyzer-shared/src/providers/v5_wyckoff_volume_profile.js';

console.log('='.repeat(95));
console.log('🔬 BATCH 037: POPULATION & REGIME STATE EXTRACTION (POINT-IN-TIME)');
console.log('='.repeat(95));

// 1. Ingest Certified Datasets
const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');
const fundingPath = resolve(ROOT_DIR, 'research/datasets/BTCUSDT_funding_rates_2023_2026.json');

if (!existsSync(h1Path) || !existsSync(fundingPath)) {
  console.error('❌ Datasets missing! Check paths.');
  process.exit(1);
}

const rawH1 = readFileSync(h1Path);
const rawFunding = readFileSync(fundingPath);

const hashH1 = crypto.createHash('sha256').update(rawH1).digest('hex');
const hashFunding = crypto.createHash('sha256').update(rawFunding).digest('hex');

console.log(`📥 H1 Candles SHA-256:     ${hashH1}`);
console.log(`📥 Funding Stream SHA-256: ${hashFunding}`);

const candles = JSON.parse(rawH1.toString('utf8'));
candles.sort((a, b) => a.openTime - b.openTime);

const fundingRates = JSON.parse(rawFunding.toString('utf8'));
fundingRates.sort((a, b) => a.fundingTime - b.fundingTime);

console.log(`📊 Ingested ${candles.length.toLocaleString()} H1 candles & ${fundingRates.length.toLocaleString()} funding rate updates.`);

// Helper: Binary Search for PIT Funding Rate (strictly <= candle.openTime)
function getPitFundingRate(openTime) {
  let low = 0, high = fundingRates.length - 1, best = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (fundingRates[mid].fundingTime <= openTime) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best >= 0 ? fundingRates[best].fundingRate : 0.0001;
}

// 2. Pre-calculate 24h Realized Volatility for each bar
const WARMUP_BARS = 720; // 30 days warmup for baseline stats
const HORIZON_MAX = 168; // 7 days future horizon buffer

// Instantiate V5 Engine with Frozen Settings
const v5Engine = new WyckoffVolumeProfileEngine({
  lookback: 30,
  volumeZScore: 1.50,
  minPierceATR: 0.50,
  pocProximity: 0.003,
  requireVolume: true,
  requirePierce: true,
  requirePOC: false,
  requireReversal: true
});

// Calculate Rolling Realized Volatility (std of 24h hourly log returns)
const realizedVol = new Array(candles.length).fill(0);
for (let i = 24; i < candles.length; i++) {
  const returns = [];
  for (let j = i - 23; j <= i; j++) {
    returns.push(Math.log(candles[j].close / candles[j - 1].close));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  realizedVol[i] = Math.sqrt(variance);
}

// Calculate Quantile Cutoffs for Volatility using rolling 720-bar window
function getVolRegime(i) {
  const windowStart = Math.max(0, i - 720);
  const slice = realizedVol.slice(windowStart, i).sort((a, b) => a - b);
  if (slice.length < 50) return 'VOL_NORM';
  const q33 = slice[Math.floor(slice.length * 0.33)];
  const q67 = slice[Math.floor(slice.length * 0.67)];
  const current = realizedVol[i];
  if (current < q33) return 'VOL_LOW';
  if (current > q67) return 'VOL_HIGH';
  return 'VOL_NORM';
}

function getFundingState(funding) {
  if (funding < 0) return 'FUND_NEG';
  if (funding <= 0.0001) return 'FUND_NEU';
  return 'FUND_POS';
}

// 3. Extract Population Events
console.log('\n⚙️ Extracting PIT State Population across 32,112 candles...');

const population = [];
const buffer = [];

let currentFundingRegime = null;
let currentFundingDuration = 0;

for (let i = 0; i < candles.length - HORIZON_MAX; i++) {
  const c = candles[i];
  buffer.push(c);
  if (buffer.length > 300) buffer.shift();

  // Track PIT Funding
  const funding = getPitFundingRate(c.openTime);
  const fundState = getFundingState(funding);

  if (fundState === currentFundingRegime) {
    currentFundingDuration++;
  } else {
    currentFundingRegime = fundState;
    currentFundingDuration = 1;
  }

  if (i < WARMUP_BARS) continue;

  // Track Volatility Regime
  const volRegime = getVolRegime(i);

  // Track Price Structure via V5 Wyckoff Engine
  const v5Res = v5Engine.reconstruct({ slow: buffer });
  let priceStructure = 'STRUCT_NEU';
  if (v5Res.signal === 'LONG') priceStructure = 'STRUCT_SPRING';
  if (v5Res.signal === 'SHORT') priceStructure = 'STRUCT_UPTHRUST';

  // Composite State Identifier: F_V_P (e.g. FUND_NEG_VOL_HIGH_STRUCT_SPRING)
  const compositeState = `${fundState}_${volRegime}_${priceStructure}`;

  // Forward Returns Calculation (Point-in-Time Ground Truth)
  const entryPrice = c.close;
  
  // H+24
  const c24 = candles[i + 24];
  const ret24 = (c24.close - entryPrice) / entryPrice;
  let maxHigh24 = -Infinity, minLow24 = Infinity;
  for (let k = 1; k <= 24; k++) {
    if (candles[i + k].high > maxHigh24) maxHigh24 = candles[i + k].high;
    if (candles[i + k].low < minLow24) minLow24 = candles[i + k].low;
  }
  const mfe24 = (maxHigh24 - entryPrice) / entryPrice;
  const mae24 = (minLow24 - entryPrice) / entryPrice;

  // H+72
  const c72 = candles[i + 72];
  const ret72 = (c72.close - entryPrice) / entryPrice;
  let maxHigh72 = -Infinity, minLow72 = Infinity;
  for (let k = 1; k <= 72; k++) {
    if (candles[i + k].high > maxHigh72) maxHigh72 = candles[i + k].high;
    if (candles[i + k].low < minLow72) minLow72 = candles[i + k].low;
  }
  const mfe72 = (maxHigh72 - entryPrice) / entryPrice;
  const mae72 = (minLow72 - entryPrice) / entryPrice;

  // H+168
  const c168 = candles[i + 168];
  const ret168 = (c168.close - entryPrice) / entryPrice;
  let maxHigh168 = -Infinity, minLow168 = Infinity;
  for (let k = 1; k <= 168; k++) {
    if (candles[i + k].high > maxHigh168) maxHigh168 = candles[i + k].high;
    if (candles[i + k].low < minLow168) minLow168 = candles[i + k].low;
  }
  const mfe168 = (maxHigh168 - entryPrice) / entryPrice;
  const mae168 = (minLow168 - entryPrice) / entryPrice;

  const year = new Date(c.openTime).getUTCFullYear();
  const split = (year >= 2025) ? 'OOS' : 'IN_SAMPLE';

  population.push({
    index: i,
    openTime: c.openTime,
    timestamp: new Date(c.openTime).toISOString(),
    year,
    split,
    close: c.close,
    funding,
    fundState,
    volRegime,
    priceStructure,
    compositeState,
    fundingDuration: currentFundingDuration,
    ret24, mfe24, mae24,
    ret72, mfe72, mae72,
    ret168, mfe168, mae168
  });
}

console.log(`✅ Extracted ${population.length.toLocaleString()} valid PIT observations.`);
console.log(`   • In-Sample (2023–2024): ${population.filter(p => p.split === 'IN_SAMPLE').length.toLocaleString()}`);
console.log(`   • Out-Of-Sample (2025–2026): ${population.filter(p => p.split === 'OOS').length.toLocaleString()}`);

// 4. Save Extracted Population
const resultsDir = resolve(ROOT_DIR, 'research/results');
if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const outputPath = resolve(resultsDir, 'BATCH_037_POPULATION_DATASET.json');
writeFileSync(outputPath, JSON.stringify(population, null, 2), 'utf8');

console.log(`💾 Saved B037 Population Dataset to: ${outputPath}`);
console.log('='.repeat(95));

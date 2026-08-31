/**
 * 🏛️ LYZER EDGE — BATCH 036: PHASE 1 — FUNDING & MACRO REGIME FEATURE EXTRACTOR
 * 
 * Datasets: BTCUSDT Funding History (8h) + BTCUSDT Futures H1 (Certified G-DATA-0)
 * Target: Point-in-Time synchronization of Funding Z-Score, Macro Volatility Regime and Multi-Horizon Forward Returns
 * 
 * Output: research/results/batch_036/FUNDING_REGIME_EVENTS.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(90));
console.log('🔬 BATCH 036: PHASE 1 — FUNDING & MACRO REGIME FEATURE EXTRACTION (PREREG-036)');
console.log('='.repeat(90));

// 1. Load Datasets
const fundingPath = resolve(ROOT_DIR, 'research/datasets/BTCUSDT_funding_rates_2023_2026.json');
const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');

if (!existsSync(fundingPath) || !existsSync(h1Path)) {
  console.error('❌ Missing dataset files.');
  process.exit(1);
}

console.log('📥 Loading Funding History and H1 Futures Candles...');
const rawFunding = JSON.parse(readFileSync(fundingPath, 'utf8'));
const rawH1 = JSON.parse(readFileSync(h1Path, 'utf8'));

// Sort ascending
rawFunding.sort((a, b) => (a.fundingTime || a.timestamp) - (b.fundingTime || b.timestamp));
rawH1.sort((a, b) => a.openTime - b.openTime);

console.log(`   Funding Events (8h): ${rawFunding.length.toLocaleString()}`);
console.log(`   H1 Candles:          ${rawH1.length.toLocaleString()}`);

// 2. Build Point-in-Time Funding Index
console.log('⚙️ Indexing Point-in-Time Funding Rates...');

function getLatestFunding(h1CloseTime) {
  // Binary search for latest funding rate with fundingTime <= h1CloseTime
  let l = 0, r = rawFunding.length - 1;
  let best = -1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const fTime = rawFunding[mid].fundingTime || rawFunding[mid].timestamp;
    if (fTime <= h1CloseTime) {
      best = mid;
      l = mid + 1;
    } else {
      r = mid - 1;
    }
  }
  return best >= 0 ? rawFunding[best] : null;
}

// 3. Compute Rolling ATR(14) on H1
console.log('⚙️ Computing Rolling ATR(14) and 30-Day Volatility Regime...');

const atr14Arr = new Float64Array(rawH1.length);
for (let i = 1; i < rawH1.length; i++) {
  const cur = rawH1[i];
  const prev = rawH1[i - 1];
  const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
  if (i < 14) {
    atr14Arr[i] = tr;
  } else if (i === 14) {
    let sum = 0;
    for (let j = 1; j <= 14; j++) {
      const c = rawH1[j], p = rawH1[j - 1];
      sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    }
    atr14Arr[i] = sum / 14;
  } else {
    atr14Arr[i] = (atr14Arr[i - 1] * 13 + tr) / 14;
  }
}

// 4. Extract Synchronized Point-in-Time Events
const W_FUNDING_Z = 270; // 90 days of 8h funding rates (270 records)
const W_VOL_REGIME = 720; // 30 days of 1h bars (720 bars)
const HORIZONS = [8, 24, 48, 72, 168]; // 8h, 24h, 48h, 72h (3d), 168h (7d)

const events = [];
const fundingValues = rawFunding.map(f => parseFloat(f.fundingRate));

for (let i = W_VOL_REGIME; i < rawH1.length; i++) {
  const c = rawH1[i];
  const closeTime = c.closeTime;
  const openTime = c.openTime;
  const close = c.close;

  // 1. Point-in-Time Funding Lookup
  const fRecord = getLatestFunding(closeTime);
  if (!fRecord) continue;

  const fIndex = rawFunding.indexOf(fRecord);
  if (fIndex < W_FUNDING_Z) continue;

  const currentFunding = parseFloat(fRecord.fundingRate);

  // 2. Rolling 90-day Funding Mean & Std
  const pastFundings = fundingValues.slice(fIndex - W_FUNDING_Z, fIndex);
  const meanF = pastFundings.reduce((a, b) => a + b, 0) / pastFundings.length;
  const varF = pastFundings.reduce((a, b) => a + (b - meanF) ** 2, 0) / (pastFundings.length - 1);
  const stdF = Math.sqrt(varF) || 1e-8;
  const zFunding = (currentFunding - meanF) / stdF;

  // 3. Macro Volatility Regime V_t (vs 30d median ATR)
  const currentAtr = atr14Arr[i];
  const pastAtrs = Array.from(atr14Arr.slice(i - W_VOL_REGIME, i)).sort((a, b) => a - b);
  const medianAtr = pastAtrs[Math.floor(pastAtrs.length / 2)] || 1e-6;
  const volRatio = currentAtr / medianAtr;

  let volRegime = 'NORMAL_VOL';
  if (volRatio > 1.20) volRegime = 'EXPANDED_VOL';
  else if (volRatio < 0.80) volRegime = 'COMPRESSED_VOL';

  // 4. Forward Returns (8h, 24h, 48h, 72h, 168h)
  const forwardReturns = {};
  for (const k of HORIZONS) {
    if (i + k < rawH1.length) {
      forwardReturns[`h${k}`] = (rawH1[i + k].close - close) / close;
    } else {
      forwardReturns[`h${k}`] = null;
    }
  }

  const isOOS = openTime >= Date.parse('2025-01-01T00:00:00.000Z');

  events.push({
    index: i,
    timestamp: openTime,
    isoDate: new Date(openTime).toISOString(),
    isOOS,
    close,
    currentFunding,
    meanF,
    stdF,
    zFunding,
    currentAtr,
    medianAtr,
    volRatio,
    volRegime,
    forwardReturns
  });
}

console.log(`✅ Extracted ${events.length.toLocaleString()} total H1 synchronized funding events.`);

// 5. Save Events Dataset
const outputDir = resolve(ROOT_DIR, 'research/results/batch_036');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = resolve(outputDir, 'FUNDING_REGIME_EVENTS.json');
writeFileSync(outputPath, JSON.stringify(events, null, 2), 'utf8');

const manifest = {
  batch: 'BATCH_036',
  prereg: 'PREREG-036',
  extractedAt: new Date().toISOString(),
  totalEvents: events.length,
  inSampleEvents: events.filter(e => !e.isOOS).length,
  outOfSampleEvents: events.filter(e => e.isOOS).length,
  extremeNegativeFundingInSample: events.filter(e => !e.isOOS && e.zFunding <= -2.0).length,
  extremePositiveFundingInSample: events.filter(e => !e.isOOS && e.zFunding >= +2.0).length,
  volRegimeBreakdownInSample: {
    COMPRESSED_VOL: events.filter(e => !e.isOOS && e.volRegime === 'COMPRESSED_VOL').length,
    NORMAL_VOL: events.filter(e => !e.isOOS && e.volRegime === 'NORMAL_VOL').length,
    EXPANDED_VOL: events.filter(e => !e.isOOS && e.volRegime === 'EXPANDED_VOL').length
  }
};

writeFileSync(resolve(outputDir, 'FUNDING_REGIME_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`💾 Saved events to: ${outputPath}`);
console.log(`   In-Sample Records (2023-2024): ${manifest.inSampleEvents.toLocaleString()}`);
console.log(`   Extreme Funding Events (Z <= -2.0): ${manifest.extremeNegativeFundingInSample} records`);
console.log(`   Extreme Funding Events (Z >= +2.0): ${manifest.extremePositiveFundingInSample} records`);
console.log('='.repeat(90));

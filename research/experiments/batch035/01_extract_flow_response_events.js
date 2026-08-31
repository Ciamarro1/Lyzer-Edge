/**
 * 🏛️ LYZER EDGE — BATCH 035: PHASE 1 — FLOW-PRICE RESPONSE FEATURE EXTRACTOR
 * 
 * Dataset: Certified Binance Futures Data (H1, M15, M5) with Real Taker Volume
 * Target: Extract Point-in-Time Microstructure Events and Classify Response Regimes
 * 
 * Output: research/results/batch_035/FLOW_RESPONSE_EVENTS.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(90));
console.log('🔬 BATCH 035: PHASE 1 — FLOW-PRICE RESPONSE FEATURE EXTRACTION (PREREG-035)');
console.log('='.repeat(90));

// 1. Load Datasets
const m5Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_M5_2023_2026.json');
const h1Path = resolve(ROOT_DIR, 'research/datasets/batch035/BTCUSDT_FUTURES_H1_2023_2026.json');

if (!existsSync(m5Path) || !existsSync(h1Path)) {
  console.error('❌ Datasets missing in research/datasets/batch035/. Run download_batch035_futures.js first.');
  process.exit(1);
}

console.log('📥 Loading M5 and H1 Futures Datasets...');
const candlesM5 = JSON.parse(readFileSync(m5Path, 'utf8'));
const candlesH1 = JSON.parse(readFileSync(h1Path, 'utf8'));

candlesM5.sort((a, b) => a.openTime - b.openTime);
candlesH1.sort((a, b) => a.openTime - b.openTime);

console.log(`   M5 Candles: ${candlesM5.length.toLocaleString()}`);
console.log(`   H1 Candles: ${candlesH1.length.toLocaleString()}`);

// 2. Build H1 Macro Index for Point-in-Time Lookup (Zero Lookahead)
console.log('⚙️ Indexing H1 Macro Regime...');
const h1Map = new Map();
for (let i = 14; i < candlesH1.length; i++) {
  const c = candlesH1[i];
  // Rolling 14-period ATR on H1
  let sumTR = 0;
  for (let j = i - 13; j <= i; j++) {
    const cur = candlesH1[j];
    const prev = candlesH1[j - 1];
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    sumTR += tr;
  }
  const atr14 = sumTR / 14;
  h1Map.set(c.closeTime, {
    atr14,
    close: c.close,
    volume: c.volume
  });
}

// 3. Extract M5 Microstructure Events
console.log('⚙️ Computing M5 Real Taker VDR, Flow Intensity, Range Expansion & Response Regimes...');

const W_INTENSITY = 288; // 24 hours of 5m bars (288 bars)
const W_ATR = 14;
const W_RER = 20;
const HORIZONS = [1, 3, 6, 12, 24, 48]; // 5m, 15m, 30m, 1h, 2h, 4h

const events = [];
const tradeCounts = candlesM5.map(c => c.tradeCount);
const ranges = candlesM5.map(c => c.high - c.low);

for (let i = Math.max(W_INTENSITY, W_RER) + 1; i < candlesM5.length; i++) {
  const c = candlesM5[i];
  const open = c.open;
  const high = c.high;
  const low = c.low;
  const close = c.close;
  const volume = c.volume;
  const takerBuy = c.takerBuyBaseVolume;
  const tradeCount = c.tradeCount;

  if (volume <= 0 || open <= 0) continue;

  // 1. Real Taker Volume Delta Ratio (VDR)
  const takerSell = volume - takerBuy;
  const vdr = Math.max(-1.0, Math.min(1.0, (takerBuy - takerSell) / volume));

  // 2. Flow Intensity (FI) vs 24h rolling median trade count [i - W_INTENSITY, i - 1]
  const pastTradeCounts = tradeCounts.slice(i - W_INTENSITY, i).sort((a, b) => a - b);
  const medianTradeCount = pastTradeCounts[Math.floor(pastTradeCounts.length / 2)] || 1;
  const flowIntensity = tradeCount / medianTradeCount;

  // 3. ATR(14) on M5 [i - 13, i]
  let sumTR = 0;
  for (let j = i - W_ATR + 1; j <= i; j++) {
    const cur = candlesM5[j];
    const prev = candlesM5[j - 1];
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    sumTR += tr;
  }
  const atrM5 = sumTR / W_ATR || 1e-6;

  // 4. Relative Price Response
  const rawReturn = (close - open) / open;
  const relPriceResponse = (close - open) / atrM5;

  // 5. Range Expansion Ratio (RER) vs 20-bar median range
  const pastRanges = ranges.slice(i - W_RER, i).sort((a, b) => a - b);
  const medianRange = pastRanges[Math.floor(pastRanges.length / 2)] || 1e-6;
  const rangeExpansion = (high - low) / medianRange;

  // 6. Microstructure Response Regime Classification
  let regime = 'INDETERMINATE';
  const hasFlowShock = Math.abs(vdr) >= 0.40 && flowIntensity >= 1.5;

  if (hasFlowShock) {
    const sameDirection = Math.sign(relPriceResponse) === Math.sign(vdr);
    if (sameDirection && Math.abs(relPriceResponse) <= 1.0) {
      regime = 'TRANSMISSION'; // Flow aggressive + price compressed / under-reaction
    } else if (!sameDirection || Math.abs(relPriceResponse) < 0.20) {
      regime = 'ABSORPTION'; // Flow aggressive + price contradicts or fails to move
    } else if (Math.abs(relPriceResponse) > 2.0) {
      regime = 'EXPANDED_IMPACT'; // Immediate large price move
    }
  }

  // 7. Forward Returns (k bars)
  const forwardReturns = {};
  for (const k of HORIZONS) {
    if (i + k < candlesM5.length) {
      forwardReturns[`k${k}`] = (candlesM5[i + k].close - close) / close;
    } else {
      forwardReturns[`k${k}`] = null;
    }
  }

  const isOOS = c.openTime >= Date.parse('2025-01-01T00:00:00.000Z');

  events.push({
    index: i,
    timestamp: c.openTime,
    isoDate: new Date(c.openTime).toISOString(),
    isOOS,
    open,
    high,
    low,
    close,
    volume,
    tradeCount,
    takerBuy,
    takerSell,
    vdr,
    flowIntensity,
    hasFlowShock,
    atrM5,
    rawReturn,
    relPriceResponse,
    rangeExpansion,
    regime,
    forwardReturns
  });
}

console.log(`✅ Extracted ${events.length.toLocaleString()} total M5 event records.`);

// 4. Save Event Dataset
const outputDir = resolve(ROOT_DIR, 'research/results/batch_035');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = resolve(outputDir, 'FLOW_RESPONSE_EVENTS.json');
writeFileSync(outputPath, JSON.stringify(events, null, 2), 'utf8');

const manifest = {
  batch: 'BATCH_035',
  prereg: 'PREREG-035',
  extractedAt: new Date().toISOString(),
  totalEvents: events.length,
  inSampleEvents: events.filter(e => !e.isOOS).length,
  outOfSampleEvents: events.filter(e => e.isOOS).length,
  regimeBreakdownInSample: {
    TRANSMISSION: events.filter(e => !e.isOOS && e.regime === 'TRANSMISSION').length,
    ABSORPTION: events.filter(e => !e.isOOS && e.regime === 'ABSORPTION').length,
    EXPANDED_IMPACT: events.filter(e => !e.isOOS && e.regime === 'EXPANDED_IMPACT').length,
    INDETERMINATE: events.filter(e => !e.isOOS && e.regime === 'INDETERMINATE').length
  }
};

writeFileSync(resolve(outputDir, 'FLOW_RESPONSE_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`💾 Saved events to: ${outputPath}`);
console.log(`   In-Sample Records (2023-2024): ${manifest.inSampleEvents.toLocaleString()}`);
console.log(`   Regimes In-Sample:`, manifest.regimeBreakdownInSample);
console.log('='.repeat(90));

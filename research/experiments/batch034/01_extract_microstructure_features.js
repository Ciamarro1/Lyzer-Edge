/**
 * 🏛️ LYZER EDGE — BATCH 034: PHASE 1 — MICROSTRUCTURE FEATURE EXTRACTOR
 * 
 * Target: Extract deterministic microstructure proxies and compute absorption residuals
 * Dataset: Point-in-Time BTCUSDT Candles (2023–2026)
 * Output: research/results/batch_034/EVENT_DATASET.json
 * 
 * Strictly zero lookahead bias. Rolling parameters fitted only on past bars [t-N, t-1].
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../../');

console.log('='.repeat(80));
console.log('🔬 BATCH 034: PHASE 1 — MICROSTRUCTURE FEATURE EXTRACTION (PREREG-034)');
console.log('='.repeat(80));

// 1. Load Dataset
const datasetPath = resolve(ROOT_DIR, 'research/datasets/BTCUSDT_1h_multiyear_2023_2026.json');
if (!existsSync(datasetPath)) {
  console.error(`❌ Dataset not found at: ${datasetPath}`);
  process.exit(1);
}

const rawCandles = JSON.parse(readFileSync(datasetPath, 'utf8'));
rawCandles.sort((a, b) => a.openTime - b.openTime);

console.log(`📥 Loaded ${rawCandles.length.toLocaleString()} candles from dataset.`);
console.log(`   Start: ${new Date(rawCandles[0].openTime).toISOString()}`);
console.log(`   End:   ${new Date(rawCandles[rawCandles.length - 1].openTime).toISOString()}`);

// 2. Validate Continuity & Time Gaps
let gapCount = 0;
const expectedIntervalMs = 3600 * 1000; // 1 Hour

for (let i = 1; i < rawCandles.length; i++) {
  const diff = rawCandles[i].openTime - rawCandles[i - 1].openTime;
  if (diff !== expectedIntervalMs) {
    gapCount++;
  }
}
console.log(`🔍 Continuity Check: ${gapCount} timestamp discontinuities detected.`);

// 3. Mathematical Feature Extraction
const OLS_WINDOW = 500; // 500-bar rolling OLS for Expected Price Impact
const ZSCORE_WINDOW = 100; // 100-bar rolling window for Residual Z-Score
const FORWARD_HORIZONS = [1, 3, 6, 12, 24]; // k-bar forward return horizons

const events = [];

// Helper: Calculate Linear Regression slope and intercept on past array
function fitRollingOLS(xArr, yArr) {
  const n = xArr.length;
  if (n < 10) return { alpha: 0, beta: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xArr[i];
    sumY += yArr[i];
    sumXY += xArr[i] * yArr[i];
    sumXX += xArr[i] * xArr[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const denom = sumXX - sumX * meanX;
  if (Math.abs(denom) < 1e-12) return { alpha: meanY, beta: 0 };
  const beta = (sumXY - sumX * meanY) / denom;
  const alpha = meanY - beta * meanX;
  return { alpha, beta };
}

// Arrays for rolling estimation
const impactHistory = [];
const returnHistory = [];
const residualHistory = [];

console.log('⚙️ Computing Flow Delta, Amihud Illiquidity, Expected Impact, and Absorption Residuals...');

for (let i = 0; i < rawCandles.length; i++) {
  const c = rawCandles[i];
  const high = c.high;
  const low = c.low;
  const open = c.open;
  const close = c.close;
  const volume = c.volume;

  // Realized bar return
  const barReturn = open > 0 ? (close - open) / open : 0;

  // 1. Flow Delta Ratio (VDR proxy via Bulk Volume Classification if taker volume is not partitioned)
  let vdr = 0;
  if (c.takerBuyVolume !== undefined && volume > 0) {
    vdr = (2 * c.takerBuyVolume - volume) / volume;
  } else if (high > low) {
    // Standard intra-candle buy/sell flow proxy
    vdr = (close - open) / (high - low);
  }
  vdr = Math.max(-1.0, Math.min(1.0, vdr));

  // 2. Amihud Illiquidity Ratio Proxy (\Lambda_t)
  const dollarVolume = volume * close;
  const lambda = dollarVolume > 0 ? Math.abs(close - open) / dollarVolume : 0;

  // Impact Proxy: Flow Pressure * Illiquidity
  const impactProxy = vdr * lambda;

  impactHistory.push(impactProxy);
  returnHistory.push(barReturn);

  // We need at least OLS_WINDOW prior bars to estimate expected impact
  if (i < OLS_WINDOW) {
    residualHistory.push(0);
    continue;
  }

  // 3. Rolling OLS on past bars [i - OLS_WINDOW, i - 1] (Strictly Prior Data)
  const xSlice = impactHistory.slice(i - OLS_WINDOW, i);
  const ySlice = returnHistory.slice(i - OLS_WINDOW, i);
  const { alpha, beta } = fitRollingOLS(xSlice, ySlice);

  // 4. Expected Price Impact for current bar t
  const expectedReturn = alpha + beta * impactProxy;

  // 5. Absorption Residual \varepsilon_t
  const residual = barReturn - expectedReturn;
  residualHistory.push(residual);

  // 6. Rolling Z-Score of Residual on past [i - ZSCORE_WINDOW, i - 1]
  const resSlice = residualHistory.slice(i - ZSCORE_WINDOW, i);
  const meanRes = resSlice.reduce((acc, v) => acc + v, 0) / resSlice.length;
  const varRes = resSlice.reduce((acc, v) => acc + (v - meanRes) ** 2, 0) / resSlice.length;
  const stdRes = Math.sqrt(varRes) || 1e-6;
  const zResidual = (residual - meanRes) / stdRes;

  // 7. Compute Forward Returns R_{t+k} (Strictly for downstream statistical testing)
  const forwardReturns = {};
  for (const k of FORWARD_HORIZONS) {
    if (i + k < rawCandles.length) {
      const futureClose = rawCandles[i + k].close;
      forwardReturns[`k${k}`] = (futureClose - close) / close;
    } else {
      forwardReturns[`k${k}`] = null;
    }
  }

  // Define Sample Partition: In-Sample (2023-01-01 -> 2024-12-31) vs Out-of-Sample (2025-01-01 -> 2026-08-01)
  const candleDate = new Date(c.openTime).toISOString();
  const isOOS = c.openTime >= Date.parse('2025-01-01T00:00:00Z');

  events.push({
    index: i,
    timestamp: c.openTime,
    isoDate: candleDate,
    isOOS,
    open,
    high,
    low,
    close,
    volume,
    barReturn,
    vdr,
    lambda,
    impactProxy,
    expectedReturn,
    residual,
    zResidual,
    forwardReturns
  });
}

console.log(`✅ Extracted ${events.length.toLocaleString()} microstructure event records.`);

// 4. Save Event Dataset
const outputDir = resolve(ROOT_DIR, 'research/results/batch_034');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = resolve(outputDir, 'EVENT_DATASET.json');
writeFileSync(outputPath, JSON.stringify(events, null, 2), 'utf8');

const manifest = {
  batch: 'BATCH_034',
  prereg: 'PREREG-034',
  created: new Date().toISOString(),
  totalRecords: events.length,
  inSampleRecords: events.filter(e => !e.isOOS).length,
  outOfSampleRecords: events.filter(e => e.isOOS).length,
  olsWindow: OLS_WINDOW,
  zscoreWindow: ZSCORE_WINDOW,
  horizons: FORWARD_HORIZONS,
  continuityGaps: gapCount,
  sha256Source: '5da8350f0546641485d33abe23414ac12deb88cc7721647d7fed9c1223f2dfaf'
};

writeFileSync(resolve(outputDir, 'EVENT_DATASET_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`💾 Saved event dataset to: ${outputPath}`);
console.log(`   In-Sample Records:     ${manifest.inSampleRecords.toLocaleString()} (2023-2024)`);
console.log(`   Out-Of-Sample Records: ${manifest.outOfSampleRecords.toLocaleString()} (2025-2026 FROZEN)`);
console.log('='.repeat(80));

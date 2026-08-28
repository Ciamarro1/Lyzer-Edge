import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 1. Ingest 1H Candles
const dataset1hPath = resolve(__dirname, 'BTCUSDT_1h_multiyear_2023_2026.json');
const candles1h = JSON.parse(readFileSync(dataset1hPath, 'utf-8'));
candles1h.sort((a, b) => a.openTime - b.openTime);

console.log(`Ingested ${candles1h.length} 1H candles from 2023 to 2026.`);

// 2. Fetch Historical Funding Rates (2023 - 2026)
async function fetchAllFundingRates(startTime, endTime) {
  console.log('📥 Fetching Historical Funding Rates from Binance Futures...');
  const fundingRates = [];
  let currentStart = startTime;

  while (currentStart < endTime) {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&startTime=${currentStart}&endTime=${endTime}&limit=1000`;
    try {
      const batch = await httpsGet(url);
      if (!batch || batch.length === 0) break;
      for (const item of batch) {
        fundingRates.push({
          fundingTime: item.fundingTime,
          fundingRate: parseFloat(item.fundingRate),
          markPrice: parseFloat(item.markPrice)
        });
      }
      const lastTime = batch[batch.length - 1].fundingTime;
      currentStart = lastTime + 1000;
      await sleep(150);
    } catch (err) {
      console.warn(`Warning fetching funding rates at ${currentStart}: ${err.message}`);
      await sleep(1000);
      currentStart += (8 * 3600 * 1000);
    }
  }

  // Deduplicate
  const seen = new Set();
  const deduped = [];
  for (const f of fundingRates) {
    if (!seen.has(f.fundingTime)) {
      seen.add(f.fundingTime);
      deduped.push(f);
    }
  }
  deduped.sort((a, b) => a.fundingTime - b.fundingTime);
  return deduped;
}

// 3. Build HTF Candles (4H, 1D, 1W)
function aggregateHTF(candles, periodHours) {
  const periodMs = periodHours * 3600 * 1000;
  const buckets = new Map();

  for (const c of candles) {
    const bucketTime = Math.floor(c.openTime / periodMs) * periodMs;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, []);
    buckets.get(bucketTime).push(c);
  }

  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const result = [];

  for (const k of sortedKeys) {
    const g = buckets.get(k);
    g.sort((a, b) => a.openTime - b.openTime);
    result.push({
      openTime: k,
      timestamp: k,
      open: g[0].open,
      high: Math.max(...g.map(c => c.high)),
      low: Math.min(...g.map(c => c.low)),
      close: g[g.length - 1].close,
      volume: g.reduce((s, c) => s + (c.volume || 0), 0),
      closeTime: g[g.length - 1].closeTime || (k + periodMs - 1)
    });
  }

  return result;
}

async function main() {
  const startTime = candles1h[0].openTime;
  const endTime = candles1h[candles1h.length - 1].openTime;

  const fundingData = await fetchAllFundingRates(startTime, endTime);
  console.log(`✅ Downloaded ${fundingData.length} Funding Rate records.`);

  const candles4h = aggregateHTF(candles1h, 4);
  const candles1d = aggregateHTF(candles1h, 24);
  const candles1w = aggregateHTF(candles1h, 168); // 7 days = 168h

  console.log(`Aggregated HTF -> 4H: ${candles4h.length} | 1D: ${candles1d.length} | 1W: ${candles1w.length}`);

  // Save HTF datasets and funding
  const outputDir = resolve(__dirname, '../datasets');
  writeFileSync(resolve(outputDir, 'BTCUSDT_funding_rates_2023_2026.json'), JSON.stringify(fundingData, null, 2));
  writeFileSync(resolve(outputDir, 'BTCUSDT_4h_multiyear.json'), JSON.stringify(candles4h, null, 2));
  writeFileSync(resolve(outputDir, 'BTCUSDT_1d_multiyear.json'), JSON.stringify(candles1d, null, 2));
  writeFileSync(resolve(outputDir, 'BTCUSDT_1w_multiyear.json'), JSON.stringify(candles1w, null, 2));

  console.log('✅ HTF and Derivatives Datasets Successfully Built and Saved.');
}

main().catch(err => {
  console.error('❌ Build HTF failed:', err);
  process.exit(1);
});

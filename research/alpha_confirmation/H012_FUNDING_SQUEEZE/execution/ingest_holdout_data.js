/**
 * LYZER LABS — H012 VIRGIN HOLDOUT DATA INGESTOR
 * Script: ingest_holdout_data.js
 * 
 * Ingests official Binance Futures 8H klines and funding rates for the Virgin Holdout period:
 * 2024-12-01T00:00:00.000Z (rolling lookback initialization) -> 2026-08-31T23:59:59.999Z
 * 
 * Target Assets: BTCUSDT, ETHUSDT, SOLUSDT, AVAXUSDT, LINKUSDT, DOGEUSDT
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const rootDir = process.cwd();
const outDir = path.resolve(rootDir, 'research/alpha_confirmation/H012_FUNDING_SQUEEZE/holdout_data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];
const START_MS = 1733011200000; // 2024-12-01T00:00:00.000Z (Lookback initialization)
const END_MS = 1788220799999;   // 2026-08-31T23:59:59.999Z

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetch8hKlines(symbol) {
  console.log(`[${symbol}] Ingesting 8H Futures klines...`);
  let currentStart = START_MS;
  const klines = [];

  while (currentStart < END_MS) {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=8h&startTime=${currentStart}&endTime=${END_MS}&limit=1000`;
    let raw;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        raw = await httpsGet(url);
        break;
      } catch (e) {
        await sleep(1000 * attempt);
      }
    }

    if (!raw || !Array.isArray(raw) || raw.length === 0) break;

    for (const k of raw) {
      const openTime = Number(k[0]);
      if (openTime >= START_MS && openTime <= END_MS) {
        klines.push({
          timestamp: openTime,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        });
      }
    }

    const lastTime = Number(raw[raw.length - 1][0]);
    if (lastTime <= currentStart) break;
    currentStart = lastTime + 1;
    if (raw.length < 1000) break;
    await sleep(200);
  }

  const map = new Map();
  for (const k of klines) map.set(k.timestamp, k);
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchFundingRates(symbol) {
  console.log(`[${symbol}] Ingesting Funding Rates...`);
  let currentStart = START_MS;
  const records = [];

  while (currentStart < END_MS) {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&startTime=${currentStart}&endTime=${END_MS}&limit=1000`;
    let raw;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        raw = await httpsGet(url);
        break;
      } catch (e) {
        await sleep(1000 * attempt);
      }
    }

    if (!raw || !Array.isArray(raw) || raw.length === 0) break;

    for (const r of raw) {
      const t = Number(r.fundingTime);
      if (t >= START_MS && t <= END_MS) {
        records.push({
          fundingTime: t,
          fundingRate: parseFloat(r.fundingRate),
          markPrice: parseFloat(r.markPrice)
        });
      }
    }

    const lastTime = Number(raw[raw.length - 1].fundingTime);
    if (lastTime <= currentStart) break;
    currentStart = lastTime + 1;
    if (raw.length < 1000) break;
    await sleep(200);
  }

  const map = new Map();
  for (const r of records) map.set(r.fundingTime, r);
  return Array.from(map.values()).sort((a, b) => a.fundingTime - b.fundingTime);
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ LYZER LABS — INGESTING VIRGIN HOLDOUT DATASETS (2025-2026)');
  console.log('================================================================\n');

  for (const sym of assets) {
    const klines = await fetch8hKlines(sym);
    const funding = await fetchFundingRates(sym);

    // Synchronize by timestamp
    const fundingMap = new Map();
    for (const f of funding) {
      // normalize to exact 8h boundary
      const dt = new Date(f.fundingTime);
      dt.setUTCMinutes(0, 0, 0);
      fundingMap.set(dt.getTime(), f);
    }

    const syncedCandles = [];
    const syncedFunding = [];

    for (const k of klines) {
      if (fundingMap.has(k.timestamp)) {
        syncedCandles.push(k);
        syncedFunding.push({
          fundingTime: k.timestamp,
          fundingRate: fundingMap.get(k.timestamp).fundingRate,
          markPrice: fundingMap.get(k.timestamp).markPrice
        });
      }
    }

    const cPath = path.join(outDir, `${sym}_8h.json`);
    const fPath = path.join(outDir, `${sym}_funding_rates.json`);

    fs.writeFileSync(cPath, JSON.stringify(syncedCandles, null, 2));
    fs.writeFileSync(fPath, JSON.stringify(syncedFunding, null, 2));

    console.log(`✔ [${sym}] Synchronized ${syncedCandles.length} bars from ${new Date(syncedCandles[0].timestamp).toISOString()} to ${new Date(syncedCandles[syncedCandles.length - 1].timestamp).toISOString()}`);
    await sleep(300);
  }

  console.log('\n✔ All 6 virgin holdout datasets successfully ingested and synchronized.');
}

main().catch(err => {
  console.error('❌ Holdout ingestion failed:', err);
  process.exit(1);
});

/**
 * OFI-CONFIRMATION-SETUP-001 — SCIENTIFIC DATA INGESTION ENGINE
 * Script: acquire_confirmatory_population.js
 * 
 * Population: Historical Untouched Replication Set (2020-01-01 to 2022-12-31)
 * Protocol: CUMULATIVE_OFI_FROZEN_SPEC (v2.1)
 * Source: Binance Futures API (fapi.binance.com)
 * Output Directory: research/alpha_confirmation/OFI001/untouched_data/
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('================================================================');
console.log('📥 OFI001 — SCIENTIFIC DATA ACQUISITION & INGESTION');
console.log('Population: Historical Untouched Replication Set [2020-01-01 -> 2022-12-31]');
console.log('Timestamp UTC:', new Date().toISOString());
console.log('================================================================\n');

// 1. Invariance Check: V8 Engine
const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
const engineBuf = fs.readFileSync(enginePath);
const engineSHA = crypto.createHash('sha256').update(engineBuf).digest('hex');
const expectedSHA = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';
if (engineSHA !== expectedSHA) {
  console.error('❌ CONSTITUTIONAL BREACH: V8 engine mismatch! Aborting.');
  process.exit(1);
}
console.log('✔ V8 Engine Verified & Intact (SHA-256 matched).\n');

// Window parameters
const T_START = new Date('2020-01-01T00:00:00.000Z').getTime(); // 1577836800000
const T_END = new Date('2022-12-31T23:59:59.000Z').getTime();   // 1672531199000
const ASSETS = ['BTCUSDT', 'ETHUSDT'];
const INTERVAL = '1h';
const OUTPUT_DIR = __dirname;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Lyzer-OFI001-Historical-Acquisition/2.1' }
      });
      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          console.warn(`[HTTP ${res.status}] Rate limit / server error on ${url}. Backing off...`);
          await sleep(2000 * attempt);
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`[ATTEMPT ${attempt}/${maxRetries}] Network error: ${err.message}. Retrying...`);
      await sleep(1500 * attempt);
    }
  }
}

async function acquireKlines(symbol, startTime, endTime) {
  console.log(`\n▶ Fetching continuous 1h candles for ${symbol}: [${new Date(startTime).toISOString()} -> ${new Date(endTime).toISOString()}]`);
  let currentStart = startTime;
  const allCandles = [];
  const limit = 1000;

  while (currentStart < endTime) {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${INTERVAL}&startTime=${currentStart}&endTime=${endTime}&limit=${limit}`;
    const rawData = await fetchWithRetry(url);

    if (!Array.isArray(rawData) || rawData.length === 0) {
      break;
    }

    for (const k of rawData) {
      const openTime = Number(k[0]);
      if (openTime > endTime) break;

      allCandles.push({
        timestamp: openTime,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        close_time: Number(k[6]),
        quote_volume: parseFloat(k[7]),
        trades: parseInt(k[8], 10),
        taker_buy_volume: parseFloat(k[9]),
        taker_buy_quote_volume: parseFloat(k[10])
      });
    }

    const lastOpenTime = Number(rawData[rawData.length - 1][0]);
    if (lastOpenTime <= currentStart) {
      break;
    }
    currentStart = lastOpenTime + 3600000;
    process.stdout.write(`  Fetched up to ${new Date(lastOpenTime).toISOString().slice(0, 10)} (${allCandles.length} candles)\r`);
    await sleep(150);
  }
  console.log('');

  // Deduplicate and sort
  const map = new Map();
  for (const c of allCandles) {
    map.set(c.timestamp, c);
  }
  const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
}

export async function runAcquisition() {
  console.log(`Acquisition Window Confirmed:`);
  console.log(`  T_START: ${T_START} (${new Date(T_START).toISOString()})`);
  console.log(`  T_END:   ${T_END} (${new Date(T_END).toISOString()})`);
  console.log(`  Expected Duration: 1,096 calendar days (26,304 hours)\n`);

  const acquisitionManifest = {
    timestampUTC: new Date().toISOString(),
    populationType: 'Historical Untouched Replication Set (Reverse-Temporal Historical Holdout)',
    window: {
      tStart_UTC: new Date(T_START).toISOString(),
      tStart_ms: T_START,
      tEnd_UTC: new Date(T_END).toISOString(),
      tEnd_ms: T_END,
      totalDays: 1096,
      expectedHours: 26304
    },
    datasets: {}
  };

  for (const asset of ASSETS) {
    const candles = await acquireKlines(asset, T_START, T_END);
    const targetFile = path.join(OUTPUT_DIR, `${asset}_historical_untouched_2020_2022.json`);
    const jsonStr = JSON.stringify(candles, null, 2);
    fs.writeFileSync(targetFile, jsonStr);

    const sha256 = crypto.createHash('sha256').update(Buffer.from(jsonStr)).digest('hex');
    console.log(`✔ ${asset}: Saved ${candles.length.toLocaleString()} bars to ${path.basename(targetFile)}`);
    console.log(`  SHA-256: ${sha256}`);

    acquisitionManifest.datasets[asset] = {
      file: path.basename(targetFile),
      records: candles.length,
      firstTimestamp: candles.length > 0 ? new Date(candles[0].timestamp).toISOString() : null,
      lastTimestamp: candles.length > 0 ? new Date(candles[candles.length - 1].timestamp).toISOString() : null,
      sha256
    };
  }

  const manifestPath = path.join(OUTPUT_DIR, 'ACQUISITION_INTEL_MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(acquisitionManifest, null, 2));
  console.log(`\n✔ Acquisition Intel Manifest persisted: ${path.basename(manifestPath)}`);
}

// Run acquisition if executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runAcquisition().catch(err => {
    console.error('Acquisition error:', err);
    process.exit(1);
  });
}

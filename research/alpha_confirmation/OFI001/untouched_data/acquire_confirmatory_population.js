/**
 * OFI-CONFIRMATION-SETUP-001 — AUTOMATED DATA ACQUISITION & INTEGRITY PIPELINE
 * Script: acquire_confirmatory_population.js
 * 
 * Governance Mandate:
 * - Controlled Data Acquisition for Confirmatory Population OFI001
 * - Cutoff: T0 = 1788220800000 (2026-09-01 00:00:00 UTC)
 * - Source: Binance Futures API (fapi.binance.com)
 * - Assets: BTCUSDT (Primary), ETHUSDT (Replication)
 * - Output Directory: research/alpha_confirmation/OFI001/untouched_data/
 * - Zero Lookahead, Zero Interim Querying of Candidate Signals.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('================================================================');
console.log('📥 OFI001 — CONFIRMATORY DATA ACQUISITION ENGINE');
console.log('Timestamp UTC:', new Date().toISOString());
console.log('================================================================\n');

// 1. Invariance Check: V8 Engine
const enginePath = path.resolve(rootDir, 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
const engineBuf = fs.readFileSync(enginePath);
const engineSHA = crypto.createHash('sha256').update(engineBuf).digest('hex');
const expectedSHA = 'fc19e807255b3ecfb8351e82d7dc9d244c1e511d9aa007ac8b67b12d584b4db1';
if (engineSHA !== expectedSHA) {
  console.error('❌ CONSTITUTIONAL BREACH: V8 engine mismatch!');
  process.exit(1);
}
console.log('✔ V8 Engine Verified & Intact.\n');

const T0 = 1788220800000; // 2026-09-01 00:00:00 UTC
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
        headers: { 'User-Agent': 'Lyzer-OFI-Confirmatory-Acquisition/1.0' }
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
  console.log(`\n▶ Starting acquisition for ${symbol}: [${new Date(startTime).toISOString()} -> ${new Date(endTime).toISOString()}]`);
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
      if (openTime >= endTime) break;
      if (openTime < T0) continue; // Strict firewall

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
    await sleep(250);
  }

  // Deduplicate and sort
  const map = new Map();
  for (const c of allCandles) {
    map.set(c.timestamp, c);
  }
  const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
}

export async function runAcquisition() {
  // Query exchange server time
  const timeRes = await fetchWithRetry('https://fapi.binance.com/fapi/v1/time');
  const serverTime = Number(timeRes.serverTime);
  console.log(`Binance Server Time: ${serverTime} (${new Date(serverTime).toISOString()})`);

  if (serverTime <= T0) {
    console.error(`❌ Current server time is not past T0 (${new Date(T0).toISOString()}). Cannot acquire.`);
    return;
  }

  // Define T1: Floor to last completed 1h candle
  const T1 = Math.floor(serverTime / 3600000) * 3600000;
  console.log(`Acquisition Window Confirmed:`);
  console.log(`  T0: ${T0} (${new Date(T0).toISOString()})`);
  console.log(`  T1: ${T1} (${new Date(T1).toISOString()})`);
  console.log(`  Expected Hours: ${(T1 - T0) / 3600000} hours\n`);

  const acquisitionManifest = {
    timestampUTC: new Date().toISOString(),
    cutoffT0_UTC: new Date(T0).toISOString(),
    cutoffT0_ms: T0,
    cutoffT1_UTC: new Date(T1).toISOString(),
    cutoffT1_ms: T1,
    datasets: {}
  };

  for (const asset of ASSETS) {
    const candles = await acquireKlines(asset, T0, T1);
    const targetFile = path.join(OUTPUT_DIR, `${asset}_confirmatory_untouched.json`);
    const jsonStr = JSON.stringify(candles, null, 2);
    fs.writeFileSync(targetFile, jsonStr);

    const sha256 = crypto.createHash('sha256').update(Buffer.from(jsonStr)).digest('hex');
    console.log(`✔ ${asset}: Saved ${candles.length} bars to ${path.basename(targetFile)}`);
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

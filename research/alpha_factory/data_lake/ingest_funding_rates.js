/**
 * ALPHA FACTORY — BINANCE FUTURES FUNDING RATE INGESTOR
 * Script: ingest_funding_rates.js
 * 
 * Ingests official Binance Futures funding rate history strictly within Discovery window:
 * 2023-01-01T00:00:00.000Z (1672531200000) -> 2024-12-31T23:59:59.999Z (1735689599999)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { FirewallGuard, DISCOVERY_START_MS, DISCOVERY_END_MS } from '../core/firewall_guard.js';

const rootDir = process.cwd();
const outDir = path.resolve(rootDir, 'research/alpha_discovery/AD004/data');
const assets = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];

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

async function fetchFundingHistoryForAsset(symbol) {
  console.log(`Ingesting funding history for ${symbol}...`);
  let currentStart = DISCOVERY_START_MS;
  const records = [];

  while (currentStart < DISCOVERY_END_MS) {
    const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&startTime=${currentStart}&endTime=${DISCOVERY_END_MS}&limit=1000`;
    let res;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await httpsGet(url);
        break;
      } catch (err) {
        console.warn(`[${symbol}] Retry ${attempt}/3: ${err.message}`);
        await sleep(1000 * attempt);
      }
    }

    if (!res || !Array.isArray(res) || res.length === 0) {
      break;
    }

    for (const item of res) {
      const t = Number(item.fundingTime);
      if (t >= DISCOVERY_START_MS && t <= DISCOVERY_END_MS) {
        records.push({
          fundingTime: t,
          fundingRate: parseFloat(item.fundingRate),
          markPrice: parseFloat(item.markPrice)
        });
      }
    }

    const lastTime = Number(res[res.length - 1].fundingTime);
    if (lastTime <= currentStart) break;
    currentStart = lastTime + 1;

    if (res.length < 1000) break;
    await sleep(200);
  }

  // Deduplicate and sort
  const uniqueMap = new Map();
  for (const r of records) {
    uniqueMap.set(r.fundingTime, r);
  }
  const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.fundingTime - b.fundingTime);

  // Assert firewall bounds
  for (const r of sorted) {
    if (r.fundingTime > DISCOVERY_END_MS) {
      throw new Error(`[FIREWALL_BREACH] Funding time ${r.fundingTime} exceeds discovery boundary!`);
    }
  }

  const destPath = path.join(outDir, `${symbol}_funding_rates.json`);
  fs.writeFileSync(destPath, JSON.stringify(sorted, null, 2));
  console.log(`✔ [${symbol}] Saved ${sorted.length} funding rate records to: ${destPath}`);
  return sorted;
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ ALPHA FACTORY — INGESTING DISCOVERY FUNDING RATES (2023-2024)');
  console.log('================================================================\n');

  for (const sym of assets) {
    await fetchFundingHistoryForAsset(sym);
    await sleep(300);
  }

  console.log('\n✔ All 6 core assets successfully ingested into Discovery Data Lake.');
}

main().catch(err => {
  console.error('❌ Ingestion failure:', err);
  process.exit(1);
});

/**
 * 🏛️ ALPHA FACTORY — PROGRAM AD009: BASIS INGESTION SCRIPT
 * File: research/alpha_discovery/AD009/data/ingest_basis_data.js
 * 
 * Target: Fetch full historical delivery basis for BTCUSD & ETHUSD (CURRENT_QUARTER & NEXT_QUARTER)
 * Period: 2023-01-01 -> 2024-12-31 (Strict In-Sample Discovery Window)
 * Source: Binance COIN-M Delivery API (/futures/data/basis)
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = __dirname;

const START_MS = Date.parse('2023-01-01T00:00:00.000Z');
const END_MS = Date.parse('2024-12-31T23:59:59.999Z');

const PAIRS = ['BTCUSD', 'ETHUSD'];
const CONTRACT_TYPES = ['CURRENT_QUARTER', 'NEXT_QUARTER'];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('TIMEOUT'));
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchBasisSeries(pair, contractType) {
  console.log(`Ingesting ${pair} ${contractType}...`);
  const results = [];
  let currentStart = START_MS;

  while (currentStart < END_MS) {
    const url = `https://dapi.binance.com/futures/data/basis?pair=${pair}&contractType=${contractType}&period=1d&startTime=${currentStart}&endTime=${END_MS}&limit=500`;
    const batch = await httpsGet(url);

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      const ts = Number(item.timestamp);
      if (ts >= START_MS && ts <= END_MS) {
        results.push({
          timestamp: ts,
          pair: item.pair,
          contractType: item.contractType,
          indexPrice: parseFloat(item.indexPrice),
          futuresPrice: parseFloat(item.futuresPrice),
          basis: parseFloat(item.basis),
          basisRate: parseFloat(item.basisRate),
          annualizedBasisRate: parseFloat(item.annualizedBasisRate)
        });
      }
    }

    const lastTs = Number(batch[batch.length - 1].timestamp);
    if (lastTs >= END_MS || batch.length < 500) {
      break;
    }
    currentStart = lastTs + 1;
    await sleep(250); // Be respectful of public rate limits
  }

  // Deduplicate and sort
  const uniqueMap = new Map();
  for (const r of results) {
    uniqueMap.set(r.timestamp, r);
  }
  const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // Firewall guard assertion: no record beyond 2024-12-31
  for (const r of sorted) {
    if (r.timestamp > END_MS) {
      throw new Error(`[FIREWALL_BREACH] Record timestamp ${r.timestamp} exceeds discovery boundary ${END_MS}!`);
    }
  }

  const outPath = path.join(DATA_DIR, `${pair}_${contractType}_1d.json`);
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));
  console.log(`✔ Saved ${sorted.length} records to ${path.basename(outPath)} (${new Date(sorted[0].timestamp).toISOString().slice(0,10)} -> ${new Date(sorted[sorted.length-1].timestamp).toISOString().slice(0,10)})`);
  return sorted;
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ ALPHA FACTORY — AD009: HISTORICAL BASIS DATA INGESTION');
  console.log('================================================================\n');

  for (const pair of PAIRS) {
    for (const ct of CONTRACT_TYPES) {
      await fetchBasisSeries(pair, ct);
      await sleep(300);
    }
  }

  console.log('\n✔ All basis datasets successfully ingested and verified against firewall!');
}

main().catch(err => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});

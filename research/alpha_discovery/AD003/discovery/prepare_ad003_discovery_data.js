/**
 * AD003 DISCOVERY DATA PREPARATION & FIREWALL INGESTION
 * Script: prepare_ad003_discovery_data.js
 * 
 * Strict Firewall Rules:
 * - Period: 2023-01-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z (strictly 2 years).
 * - ZERO access to 2025-2026.
 * - Timeframe 1H excluded from candidate outputs.
 * - Core Assets: BTCUSDT, ETHUSDT, SOLUSDT, AVAXUSDT, LINKUSDT, DOGEUSDT.
 * - Timeframes Generated: 15m, 30m, 2h, 4h.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

const START_MS = 1672531200000; // 2023-01-01T00:00:00.000Z
const END_MS   = 1735689599999; // 2024-12-31T23:59:59.999Z

const TARGET_ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOGEUSDT'];
const outDir = path.resolve(rootDir, 'research/alpha_discovery/AD003/data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 429 || res.statusCode === 418) {
        const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
        reject(new Error(`RATE_LIMITED:${retryAfter}`));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP_${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON_PARSE_ERROR:${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Download 15m candles iteratively from Binance API
async function download15m(symbol) {
  const cacheFile = path.join(outDir, `${symbol}_15m.json`);
  if (fs.existsSync(cacheFile)) {
    const existing = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (existing.length >= 70000 && existing[0].timestamp === START_MS && existing[existing.length - 1].timestamp <= END_MS) {
      console.log(`   ✔ Cache valid for ${symbol} 15m: ${existing.length.toLocaleString()} candles.`);
      return existing;
    }
  }

  console.log(`   📥 Downloading 15m klines for ${symbol} (2023-01-01 to 2024-12-31)...`);
  let currentStart = START_MS;
  const candles = [];

  while (currentStart <= END_MS) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&startTime=${currentStart}&endTime=${END_MS}&limit=1000`;
    let raw = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        raw = await httpsGet(url);
        break;
      } catch (err) {
        if (err.message.startsWith('RATE_LIMITED')) {
          console.warn(`      Rate limited, sleeping 5s...`);
          await sleep(5000);
        } else {
          await sleep(1000 * (attempt + 1));
        }
      }
    }

    if (!raw || raw.length === 0) break;

    for (const k of raw) {
      const ts = Number(k[0]);
      if (ts > END_MS) break;
      candles.push({
        timestamp: ts,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      });
    }

    const lastTs = Number(raw[raw.length - 1][0]);
    if (lastTs >= END_MS || raw.length < 1000) break;
    currentStart = lastTs + 15 * 60 * 1000;
    await sleep(80); // gentle rate limit throttle
  }

  candles.sort((a, b) => a.timestamp - b.timestamp);
  fs.writeFileSync(cacheFile, JSON.stringify(candles));
  console.log(`   ✔ Completed ${symbol} 15m: ${candles.length.toLocaleString()} candles.`);
  return candles;
}

// Aggregate 30m from 15m with exact precision
function aggregate30m(candles15m, symbol) {
  const candles30m = [];
  const n = candles15m.length;
  const stepMs = 30 * 60 * 1000;

  for (let i = 0; i < n; i++) {
    const c1 = candles15m[i];
    // Check if candle starts on half-hour boundary
    const is30mStart = (c1.timestamp % stepMs) === 0;
    if (is30mStart && i + 1 < n) {
      const c2 = candles15m[i + 1];
      if (c2.timestamp === c1.timestamp + 15 * 60 * 1000) {
        candles30m.push({
          timestamp: c1.timestamp,
          open: c1.open,
          high: Math.max(c1.high, c2.high),
          low: Math.min(c1.low, c2.low),
          close: c2.close,
          volume: Number((c1.volume + c2.volume).toFixed(4))
        });
        i++; // skip next 15m bar
      }
    }
  }

  const outPath = path.join(outDir, `${symbol}_30m.json`);
  fs.writeFileSync(outPath, JSON.stringify(candles30m));
  console.log(`   ✔ Aggregated ${symbol} 30m: ${candles30m.length.toLocaleString()} candles.`);
  return candles30m;
}

// Slices 1h candles to 2023-2024 and aggregates 2h and 4h
function aggregateHTF(symbol) {
  const batch039Path = path.resolve(rootDir, `research/datasets/batch039/${symbol}_1h.json`);
  if (!fs.existsSync(batch039Path)) {
    throw new Error(`Missing 1h base dataset for ${symbol} at: ${batch039Path}`);
  }
  const raw1h = JSON.parse(fs.readFileSync(batch039Path, 'utf8'));
  raw1h.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  // STRICT FIREWALL FILTER: strictly [START_MS, END_MS]
  const sliced1h = raw1h.filter(c => c.timestamp >= START_MS && c.timestamp <= END_MS);

  // Aggregate 2h
  const candles2h = [];
  const step2hMs = 2 * 3600 * 1000;
  for (let i = 0; i < sliced1h.length; i++) {
    const c1 = sliced1h[i];
    if ((c1.timestamp % step2hMs) === 0 && i + 1 < sliced1h.length) {
      const c2 = sliced1h[i + 1];
      if (c2.timestamp === c1.timestamp + 3600 * 1000) {
        candles2h.push({
          timestamp: c1.timestamp,
          open: c1.open,
          high: Math.max(c1.high, c2.high),
          low: Math.min(c1.low, c2.low),
          close: c2.close,
          volume: Number((c1.volume + c2.volume).toFixed(4))
        });
        i++;
      }
    }
  }
  const path2h = path.join(outDir, `${symbol}_2h.json`);
  fs.writeFileSync(path2h, JSON.stringify(candles2h));
  console.log(`   ✔ Aggregated ${symbol} 2h: ${candles2h.length.toLocaleString()} candles.`);

  // Aggregate 4h
  const candles4h = [];
  const step4hMs = 4 * 3600 * 1000;
  for (let i = 0; i < sliced1h.length; i++) {
    const c1 = sliced1h[i];
    if ((c1.timestamp % step4hMs) === 0 && i + 3 < sliced1h.length) {
      const c2 = sliced1h[i + 1];
      const c3 = sliced1h[i + 2];
      const c4 = sliced1h[i + 3];
      if (
        c2.timestamp === c1.timestamp + 3600 * 1000 &&
        c3.timestamp === c1.timestamp + 2 * 3600 * 1000 &&
        c4.timestamp === c1.timestamp + 3 * 3600 * 1000
      ) {
        candles4h.push({
          timestamp: c1.timestamp,
          open: c1.open,
          high: Math.max(c1.high, c2.high, c3.high, c4.high),
          low: Math.min(c1.low, c2.low, c3.low, c4.low),
          close: c4.close,
          volume: Number((c1.volume + c2.volume + c3.volume + c4.volume).toFixed(4))
        });
        i += 3;
      }
    }
  }
  const path4h = path.join(outDir, `${symbol}_4h.json`);
  fs.writeFileSync(path4h, JSON.stringify(candles4h));
  console.log(`   ✔ Aggregated ${symbol} 4h: ${candles4h.length.toLocaleString()} candles.`);

  return { candles2h, candles4h };
}

async function main() {
  console.log('================================================================');
  console.log('🏛️ AD003 DISCOVERY DATASET PREPARATION (2023-01-01 -> 2024-12-31)');
  console.log('================================================================\n');

  const datasetManifest = {
    program: 'ALPHA_DISCOVERY_AD003',
    period: '2023-01-01T00:00:00.000Z to 2024-12-31T23:59:59.999Z',
    startMs: START_MS,
    endMs: END_MS,
    targetAssets: TARGET_ASSETS,
    timeframes: ['15m', '30m', '2h', '4h'],
    holdoutStatus: '2025-2026 STRICTLY SEALED',
    files: {}
  };

  for (const sym of TARGET_ASSETS) {
    console.log(`\nProcessing ${sym}:`);
    const c15m = await download15m(sym);
    const c30m = aggregate30m(c15m, sym);
    const { candles2h, candles4h } = aggregateHTF(sym);

    for (const tf of ['15m', '30m', '2h', '4h']) {
      const p = path.join(outDir, `${sym}_${tf}.json`);
      const buf = fs.readFileSync(p);
      datasetManifest.files[`${sym}_${tf}`] = {
        sha256: crypto.createHash('sha256').update(buf).digest('hex'),
        sizeBytes: buf.length,
        candlesCount: JSON.parse(buf.toString()).length
      };
    }
  }

  const manifestPath = path.join(outDir, 'AD003_DISCOVERY_DATASET_MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(datasetManifest, null, 2));

  console.log('\n================================================================');
  console.log(`🎉 ALL 24 DATASETS (6 assets x 4 timeframes) READY & MANIFESTED.`);
  console.log(`Manifest saved at: ${manifestPath}`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('❌ Data preparation failed:', err);
  process.exit(1);
});

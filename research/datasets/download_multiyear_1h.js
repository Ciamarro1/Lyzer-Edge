import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
const LIMIT = 1000;
const BASE_URLS = [
  'https://api.binance.com',
  'https://data-api.binance.vision',
  'https://api1.binance.com'
];

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 429 || res.statusCode === 418) {
        const retryAfter = parseInt(res.headers['retry-after'] || '5', 10);
        reject(new Error(`RATE_LIMITED:${retryAfter}`));
        return;
      }
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

async function fetchKlines(symbol, interval, startTime, endTime, limit = 1000) {
  const params = `symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const base of BASE_URLS) {
      try {
        const url = `${base}/api/v3/klines?${params}`;
        const raw = await httpsGet(url);
        return raw.map(k => ({
          openTime: k[0],
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closeTime: k[6]
        }));
      } catch (err) {
        if (err.message.startsWith('RATE_LIMITED:')) {
          const waitSec = parseInt(err.message.split(':')[1], 10);
          console.warn(`⚠️ Rate limited. Waiting ${waitSec}s...`);
          await sleep(waitSec * 1000);
          continue;
        }
        continue;
      }
    }
    await sleep(2000);
  }
  throw new Error(`Failed to fetch klines for ${symbol}`);
}

async function main() {
  const startTime = new Date('2023-01-01T00:00:00.000Z').getTime();
  const endTime = new Date('2026-08-27T00:00:00.000Z').getTime();

  console.log('='.repeat(70));
  console.log(`📥 DOWNLOADING MULTI-YEAR DATASET: BTCUSDT 1H (2023 - 2026)`);
  console.log(`   Start: ${new Date(startTime).toISOString()} (${startTime})`);
  console.log(`   End  : ${new Date(endTime).toISOString()} (${endTime})`);
  console.log('='.repeat(70));

  const allCandles = [];
  let currentStart = startTime;
  let requestCount = 0;

  while (currentStart < endTime) {
    requestCount++;
    process.stdout.write(`\r📥 Fetching batch ${requestCount}... Current timestamp: ${new Date(currentStart).toISOString().slice(0, 10)}`);
    const batch = await fetchKlines(SYMBOL, INTERVAL, currentStart, endTime, LIMIT);
    if (batch.length === 0) break;

    allCandles.push(...batch);
    const lastOpen = batch[batch.length - 1].openTime;
    currentStart = lastOpen + (60 * 60 * 1000); // next hour

    if (batch.length < LIMIT && currentStart >= endTime) break;
    await sleep(150);
  }

  // Deduplicate and sort
  const seen = new Set();
  const deduped = [];
  for (const c of allCandles) {
    if (!seen.has(c.openTime) && c.openTime >= startTime && c.openTime <= endTime) {
      seen.add(c.openTime);
      deduped.push(c);
    }
  }
  deduped.sort((a, b) => a.openTime - b.openTime);

  // Check gaps
  const gaps = [];
  for (let i = 1; i < deduped.length; i++) {
    const diff = deduped[i].openTime - deduped[i - 1].openTime;
    if (diff !== 3600000) {
      gaps.push({ from: deduped[i - 1].openTime, to: deduped[i].openTime, missingHours: (diff / 3600000) - 1 });
    }
  }

  const outputPath = resolve(__dirname, 'BTCUSDT_1h_multiyear_2023_2026.json');
  const jsonContent = JSON.stringify(deduped, null, 2);
  writeFileSync(outputPath, jsonContent);

  const fileHash = crypto.createHash('sha256').update(jsonContent).digest('hex');

  console.log(`\n\n✅ Download Complete:`);
  console.log(`   Total Candles: ${deduped.length}`);
  console.log(`   Gaps Detected: ${gaps.length}`);
  console.log(`   Output File  : ${outputPath}`);
  console.log(`   SHA-256 Hash : ${fileHash}`);
}

main().catch(err => {
  console.error('\n❌ Download failed:', err);
  process.exit(1);
});

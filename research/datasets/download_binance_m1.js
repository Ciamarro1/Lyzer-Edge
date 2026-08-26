/**
 * @fileoverview Binance Historical Klines Downloader
 * Downloads M1 (1-minute) klines from Binance public API.
 * No API key required for public market data.
 * 
 * Usage: node research/datasets/download_binance_m1.js [--symbol BTCUSDT] [--days 90]
 * 
 * Output: research/datasets/{SYMBOL}_1m_{DAYS}d.json
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Configuration ---
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const SYMBOL = getArg('symbol', 'BTCUSDT');
const DAYS = parseInt(getArg('days', '90'), 10);
const INTERVAL = '1m';
const LIMIT = 1000; // Binance max per request
const BASE_URLS = [
  'https://api.binance.com',
  'https://data-api.binance.vision',
  'https://api1.binance.com',
];

// --- HTTP Client ---
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

/**
 * Fetches klines from Binance with retry logic across multiple endpoints.
 */
async function fetchKlines(symbol, interval, startTime, endTime, limit = 1000) {
  const params = `symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const base of BASE_URLS) {
      try {
        const url = `${base}/api/v3/klines?${params}`;
        const raw = await httpsGet(url);
        
        // Convert Binance array format to clean objects
        return raw.map(k => ({
          openTime: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closeTime: k[6],
        }));
      } catch (err) {
        if (err.message.startsWith('RATE_LIMITED:')) {
          const waitSec = parseInt(err.message.split(':')[1], 10);
          console.warn(`⚠️  Rate limited. Waiting ${waitSec}s...`);
          await sleep(waitSec * 1000);
          continue;
        }
        // Try next endpoint
        continue;
      }
    }
    // All endpoints failed, wait and retry
    console.warn(`⚠️  All endpoints failed on attempt ${attempt + 1}. Retrying in 3s...`);
    await sleep(3000);
  }
  
  throw new Error(`Failed to fetch klines for ${symbol} after all retries`);
}

// --- Main ---
async function main() {
  const now = Date.now();
  const endTime = now;
  const startTime = now - (DAYS * 24 * 60 * 60 * 1000);
  const totalCandles = DAYS * 24 * 60; // 1 candle per minute
  const totalRequests = Math.ceil(totalCandles / LIMIT);
  
  console.log('='.repeat(60));
  console.log(`🔬 LYZER EDGE — HISTORICAL DATA DOWNLOADER`);
  console.log(`   Symbol: ${SYMBOL}`);
  console.log(`   Interval: ${INTERVAL}`);
  console.log(`   Period: ${DAYS} days`);
  console.log(`   Expected candles: ~${totalCandles.toLocaleString()}`);
  console.log(`   Estimated requests: ~${totalRequests}`);
  console.log('='.repeat(60));
  
  const allCandles = [];
  let currentStart = startTime;
  let requestCount = 0;
  
  while (currentStart < endTime) {
    requestCount++;
    const pct = ((currentStart - startTime) / (endTime - startTime) * 100).toFixed(1);
    
    process.stdout.write(`\r📥 Downloading... ${pct}% (${allCandles.length.toLocaleString()} candles, request ${requestCount}/${totalRequests})`);
    
    const batch = await fetchKlines(SYMBOL, INTERVAL, currentStart, endTime, LIMIT);
    
    if (batch.length === 0) break;
    
    allCandles.push(...batch);
    
    // Move start to after the last candle we received
    currentStart = batch[batch.length - 1].openTime + 60000; // +1 minute
    
    // Respect rate limits: ~10 requests/second is safe
    await sleep(120);
  }
  
  // --- Deduplication ---
  const seen = new Set();
  const deduped = [];
  for (const c of allCandles) {
    if (!seen.has(c.openTime)) {
      seen.add(c.openTime);
      deduped.push(c);
    }
  }
  
  // Sort by openTime
  deduped.sort((a, b) => a.openTime - b.openTime);
  
  // --- Integrity Validation ---
  console.log('\n\n📊 Validating data integrity...');
  
  let gaps = 0;
  let maxGapMs = 0;
  for (let i = 1; i < deduped.length; i++) {
    const diff = deduped[i].openTime - deduped[i - 1].openTime;
    if (diff > 2 * 60 * 1000) { // Gap > 2 minutes
      gaps++;
      if (diff > maxGapMs) maxGapMs = diff;
    }
  }
  
  const firstDate = new Date(deduped[0].openTime).toISOString().slice(0, 19);
  const lastDate = new Date(deduped[deduped.length - 1].openTime).toISOString().slice(0, 19);
  const actualDays = ((deduped[deduped.length - 1].openTime - deduped[0].openTime) / 86400000).toFixed(1);
  
  // --- Save ---
  const filename = `${SYMBOL}_1m_${DAYS}d.json`;
  const outputPath = join(__dirname, filename);
  writeFileSync(outputPath, JSON.stringify(deduped));
  
  const fileSizeMB = (Buffer.byteLength(JSON.stringify(deduped)) / (1024 * 1024)).toFixed(1);
  
  // --- Integrity Report ---
  console.log('='.repeat(60));
  console.log('✅ DOWNLOAD COMPLETE — INTEGRITY REPORT');
  console.log('='.repeat(60));
  console.log(`   File: ${filename}`);
  console.log(`   Size: ${fileSizeMB} MB`);
  console.log(`   Candles: ${deduped.length.toLocaleString()}`);
  console.log(`   Period: ${firstDate} → ${lastDate}`);
  console.log(`   Duration: ${actualDays} days`);
  console.log(`   Gaps > 2min: ${gaps}`);
  if (gaps > 0) {
    console.log(`   Max gap: ${(maxGapMs / 60000).toFixed(1)} minutes`);
  }
  console.log(`   Duplicates removed: ${allCandles.length - deduped.length}`);
  console.log('='.repeat(60));
  
  if (gaps > 10) {
    console.warn('⚠️  WARNING: More than 10 gaps detected. Data quality may be compromised.');
  }
  
  // --- Hash for reproducibility ---
  const { createHash } = await import('crypto');
  const hash = createHash('sha256')
    .update(JSON.stringify(deduped.map(c => c.openTime)))
    .digest('hex')
    .slice(0, 16);
  console.log(`   Dataset Hash: ${hash}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});

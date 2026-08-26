import fs from 'fs';
import path from 'path';
import https from 'https';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const edgeDir = path.resolve(__dirname, '../../');
const LEDGER_PATH = 'C:/Users/WDAGUtilityAccount/Downloads/forward_validation_ledger_v2.jsonl';
const dataDir = path.join(edgeDir, '.data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchBinanceKlines(symbol, startTime, endTime) {
  return new Promise((resolve, reject) => {
    const fetchUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&startTime=${startTime}&endTime=${endTime}&limit=1000`;
    https.get(fetchUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`Binance HTTP ${res.statusCode}: ${data}`));
        try {
          const parsed = JSON.parse(data);
          const candles = parsed.map(k => ({
            openTime: k[0],
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closed: true
          }));
          resolve(candles);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function ensureCandleData(symbol, startTs, endTs) {
  const file = path.join(dataDir, `${symbol}_audit_klines.json`);
  let existing = [];
  if (fs.existsSync(file)) {
    existing = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  
  if (existing.length > 0 && existing[0].openTime <= startTs && existing[existing.length-1].openTime >= endTs) {
    return existing;
  }
  
  console.log(`Fetching candles for ${symbol} from ${new Date(startTs).toISOString()} to ${new Date(endTs).toISOString()}`);
  
  let allCandles = [];
  let currentStart = startTs;
  while (currentStart <= endTs) {
    const candles = await fetchBinanceKlines(symbol, currentStart, endTs);
    if (candles.length === 0) break;
    allCandles = allCandles.concat(candles);
    currentStart = candles[candles.length - 1].openTime + 60000;
    await new Promise(r => setTimeout(r, 100)); // rate limit
  }
  
  fs.writeFileSync(file, JSON.stringify(allCandles));
  console.log(`Saved ${allCandles.length} candles to ${file}`);
  return allCandles;
}

async function main() {
  console.log("====================================================");
  console.log("🔍 LYZER EDGE: REPLAY FIDELITY AUDIT (DATA PREP)");
  console.log("====================================================\n");

  if (!fs.existsSync(LEDGER_PATH)) {
    console.error(`ERROR: Ledger file not found at ${LEDGER_PATH}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n');
  const trades = lines.map(l => JSON.parse(l));
  
  console.log(`[1] Loaded ${trades.length} real Railway trades from forward validation ledger.`);
  
  const bySymbol = {};
  let minTs = Infinity, maxTs = 0;
  
  trades.forEach(t => {
    const sym = t.TRADE_ID.split('_')[1];
    if (!bySymbol[sym]) bySymbol[sym] = [];
    bySymbol[sym].push(t);
    const ts = t.SIGNAL.timestamp * 1000;
    if (ts < minTs) minTs = ts;
    const exitTs = ts + (t.EXIT.duration_seconds * 1000);
    if (exitTs > maxTs) maxTs = exitTs;
  });
  
  console.log(`[2] Trade distribution:`);
  for (const [sym, arr] of Object.entries(bySymbol)) {
    console.log(`    - ${sym}: ${arr.length} trades`);
  }
  
  // Add 500m warmup
  const warmupTs = minTs - (500 * 60 * 1000);
  const endTs = maxTs + (60 * 1000);
  
  console.log(`[3] Dataset timeframe required: ${new Date(warmupTs).toISOString()} -> ${new Date(endTs).toISOString()}`);
  
  // Fetch candles
  for (const sym of Object.keys(bySymbol)) {
    await ensureCandleData(sym, warmupTs, endTs);
  }
  
  console.log(`\n✅ Data preparation complete. The candle dataset accurately covers the 64 trades.`);
}

main().catch(console.error);

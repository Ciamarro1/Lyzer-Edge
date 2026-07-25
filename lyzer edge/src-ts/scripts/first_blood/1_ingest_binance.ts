import fs from 'fs';
import path from 'path';

/**
 * Stage A: Historical Ingestion
 * 
 * Fetches BTCUSDT 1h klines from Binance Public API.
 * Target: Minimum 5 years (2019-01-01 to 2024-01-01).
 * Handles pagination and basic rate limit delays to avoid IP bans.
 */

const SYMBOL = 'BTCUSDT';
const INTERVAL = '1h';
// 2019-01-01 00:00:00 UTC
const START_TIME = 1546300800000;
// 2024-01-01 00:00:00 UTC
const END_TIME = 1704067200000;
const LIMIT = 1000; // Binance max per request

const DATA_DIR = path.join(__dirname, '../../../data/empirical');
const OUTPUT_FILE = path.join(DATA_DIR, 'btcusdt_1h_5y.json');

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchKlines(startTime: number, endTime: number): Promise<any[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${INTERVAL}&startTime=${startTime}&endTime=${endTime}&limit=${LIMIT}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

async function ingest() {
  console.log(`[STAGE A] Starting Historical Ingestion for ${SYMBOL} ${INTERVAL}`);
  console.log(`Target: ${new Date(START_TIME).toISOString()} to ${new Date(END_TIME).toISOString()}`);
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let currentStartTime = START_TIME;
  let allBars: any[] = [];
  let calls = 0;

  while (currentStartTime < END_TIME) {
    try {
      const klines = await fetchKlines(currentStartTime, END_TIME);
      if (klines.length === 0) {
        console.log(`No more data returned from API. Halting.`);
        break;
      }

      // Format: [OpenTime, Open, High, Low, Close, Volume, CloseTime, QuoteAssetVolume, Trades, TakerBuyBase, TakerBuyQuote, Ignore]
      const formattedBars = klines.map(k => ({
        timestampMs: k[0],
        symbol: SYMBOL,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTimeMs: k[6]
      }));

      allBars.push(...formattedBars);
      
      const lastBar = formattedBars[formattedBars.length - 1];
      console.log(`Fetched ${klines.length} bars. Latest: ${new Date(lastBar.timestampMs).toISOString()}`);
      
      // Advance the window to 1 millisecond after the last fetched bar
      currentStartTime = lastBar.timestampMs + 1;
      
      calls++;
      // Sleep to respect rate limits (Binance allows 1200 weight/min, this call is weight 2)
      // 50ms delay is extremely safe
      await sleep(100);

    } catch (error) {
      console.error(`[ERROR] Failed to fetch at ${new Date(currentStartTime).toISOString()}`, error);
      console.log(`Sleeping for 5 seconds before retrying...`);
      await sleep(5000);
    }
  }

  console.log(`[STAGE A] Ingestion complete. Total bars fetched: ${allBars.length}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allBars, null, 2));
  console.log(`[STAGE A] Saved dataset to ${OUTPUT_FILE}`);
}

ingest().catch(console.error);

import fs from 'fs/promises';
import path from 'path';

const ASSETS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'];
const INTERVAL = '5m';
const LIMIT = 1000;
const YEARS = 3;
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

async function fetchKlines(symbol, startTime, endTime) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${INTERVAL}&startTime=${startTime}&endTime=${endTime}&limit=${LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 429) {
            console.warn(`[API] Rate limit hit. Waiting 10 seconds...`);
            await new Promise(r => setTimeout(r, 10000));
            return fetchKlines(symbol, startTime, endTime);
        }
        throw new Error(`Failed to fetch ${symbol}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
}

async function downloadAssetHistory(symbol) {
    const endTime = Date.now();
    const startTime = endTime - (YEARS * MS_PER_YEAR);
    let currentStart = startTime;
    let allCandles = [];
    
    console.log(`[DOWNLOADER] Starting ${symbol} for past ${YEARS} years...`);
    
    // We will save to a JSON lines format or just a massive JSON array per asset to avoid memory bloat
    const filename = path.join(process.cwd(), `historical_data_${symbol}.json`);
    
    while (currentStart < endTime) {
        try {
            const batch = await fetchKlines(symbol, currentStart, endTime);
            if (batch.length === 0) break;
            
            const parsed = batch.map(d => ({
                openTime: d[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            }));
            
            allCandles = allCandles.concat(parsed);
            
            // Advance the start time to the last candle's time + 1ms
            currentStart = parsed[parsed.length - 1].openTime + 1;
            
            if (allCandles.length % 10000 === 0) {
                console.log(`[DOWNLOADER] ${symbol}: Fetched ${allCandles.length} candles...`);
            }
            
            // Small delay to respect rate limits (1200 weight / min -> ~20 req/sec)
            await new Promise(r => setTimeout(r, 50)); 
            
        } catch (e) {
            console.error(`[DOWNLOADER] Error fetching ${symbol}:`, e.message);
            await new Promise(r => setTimeout(r, 5000)); // wait and retry
        }
    }
    
    console.log(`[DOWNLOADER] Finished ${symbol}. Total candles: ${allCandles.length}. Saving to disk...`);
    await fs.writeFile(filename, JSON.stringify(allCandles));
    console.log(`[DOWNLOADER] Saved ${filename}`);
}

async function run() {
    console.log("=== STARTING 3-YEAR BULK DOWNLOADER ===");
    // Download assets sequentially to not explode RAM, or concurrently with limit
    for (const asset of ASSETS) {
        await downloadAssetHistory(asset);
    }
    console.log("=== ALL ASSETS DOWNLOADED ===");
}

run().catch(console.error);

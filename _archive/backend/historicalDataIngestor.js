import fs from 'fs';
import path from 'path';
import { CausalMemoryDB } from './db.js';

const db = new CausalMemoryDB();

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'GBPUSDT'];
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];
// Download 1 full year for immediate causal robustness. 
// Can be changed to 2023-01-01 for 3 years, but 1 year is ~500k candles per TF, total 3 million candles.
// This ensures we won't wait an hour downloading via REST API while still giving us immense cross-regime data.
const START_TIME = new Date('2024-01-01T00:00:00Z').getTime();
const END_TIME = new Date('2025-01-01T00:00:00Z').getTime();

async function fetchKlines(symbol, interval, startTime, endTime) {
    let currentStartTime = startTime;
    let totalIngested = 0;
    
    console.log(`[INGEST] Starting ${interval} for ${symbol} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

    while (currentStartTime < endTime) {
        // data-api.binance.vision is the geo-unrestricted endpoint
        const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${currentStartTime}&endTime=${endTime}&limit=1000`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`[WARN] Rate limited! Waiting 5s...`);
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.length === 0) break;

            const mappedData = data.map(k => ({
                t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]), T: k[6]
            }));

            // Insert directly to DB batch
            await db.insertBatch(symbol, interval, mappedData);
            
            totalIngested += data.length;
            currentStartTime = data[data.length - 1][0] + 1;

            if (totalIngested % 10000 === 0) {
                console.log(`[INGEST] ${symbol} ${interval}: Ingested ${totalIngested} candles...`);
            }
            
            await new Promise(r => setTimeout(r, 50)); 
            
        } catch (error) {
            console.error(`[ERROR] Fetching ${interval}:`, error.message);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`[INGEST] ${symbol} ${interval} COMPLETE. Total: ${totalIngested} candles.`);
}

async function run() {
    console.log("=== Lyzer Labs: Massive Causal Memory Ingestor ===");
    for (const symbol of SYMBOLS) {
        for (const tf of TIMEFRAMES) {
            await fetchKlines(symbol, tf, START_TIME, END_TIME);
        }
    }
    console.log("=== Massive Ingestion Complete ===");
    db.close();
}

run();

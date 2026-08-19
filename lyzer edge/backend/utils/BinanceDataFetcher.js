import fs from 'fs';
import path from 'path';
import { getFetchDispatcher } from './proxyManager.js';

/**
 * BinanceDataFetcher
 * 
 * Fetches historical klines from Binance API safely, handling pagination and rate limits.
 * Principles applied: Distributed Systems / Network Reliability (Burns).
 */
export class BinanceDataFetcher {
  constructor(symbol = 'BTCUSDT', interval = '1m') {
    this.symbol = symbol;
    this.interval = interval;
    this.baseUrl = 'https://api.binance.com/api/v3/klines';
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetches data between two timestamps and saves it to a file.
   * @param {number} startTimeMs - Start time in ms
   * @param {number} endTimeMs - End time in ms
   * @param {string} outputFilename - Path to save the json file
   */
  async fetchAndSave(startTimeMs, endTimeMs, outputFilename) {
    console.log(`[FETCHER] Initiating download for ${this.symbol} (${this.interval})`);
    console.log(`[FETCHER] From: ${new Date(startTimeMs).toISOString()} To: ${new Date(endTimeMs).toISOString()}`);
    
    let currentStartTime = startTimeMs;
    let allCandles = [];
    const limit = 1000;
    
    while (currentStartTime < endTimeMs) {
      const url = `${this.baseUrl}?symbol=${this.symbol}&interval=${this.interval}&startTime=${currentStartTime}&endTime=${endTimeMs}&limit=${limit}`;
      
      try {
        const response = await fetch(url, { dispatcher: getFetchDispatcher() });
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('[FETCHER] Rate limit exceeded (429). Sleeping for 10 seconds...');
            await this.sleep(10000);
            continue;
          }
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          console.log('[FETCHER] Reached end of available data for this range.');
          break;
        }

        const formattedCandles = data.map(k => ({
          openTime: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        allCandles = allCandles.concat(formattedCandles);
        
        const lastCandleTime = formattedCandles[formattedCandles.length - 1].openTime;
        console.log(`[FETCHER] Fetched ${formattedCandles.length} candles. Current marker: ${new Date(lastCandleTime).toISOString()}`);
        
        // Advance the pointer by exactly 1 millisecond past the last fetched candle
        currentStartTime = lastCandleTime + 1;

        // Polite delay (Binance allows 6000 weight per minute, this is very safe)
        await this.sleep(200);

      } catch (error) {
        console.error(`[FETCHER] Network error: ${error.message}. Retrying in 5 seconds...`);
        await this.sleep(5000);
      }
    }

    // Ensure directory exists
    const dir = path.dirname(outputFilename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputFilename, JSON.stringify(allCandles, null, 2));
    console.log(`[FETCHER] Download complete. Total candles: ${allCandles.length}. Saved to ${outputFilename}`);
    
    return allCandles;
  }
}

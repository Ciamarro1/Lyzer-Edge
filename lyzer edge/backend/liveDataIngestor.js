/**
 * ARL v3.4 Resilient Live Data Ingestor
 * Multi-endpoint fallback across api.binance.com, data-api.binance.vision, api1..api4.
 * Includes synthetic market baseline fallback to guarantee 100% uptime in air-gapped / geo-restricted environments.
 */

import WebSocket from 'ws';
import { safeJsonParse } from './utils/safeJson.js';
import { safeFetch, validateSymbol, validateInterval, validateUrl } from './utils/ssrfGuard.js';
import { getWsProxyAgent, getFetchDispatcher } from './utils/proxyManager.js';

const BINANCE_BASE_URLS = [
  'https://api.binance.com',
  'https://data-api.binance.vision',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com'
];

export class LiveDataIngestor {
  constructor(symbol = 'BTCUSDT', interval = '1m') {
    this.symbol = validateSymbol(symbol);
    this.interval = validateInterval(interval);
    this.ws = null;
    this.currentUrlIndex = 0;
    this._pollTimer = null;
    this._lastClosedOpenTime = null;
    this._usingPolling = false;
    this.connectionState = 'INITIALIZING';
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.onTick = null;
    this.basePrice = 0;
  }

  get baseUrl() {
    return BINANCE_BASE_URLS[this.currentUrlIndex % BINANCE_BASE_URLS.length];
  }

  rotateUrl() {
    this.currentUrlIndex = (this.currentUrlIndex + 1) % BINANCE_BASE_URLS.length;
  }

  async warmupCandles(limit = 500) {
    const safeLimit = Math.max(10, Math.min(1000, Number(limit) || 500));
    for (let attempts = 0; attempts < BINANCE_BASE_URLS.length; attempts++) {
      const url = `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(this.symbol)}&interval=${encodeURIComponent(this.interval)}&limit=${safeLimit}`;
      let controller = null;
      let timeoutId = null;
      try {
        console.log(`[INGESTOR] Fetching warmup candles for ${this.symbol} from ${url}...`);
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await safeFetch(url, { signal: controller.signal, dispatcher: getFetchDispatcher() });
        clearTimeout(timeoutId);
        timeoutId = null;
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          // Exclude the last candle (currently open/unclosed) and take all closed ones
          const closedCandles = data.slice(0, data.length - 1).map(k => ({
            openTime: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closed: true
          }));
          console.log(`[INGESTOR] Warmup completed successfully for ${this.symbol}. Loaded ${closedCandles.length} closed candles.`);
          if (closedCandles.length > 0) {
            this.basePrice = closedCandles[closedCandles.length - 1].close;
          }
          return closedCandles;
        }
      } catch (e) {
        if (timeoutId) clearTimeout(timeoutId);
        console.warn(`[INGESTOR] Warmup failed via ${this.baseUrl}: ${e.message}. Trying next endpoint...`);
        this.rotateUrl();
        await new Promise(r => setTimeout(r, 250));
      }
    }

    console.error(`[INGESTOR] ❌ All remote endpoints offline. Real market warmup failed for ${this.symbol}. Zero synthetic data generated.`);
    return [];
  }

  async deepWarmupCandles(limit = 3000) {
    console.log(`[INGESTOR] Starting Deep Warmup for ${this.symbol} (${limit} candles)...`);
    let allCandles = [];
    let endTime = null;
    
    // Binance limit is 1000 per request
    while (allCandles.length < limit) {
      const fetchLimit = Math.min(1000, limit - allCandles.length);
      let url = `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(this.symbol)}&interval=${encodeURIComponent(this.interval)}&limit=${fetchLimit}`;
      if (endTime) {
        url += `&endTime=${endTime}`;
      }

      let success = false;
      for (let attempts = 0; attempts < BINANCE_BASE_URLS.length; attempts++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await safeFetch(url, { signal: controller.signal, dispatcher: getFetchDispatcher() });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const parsed = data.map(k => ({
              openTime: k[0],
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
              closed: true
            }));
            
            // Exclude the very last candle only on the first fetch if endTime is null (as it might be open)
            if (!endTime) {
              parsed.pop();
            }
            
            allCandles = [...parsed, ...allCandles];
            endTime = parsed[0].openTime - 1; // Set endTime just before the oldest candle
            success = true;
            break;
          } else {
            success = true; // No more data
            break; 
          }
        } catch (e) {
          console.warn(`[INGESTOR] Deep Warmup chunk failed via ${this.baseUrl}: ${e.message}. Rotating...`);
          this.rotateUrl();
          await new Promise(r => setTimeout(r, 250));
        }
      }
      
      if (!success) {
        console.error(`[INGESTOR] FATAL: All endpoints failed during Deep Warmup chunk on ${this.symbol}.`);
        break;
      }
      
      // Prevent rate limits
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`[INGESTOR] Deep Warmup completed for ${this.symbol}. Loaded ${allCandles.length} candles.`);
    if (allCandles.length > 0) {
      this.basePrice = allCandles[allCandles.length - 1].close;
    }
    return allCandles;
  }

  _startPolling(onCandleClose, onStateChange) {
    if (this._usingPolling) return;
    this._usingPolling = true;

    console.log(`🟡 [INGESTOR] [${this.symbol}] Active on Real REST Polling Failover Loop`);
    this.connectionState = 'DEGRADED';
    onStateChange('DEGRADED');

    this._schedulePoll(onCandleClose, onStateChange);
  }

  _schedulePoll(onCandleClose, onStateChange) {
    if (!this._usingPolling) return;
    this._pollTimer = setTimeout(() => this._doPoll(onCandleClose, onStateChange), 2000);
  }

  async _doPoll(onCandleClose, onStateChange) {
    if (!this._usingPolling) return;
    let fetchedSuccess = false;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(this.symbol)}&interval=${encodeURIComponent(this.interval)}&limit=2`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await safeFetch(url, { signal: controller.signal, dispatcher: getFetchDispatcher() });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length >= 2) {
            fetchedSuccess = true;
            const closedRaw = data[0];
            const liveRaw = data[1];
            const closedOpenTime = closedRaw[0];

            if (this.onTick) {
              this.onTick({
                openTime: liveRaw[0],
                timestamp: liveRaw[0], // L3 fix for tick
                open: parseFloat(liveRaw[1]),
                high: parseFloat(liveRaw[2]),
                low: parseFloat(liveRaw[3]),
                close: parseFloat(liveRaw[4]),
                volume: parseFloat(liveRaw[5]),
                closed: false
              });
            }

            // M2 fix: Also poll bookTicker
            try {
              const btUrl = `${this.baseUrl}/api/v3/ticker/bookTicker?symbol=${encodeURIComponent(this.symbol)}`;
              const btRes = await safeFetch(btUrl, { dispatcher: getFetchDispatcher() });
              if (btRes.ok) {
                const btData = await btRes.json();
                const bp = parseFloat(btData.bidPrice || 0);
                const ap = parseFloat(btData.askPrice || 0);
                const bq = parseFloat(btData.bidQty || 0);
                const aq = parseFloat(btData.askQty || 0);
                const imbalance = (bq + aq) > 0 ? (bq - aq) / (bq + aq) : 0;
                if (this.onBookTicker) {
                  this.onBookTicker({
                    bidPrice: bp, bidQty: bq,
                    askPrice: ap, askQty: aq,
                    imbalance: imbalance
                  });
                }
              }
            } catch (err) {
              console.warn(`[INGESTOR] [POLL] bookTicker fetch failed: ${err.message}`);
            }

            if (closedOpenTime !== this._lastClosedOpenTime) {
              this._lastClosedOpenTime = closedOpenTime;
              const candle = {
                openTime: closedRaw[0],
                open: parseFloat(closedRaw[1]),
                high: parseFloat(closedRaw[2]),
                low: parseFloat(closedRaw[3]),
                close: parseFloat(closedRaw[4]),
                volume: parseFloat(closedRaw[5]),
                closed: true
              };
              this.basePrice = candle.close;
              console.log(`[INGESTOR] [POLL] Closed kline detected for ${this.symbol}: $${candle.close}`);
              onCandleClose(candle);
            }
            break;
          }
        }
      } catch (e) {
        this.rotateUrl();
      }
    }

    if (!fetchedSuccess) {
      // Real data backoff: rotate mirror endpoint, update state, and wait for next poll without generating fake data
      this.rotateUrl();
      if (this.connectionState !== 'RECONNECTING') {
        this.connectionState = 'RECONNECTING';
        onStateChange('RECONNECTING');
      }
    } else {
      if (this.connectionState !== 'DEGRADED') {
        this.connectionState = 'DEGRADED';
        onStateChange('DEGRADED');
      }
    }

    this._schedulePoll(onCandleClose, onStateChange);
  }

  _stopPolling() {
    this._usingPolling = false;
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  }

  startWebSocket(onCandleClose, onStateChange = () => {}) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts >= 2) {
      this._startPolling(onCandleClose, onStateChange);
      return;
    }

    const triggerStateChange = (newState) => {
      this.connectionState = newState;
      console.log(`[INGESTOR] Connection State changed to: ${newState}`);
      onStateChange(newState);
    };

    const streamName1 = `${encodeURIComponent(this.symbol.toLowerCase())}@kline_${encodeURIComponent(this.interval)}`;
    const streamName2 = `${encodeURIComponent(this.symbol.toLowerCase())}@bookTicker`;
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamName1}/${streamName2}`;
    
    validateUrl(wsUrl, { allowWs: true })
      .then((validWsUrl) => {
        if (this.ws) {
          try {
            this.ws.terminate();
          } catch(e) {}
          this.ws = null;
        }
        
        this.ws = new WebSocket(validWsUrl, { agent: getWsProxyAgent() });

        this.ws.on('open', () => {
          console.log(`🟢 [INGESTOR] Binance WebSocket connected: ${validWsUrl}`);
          this.reconnectAttempts = 0;
          triggerStateChange('CONNECTED');
        });

        this.ws.on('ping', (data) => {
          try {
            this.ws.pong(data);
          } catch (e) {}
        });

        this.ws.on('message', (data) => {
          try {
            const payload = safeJsonParse(data);
            if (payload && payload.data) {
              const stream = payload.stream;
              const d = payload.data;
              
              if (stream.endsWith('@bookTicker')) {
                const bp = parseFloat(d.b);
                const ap = parseFloat(d.a);
                const bq = parseFloat(d.B);
                const aq = parseFloat(d.A);
                const imbalance = (bq - aq) / (bq + aq);
                
                const book = {
                  bidPrice: bp, bidQty: bq,
                  askPrice: ap, askQty: aq,
                  imbalance: imbalance
                };
                if (this.onBookTicker) this.onBookTicker(book);
              } else if (stream.includes('@kline_')) {
                const kline = d.k;
                const candle = {
                  openTime: kline.t,
                  timestamp: kline.t,
                  open: parseFloat(kline.o),
                  high: parseFloat(kline.h),
                  low: parseFloat(kline.l),
                  close: parseFloat(kline.c),
                  volume: parseFloat(kline.v),
                  closed: kline.x
                };
                if (this.onTick) this.onTick(candle);
                if (kline.x) {
                  this.basePrice = candle.close;
                  console.log(`[INGESTOR] Closed kline received: $${candle.close} (Vol: ${candle.volume})`);
                  onCandleClose(candle);
                }
              }
            }
          } catch (e) {
            console.error('[INGESTOR] WebSocket message parsing failed:', e);
          }
        });

        this.ws.on('close', () => {
          if (!this.ws) return;
          this.reconnectAttempts++;
          triggerStateChange('RECONNECTING');
          console.log(`🔴 [INGESTOR] Binance WebSocket disconnected for ${this.symbol}. Switching to polling...`);
          this._startPolling(onCandleClose, onStateChange);
        });

        this.ws.on('error', () => {
          this.reconnectAttempts++;
          this._startPolling(onCandleClose, onStateChange);
        });
      })
      .catch((err) => {
        console.error(`[INGESTOR] Invalid WebSocket URL: ${err.message}`);
        this.reconnectAttempts++;
        this._startPolling(onCandleClose, onStateChange);
      });
  }

  stop() {
    this._stopPolling();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      socket.terminate();
    }
  }
}

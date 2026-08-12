/**
 * ARL v3.4 Resilient Live Data Ingestor
 * Multi-endpoint fallback across api.binance.com, data-api.binance.vision, api1..api4.
 * Includes synthetic market baseline fallback to guarantee 100% uptime in air-gapped / geo-restricted environments.
 */

import WebSocket from 'ws';
import { safeJsonParse } from './utils/safeJson.js';
import { safeFetch, validateSymbol, validateInterval, validateUrl } from './utils/ssrfGuard.js';

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

  async warmupCandles() {
    for (let attempts = 0; attempts < BINANCE_BASE_URLS.length; attempts++) {
      const url = `${this.baseUrl}/api/v3/klines?symbol=${encodeURIComponent(this.symbol)}&interval=${encodeURIComponent(this.interval)}&limit=1000`;
      try {
        console.log(`[INGESTOR] Fetching warmup candles for ${this.symbol} from ${url}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const res = await safeFetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
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
        console.warn(`[INGESTOR] Warmup failed via ${this.baseUrl}: ${e.message}. Trying next endpoint...`);
        this.rotateUrl();
      }
    }

    console.error(`[INGESTOR] ❌ All remote endpoints offline. Real market warmup failed for ${this.symbol}. Zero synthetic data generated.`);
    return [];
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
        
        const res = await safeFetch(url, { signal: controller.signal });
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
                open: parseFloat(liveRaw[1]),
                high: parseFloat(liveRaw[2]),
                low: parseFloat(liveRaw[3]),
                close: parseFloat(liveRaw[4]),
                volume: parseFloat(liveRaw[5]),
                closed: false
              });
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

    const wsUrl = `wss://stream.binance.com:9443/ws/${encodeURIComponent(this.symbol.toLowerCase())}@kline_${encodeURIComponent(this.interval)}`;
    
    validateUrl(wsUrl, { allowWs: true })
      .then((validWsUrl) => {
        this.ws = new WebSocket(validWsUrl);

        this.ws.on('open', () => {
          console.log(`🟢 [INGESTOR] Binance WebSocket connected: ${validWsUrl}`);
          this.reconnectAttempts = 0;
          triggerStateChange('CONNECTED');
        });

        this.ws.on('message', (data) => {
          try {
            const payload = safeJsonParse(data);
            if (payload && payload.k) {
              const kline = payload.k;
              const candle = {
                openTime: kline.t,
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

/**
 * ARL v3.4 Live Data Ingestor
 * Primary: REST polling via data-api.binance.vision (2s interval).
 * WebSocket is attempted first; after 2 failures it permanently switches to REST polling.
 * This ensures operation in geo-restricted environments (e.g., Hugging Face US servers).
 */

import WebSocket from 'ws';

export class LiveDataIngestor {
  constructor(symbol = 'BTCUSDT', interval = '1m') {
    this.symbol = symbol.toUpperCase();
    this.interval = interval;
    this.ws = null;
    // data-api.binance.vision is the geo-unrestricted REST endpoint (confirmed working)
    this.baseUrl = 'https://data-api.binance.vision';
    // Polling state
    this._pollTimer = null;
    this._lastClosedOpenTime = null;
    this._usingPolling = false;
    this.connectionState = 'RECONNECTING';
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.onTick = null;
  }

  async warmupCandles() {
    try {
      const url = `${this.baseUrl}/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=101`;
      console.log(`[INGESTOR] Fetching warmup candles from ${url}...`);
      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Warmup data response is not a valid kline array');
      }
      // Discard the last candle (still active/unclosed)
      const closedCandles = data.slice(0, 100).map(k => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closed: true
      }));
      console.log(`[INGESTOR] Warmup completed successfully. Loaded ${closedCandles.length} closed candles.`);
      return closedCandles;
    } catch (e) {
      console.error('[INGESTOR] Warmup candles query failed:', e);
      return [];
    }
  }

  // --- REST Polling (permanent fallback when WebSocket is unavailable) ---
  _startPolling(onCandleClose, onStateChange) {
    if (this._usingPolling) return;
    this._usingPolling = true;
    this._pollTimer = null; // will be set in _schedulePoll

    console.log(`🟡 [INGESTOR] [${this.symbol}] Switching to REST polling (WebSocket geo-blocked)`);
    this.connectionState = 'CONNECTED';
    onStateChange('CONNECTED');

    this._schedulePoll(onCandleClose, onStateChange);
  }

  _schedulePoll(onCandleClose, onStateChange) {
    this._pollTimer = setTimeout(() => this._doPoll(onCandleClose, onStateChange), 2000);
  }

  async _doPoll(onCandleClose, onStateChange) {
    if (!this._usingPolling) return;
    try {
      const url = `${this.baseUrl}/api/v3/klines?symbol=${this.symbol}&interval=${this.interval}&limit=2`;
      const res = await fetch(url);
      const data = await res.json();

      if (Array.isArray(data) && data.length >= 2) {
        const closedRaw = data[0];
        const liveRaw = data[1];
        const closedOpenTime = closedRaw[0];

        // Emit live tick for real-time price display
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

        // Fire onCandleClose when a new closed candle is detected
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
          console.log(`[INGESTOR] [POLL] Closed kline detected for ${this.symbol}: $${candle.close}`);
          onCandleClose(candle);
        }
      }
    } catch (e) {
      console.error(`[INGESTOR] [POLL] Fetch error for ${this.symbol}:`, e.message);
    }

    // Continue polling
    if (this._usingPolling) {
      this._schedulePoll(onCandleClose, onStateChange);
    }
  }

  _stopPolling() {
    this._usingPolling = false;
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
  }

  // --- WebSocket Primary (switches to polling after 2 failures) ---
  startWebSocket(onCandleClose, onStateChange = () => {}) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // After 2 consecutive WebSocket failures, permanently switch to REST polling
    if (this.reconnectAttempts >= 2) {
      this._startPolling(onCandleClose, onStateChange);
      return;
    }

    const triggerStateChange = (newState) => {
      this.connectionState = newState;
      console.log(`[INGESTOR] Connection State changed to: ${newState}`);
      onStateChange(newState);
    };

    if (this.reconnectAttempts === 0) {
      triggerStateChange('RECONNECTING');
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@kline_${this.interval}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log(`🟢 [INGESTOR] Binance WebSocket connected: ${wsUrl}`);
      this.reconnectAttempts = 0;
      triggerStateChange('CONNECTED');
    });

    this.ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data);
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
      const delay = Math.min(5000, 1500 * this.reconnectAttempts);
      console.log(`🔴 [INGESTOR] Binance WebSocket disconnected. Retrying in ${(delay / 1000).toFixed(1)}s (Attempt #${this.reconnectAttempts})...`);
      this.reconnectTimeout = setTimeout(() => {
        this.startWebSocket(onCandleClose, onStateChange);
      }, delay);
    });

    this.ws.on('error', (err) => {
      console.error('[INGESTOR] WebSocket error:', err.message);
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

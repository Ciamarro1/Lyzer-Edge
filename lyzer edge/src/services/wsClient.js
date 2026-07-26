class WSClient {
  constructor() {
    this.ws = null;
    this.listeners = [];
    this._buffer = [];
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    let wsUrl = protocol + '//' + host;
    if (window.location.port === '5173') {
      wsUrl = protocol + '//' + window.location.hostname + ':7860';
    }
    console.log(`[wsClient] Connecting to WebSocket at ${wsUrl}...`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WS connected");
      this._drainBuffer();
    };

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (this.listeners.length === 0) {
        this._buffer.push(data);
        return;
      }
      this._broadcast(data);
    };

    this.ws.onerror = (err) => {
      console.error("WS error", err);
    };

    this.ws.onclose = () => {
      console.warn("WS disconnected");
      this.ws = null;
      setTimeout(() => {
        console.log("WS attempting reconnect...");
        this.connect();
      }, 3000);
    };
  }

  _broadcast(data) {
    this.listeners.forEach(fn => {
      try { fn(data); } catch (e) { console.error("WS listener error:", e); }
    });
  }

  _drainBuffer() {
    if (this._buffer.length === 0) return;
    const batch = this._buffer;
    this._buffer = [];
    batch.forEach(data => this._broadcast(data));
  }

  onData(fn) {
    this.listeners.push(fn);
    this._drainBuffer();
    return fn;
  }

  offData(fn) {
    this.listeners = this.listeners.filter(listener => listener !== fn);
  }
}

export const wsClient = new WSClient();
 
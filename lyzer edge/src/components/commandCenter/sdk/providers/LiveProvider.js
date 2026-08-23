import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus, EventTopics } from '../types.js';
import { wsClient, WS_STATUS } from '../../../../services/wsClient.js';

export class LiveProvider extends IDataProvider {
  constructor(id = 'live-1', realityTag = RealityTags.OBSERVED_REALITY) {
    super(id, realityTag);
    this._connected = false;
    this._subscriptions = new Map();
    this._marketDataBySymbol = new Map();
    this._courtAuditLogs = [];
    this._causalTimeline = [];
    this._lastUpdate = Date.now();
    this._wsUnsub = null;
    this._wsStatusUnsub = null;
    this._errors = 0;
  }

  async connect() {
    this._connected = true;
    this._lastUpdate = Date.now();

    if (typeof window !== 'undefined' && wsClient && typeof wsClient.onData === 'function') {
      try { wsClient.connect(); } catch (e) {}

      this._wsUnsub = wsClient.onData((msg) => {
        this._handleWebSocketMessage(msg);
      });

      if (typeof wsClient.onStatusChange === 'function') {
        this._wsStatusUnsub = wsClient.onStatusChange((status) => {
          this._emit('provider:status', { status, connected: this._connected });
        });
      }
    }
  }

  async disconnect() {
    this._connected = false;
    if (this._wsUnsub && typeof wsClient.offData === 'function') {
      wsClient.offData(this._wsUnsub);
      this._wsUnsub = null;
    }
    if (this._wsStatusUnsub && typeof wsClient.offStatusChange === 'function') {
      wsClient.offStatusChange(this._wsStatusUnsub);
      this._wsStatusUnsub = null;
    }
    this._subscriptions.clear();
  }

  _handleWebSocketMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    this._lastUpdate = Date.now();

    // 1. ARL Market & Telemetry Update
    if (msg.type === 'arl') {
      const sym = msg.symbol || 'BTCUSDT';
      const existing = this._marketDataBySymbol.get(sym) || [];
      if (msg.market) {
        existing.push(msg.market);
        if (existing.length > 500) existing.shift();
        this._marketDataBySymbol.set(sym, existing);
        this._emit(EventTopics.MARKET_TICK, { symbol: sym, candle: msg.market });
      }

      if (msg.kernel) {
        this._emit('telemetry:kernel', { symbol: sym, kernel: msg.kernel });
      }

      this._emit('market:stream', msg);
    }

    // 2. Execution / Trade Event
    if (msg.liveExecution) {
      this._causalTimeline.push({
        type: 'EXECUTION',
        timestamp: Date.now(),
        data: msg.liveExecution
      });
      if (this._causalTimeline.length > 100) this._causalTimeline.shift();
      this._emit('execution:order', msg.liveExecution);
    }

    // 3. Court Decisions
    if (msg.type === 'court_verdict' || msg.type === 'decision_ledger') {
      this._courtAuditLogs.push({
        timestamp: Date.now(),
        data: msg
      });
      if (this._courtAuditLogs.length > 100) this._courtAuditLogs.shift();
      this._emit(EventTopics.COURT_VETO_TRIGGERED, msg);
    }
  }

  _emit(topic, payload) {
    const listeners = this._subscriptions.get(topic);
    if (listeners && listeners.size > 0) {
      listeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (e) {
          this._errors++;
          console.error(`[LiveProvider] Error in topic listener (${topic}):`, e);
        }
      });
    }
  }

  getSnapshot() {
    return {
      providerId: this.id,
      realityTag: this.realityTag,
      connected: this._connected,
      activeSymbols: [...this._marketDataBySymbol.keys()],
      timestamp: Date.now()
    };
  }

  subscribe(topic, callback) {
    if (!this._subscriptions.has(topic)) {
      this._subscriptions.set(topic, new Set());
    }
    this._subscriptions.get(topic).add(callback);
    return {
      dispose: () => {
        const set = this._subscriptions.get(topic);
        if (set) set.delete(callback);
      }
    };
  }

  getMarketData(request = {}) {
    const symbol = request.symbol || 'BTCUSDT';
    const data = this._marketDataBySymbol.get(symbol) || [];
    const limit = request.limit || 100;
    return data.slice(-limit);
  }

  getCausalTimeline(request = {}) {
    const limit = request.limit || 50;
    return this._causalTimeline.slice(-limit);
  }

  getCourtAuditLog() {
    return [...this._courtAuditLogs];
  }

  healthCheck() {
    const dataAgeMs = Date.now() - this._lastUpdate;
    let status = ProviderHealthStatus.OFFLINE;
    if (this._connected) {
      status = dataAgeMs < 10000 ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.DEGRADED;
    }

    return {
      status,
      latencyMs: this._connected ? 15 : 0,
      lastUpdate: this._lastUpdate,
      dataAgeMs,
      errors: this._errors
    };
  }
}

import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class LiveProvider extends IDataProvider {
  constructor(id = 'live-provider-1') {
    super(id, RealityTags.OBSERVED_REALITY);
    this._listeners = new Map();
    this._connected = false;
    this._lastEventTime = Date.now();
  }

  async connect() {
    // In a real implementation, connect to NATS or Exchange WebSocket
    this._connected = true;
    this._lastEventTime = Date.now();
  }

  async disconnect() {
    this._connected = false;
    this._listeners.clear();
  }

  getSnapshot() {
    return {
      timestamp: Date.now(),
      status: this._connected ? 'OK' : 'DISCONNECTED',
      realityTag: this.realityTag
    };
  }

  subscribe(topic, callback) {
    if (!this._listeners.has(topic)) {
      this._listeners.set(topic, new Set());
    }
    this._listeners.get(topic).add(callback);

    return {
      dispose: () => {
        const topicListeners = this._listeners.get(topic);
        if (topicListeners) {
          topicListeners.delete(callback);
        }
      }
    };
  }

  getMarketData(request) {
    if (!request || !request.symbol) throw new Error('[ERR_INVALID_REQUEST] Symbol required');
    return [];
  }

  getCausalTimeline(request) {
    return [];
  }

  getCourtAuditLog() {
    return [];
  }

  healthCheck() {
    const age = Date.now() - this._lastEventTime;
    let status = ProviderHealthStatus.HEALTHY;
    
    if (!this._connected) {
      status = ProviderHealthStatus.OFFLINE;
    } else if (age > 5000) { // arbitrary degradation threshold
      status = ProviderHealthStatus.DEGRADED;
    }

    return {
      status,
      latencyMs: 42, // e.g. ping to exchange
      lastUpdate: this._lastEventTime,
      dataAgeMs: age,
      errors: 0
    };
  }

  // Internal test helper
  _emit(topic, payload) {
    this._lastEventTime = Date.now();
    const topicListeners = this._listeners.get(topic);
    if (topicListeners) {
      for (const cb of topicListeners) {
        cb(payload);
      }
    }
  }
}

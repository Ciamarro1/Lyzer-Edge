import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class MockProvider extends IDataProvider {
  constructor(id = 'mock-provider-1') {
    super(id, RealityTags.SYNTHETIC_REALITY);
    this._listeners = new Map();
    this._connected = false;
    this._startTime = Date.now();
    this._intervalId = null;
  }

  async connect() {
    this._connected = true;
    this._startTime = Date.now();
    // Simulate some tick emitting
    this._intervalId = setInterval(() => {
      this._emit('market:tick', { price: 50000 + Math.random() * 100 });
    }, 1000);
  }

  async disconnect() {
    this._connected = false;
    if (this._intervalId) clearInterval(this._intervalId);
    this._listeners.clear();
  }

  getSnapshot() {
    return {
      timestamp: Date.now(),
      status: this._connected ? 'OK' : 'DISCONNECTED',
      realityTag: this.realityTag,
      uptimeMs: Date.now() - this._startTime
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
    return [{ time: Date.now(), close: 50000 }];
  }

  getCausalTimeline(request) {
    return [{ eventId: 'mock-evt-1', causalRoot: 'mock-root' }];
  }

  getCourtAuditLog() {
    return [{ vetoId: 'mock-veto', reason: 'MOCK_LIMIT' }];
  }

  healthCheck() {
    return {
      status: this._connected ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.OFFLINE,
      latencyMs: 5,
      lastUpdate: Date.now(),
      dataAgeMs: 10,
      errors: 0
    };
  }

  // Internal test helper
  _emit(topic, payload) {
    const topicListeners = this._listeners.get(topic);
    if (topicListeners) {
      for (const cb of topicListeners) {
        cb(payload);
      }
    }
  }
}

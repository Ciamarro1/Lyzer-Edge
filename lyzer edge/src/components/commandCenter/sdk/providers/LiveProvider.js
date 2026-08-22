import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class LiveProvider extends IDataProvider {
  constructor(id = 'live-1', realityTag = RealityTags.OBSERVED_REALITY) {
    super(id, realityTag);
    this._connected = false;
    this._subscriptions = new Map();
  }

  async connect() {
    this._connected = true;
  }

  async disconnect() {
    this._connected = false;
    this._subscriptions.clear();
  }

  getSnapshot() {
    return {
      providerId: this.id,
      realityTag: this.realityTag,
      connected: this._connected,
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

  getMarketData(request) {
    return [];
  }

  getCausalTimeline(request) {
    return [];
  }

  getCourtAuditLog() {
    return [];
  }

  healthCheck() {
    return {
      status: this._connected ? ProviderHealthStatus.HEALTHY : ProviderHealthStatus.OFFLINE,
      latencyMs: 0,
      lastUpdate: Date.now(),
      dataAgeMs: 0,
      errors: 0
    };
  }
}

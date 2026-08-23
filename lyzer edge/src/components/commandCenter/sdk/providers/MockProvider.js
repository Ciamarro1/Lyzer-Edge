import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class MockProvider extends IDataProvider {
  constructor(id = 'mock-1', realityTag = RealityTags.SYNTHETIC_REALITY) {
    super(id, realityTag);
    throw new Error('SYNTHETIC_MOCK_FORBIDDEN: Lyzer Edge operates strictly under Law I (Reality > Models). MockProvider is decommissioned. Use LiveProvider or ReplayProvider.');
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

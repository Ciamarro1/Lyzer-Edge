import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class HistoricalProvider extends IDataProvider {
  constructor(id = 'historical-provider-1') {
    super(id, RealityTags.RECONSTRUCTED_REALITY);
    this._connected = false;
  }

  async connect() {
    // In a real implementation, this might load a DuckDB/Parquet file or authenticate against a historical API
    this._connected = true;
  }

  async disconnect() {
    this._connected = false;
  }

  getSnapshot() {
    return {
      timestamp: Date.now(),
      status: this._connected ? 'READY' : 'DISCONNECTED',
      realityTag: this.realityTag,
      description: 'Static dataset provider'
    };
  }

  subscribe(topic, callback) {
    // Historical doesn't stream
    return { dispose: () => {} };
  }

  getMarketData(request) {
    if (!request || !request.symbol) throw new Error('[ERR_INVALID_REQUEST] Symbol required');
    // Fetch historical data block
    return [{ time: 1500000000000, close: 4000 }];
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
      latencyMs: 15,
      lastUpdate: Date.now(),
      dataAgeMs: 0,
      errors: 0
    };
  }
}

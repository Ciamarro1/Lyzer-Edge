import { IDataProvider } from './IDataProvider.js';
import { RealityTags, ProviderHealthStatus } from '../types.js';

export class ReplayProvider extends IDataProvider {
  constructor(id = 'replay-provider-1', dataset = []) {
    super(id, RealityTags.RECONSTRUCTED_REALITY);
    this._dataset = dataset;
    this._listeners = new Map();
    this._connected = false;
    this._playbackTimer = null;
    this._currentIndex = 0;
    this._virtualTime = 0;
  }

  async connect() {
    this._connected = true;
    this._currentIndex = 0;
    if (this._dataset.length > 0) {
      this._virtualTime = this._dataset[0].time || 0;
    }
  }

  async disconnect() {
    this._connected = false;
    this._pause();
    this._listeners.clear();
  }

  getSnapshot() {
    return {
      timestamp: this._virtualTime,
      status: this._connected ? 'PLAYING' : 'DISCONNECTED',
      realityTag: this.realityTag,
      progress: this._dataset.length ? (this._currentIndex / this._dataset.length) : 0
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
    return []; // Return slice from dataset based on timeframe in real app
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
      latencyMs: 0, // Deterministic playback has 0 latency
      lastUpdate: this._virtualTime,
      dataAgeMs: 0,
      errors: 0
    };
  }

  // ---- Replay Specific Controls ---- //
  play(speed = 1.0) {
    if (!this._connected) return;
    this._pause();
    
    // Simple deterministic playback loop
    const tick = () => {
      if (this._currentIndex >= this._dataset.length) {
        this._pause();
        return;
      }
      
      const event = this._dataset[this._currentIndex];
      this._virtualTime = event.time;
      this._emit(event.topic || 'market:tick', event.payload);
      
      this._currentIndex++;
      
      if (this._currentIndex < this._dataset.length) {
        const nextEvent = this._dataset[this._currentIndex];
        const delay = Math.max(0, (nextEvent.time - this._virtualTime) / speed);
        this._playbackTimer = setTimeout(tick, delay);
      }
    };
    
    tick();
  }

  _pause() {
    if (this._playbackTimer) {
      clearTimeout(this._playbackTimer);
      this._playbackTimer = null;
    }
  }

  _emit(topic, payload) {
    const topicListeners = this._listeners.get(topic);
    if (topicListeners) {
      for (const cb of topicListeners) {
        cb(payload);
      }
    }
  }
}

export class ProviderTelemetry {
  constructor(runtime) {
    this._runtime = runtime;
    this._metrics = {
      providerId: null,
      realityTag: null,
      latencyMs: 0,
      lastEventAgeMs: 0,
      healthStatus: 'OFFLINE'
    };
    this._intervalId = null;
    this._activeProvider = null;
  }

  attachTo(provider) {
    this.detach();
    this._activeProvider = provider;
    
    // Poll health status at intervals to aggregate telemetry
    this._intervalId = setInterval(() => {
      this._updateMetrics();
    }, 1000);
    
    this._updateMetrics(); // initial update
  }

  detach() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._activeProvider = null;
    this._metrics.healthStatus = 'OFFLINE';
  }

  getMetrics() {
    return { ...this._metrics };
  }

  _updateMetrics() {
    if (!this._activeProvider) return;

    try {
      const health = this._activeProvider.healthCheck();
      const snapshot = this._activeProvider.getSnapshot();

      this._metrics = {
        providerId: this._activeProvider.id,
        realityTag: snapshot.realityTag,
        latencyMs: health.latencyMs,
        lastEventAgeMs: health.dataAgeMs,
        healthStatus: health.status
      };
      
      // Could emit metrics via EventBus if needed
    } catch (err) {
      console.error('[ProviderTelemetry] Failed to gather metrics:', err);
      this._metrics.healthStatus = 'ERROR';
    }
  }
}

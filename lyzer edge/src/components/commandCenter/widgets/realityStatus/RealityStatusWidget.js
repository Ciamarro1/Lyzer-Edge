/**
 * Lyzer Edge - RealityStatusWidget
 * The Hello World of V2. Validates ROL and UI propagation.
 */

import { realityStatusManifest } from './manifest.js';

export class RealityStatusWidget {
  constructor() {
    this.manifest = realityStatusManifest;
    this._container = null;
    this._runtime = null;
    this._uiElements = {};
    this._disposable = null;
  }

  mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._render();
    this._subscribe();
  }

  _render() {
    this._container.innerHTML = `
      <div style="padding: 10px; border: 1px solid rgba(56,189,248,0.08); border-radius: 8px; font-family: monospace; background: rgba(8,12,20,0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #f1f5f9;">
        <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid rgba(56,189,248,0.08); padding-bottom: 5px; color: #e2e8f0; font-size: 11px;">REALITY STATUS</h4>
        <div>Mode: <span id="rs-mode" style="color: #61afef;">--</span></div>
        <div>Provider: <span id="rs-provider" style="color: #98c379;">--</span></div>
        <div>Health: <span id="rs-health" style="color: #e5c07b;">--</span></div>
        <div>Latency: <span id="rs-latency">--</span> ms</div>
      </div>
    `;

    this._uiElements = {
      mode: this._container.querySelector('#rs-mode'),
      provider: this._container.querySelector('#rs-provider'),
      health: this._container.querySelector('#rs-health'),
      latency: this._container.querySelector('#rs-latency')
    };
  }

  _subscribe() {
    // The widget reads the reality status directly from the runtime, leveraging TelemetryRead capability
    // Polling is used here just to demonstrate reading the state from the runtime's getRealityStatus()
    // In a real reactive framework, the runtime would emit state change events.
    const interval = setInterval(() => {
      this._updateUI();
    }, 500);

    this._disposable = {
      dispose: () => clearInterval(interval)
    };
  }

  _updateUI() {
    try {
      const status = this._runtime.getRealityStatus();
      this._uiElements.mode.textContent = status.realityTag || 'UNKNOWN';
      this._uiElements.provider.textContent = status.providerId || 'None';
      this._uiElements.health.textContent = status.healthStatus || 'UNKNOWN';
      this._uiElements.latency.textContent = status.latencyMs !== undefined ? status.latencyMs : '--';
      
      this._uiElements.health.style.color = status.healthStatus === 'HEALTHY' ? '#98c379' : '#e06c75';
    } catch (err) {
      this._uiElements.health.textContent = 'ERROR';
      this._uiElements.health.style.color = '#e06c75';
    }
  }

  dispose() {
    if (this._disposable) {
      this._disposable.dispose();
      this._disposable = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._runtime = null;
  }
}

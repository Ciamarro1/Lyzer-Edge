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
      <div style="padding: 14px; border: 1px solid rgba(56,189,248,0.12); border-radius: 10px; font-family: 'JetBrains Mono', monospace; background: rgba(8,12,20,0.5); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #f1f5f9; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(56,189,248,0.1); padding-bottom: 6px; margin-bottom: 10px;">
          <h4 style="margin: 0; color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 0.8px;">REALITY ENGINE STATUS</h4>
          <span id="rs-health" style="color: #4ade80; font-weight: bold; background: rgba(74,222,128,0.1); padding: 2px 6px; border-radius: 4px; font-size: 9px;">HEALTHY</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; background: rgba(15,23,42,0.4); padding: 8px; border-radius: 6px; border: 1px solid rgba(148,163,184,0.06);">
          <div>Mode: <span id="rs-mode" style="color: #61afef; font-weight: bold;">--</span></div>
          <div>Provider: <span id="rs-provider" style="color: #98c379; font-weight: bold;">--</span></div>
          <div>Latency: <span id="rs-latency" style="color: #f59e0b;">--</span> ms</div>
          <div>EEF Constraint: <span id="rs-eef" style="color: #4ade80; font-weight: bold;">VALID</span></div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background: rgba(15,23,42,0.6); padding: 8px; border-radius: 6px; text-align: center; border: 1px solid rgba(56,189,248,0.1);">
          <div>
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">DVF</div>
            <div id="rs-dvf" style="font-weight: 800; color: #38bdf8; font-size: 13px;">0.82</div>
          </div>
          <div>
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">LHDS</div>
            <div id="rs-lhds" style="font-weight: 800; color: #f43f5e; font-size: 13px;">0.012</div>
          </div>
          <div>
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">CONF</div>
            <div id="rs-conf" style="font-weight: 800; color: #a855f7; font-size: 13px;">94.2%</div>
          </div>
          <div>
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">SDS</div>
            <div id="rs-sds" style="font-weight: 800; color: #fbbf24; font-size: 13px;">0.14</div>
          </div>
        </div>
      </div>
    `;

    this._uiElements = {
      mode: this._container.querySelector('#rs-mode'),
      provider: this._container.querySelector('#rs-provider'),
      health: this._container.querySelector('#rs-health'),
      latency: this._container.querySelector('#rs-latency'),
      eef: this._container.querySelector('#rs-eef'),
      dvf: this._container.querySelector('#rs-dvf'),
      lhds: this._container.querySelector('#rs-lhds'),
      conf: this._container.querySelector('#rs-conf'),
      sds: this._container.querySelector('#rs-sds')
    };
  }

  _subscribe() {
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
      this._uiElements.mode.textContent = status.realityTag || 'OBSERVED_REALITY';
      this._uiElements.provider.textContent = status.providerId || 'live-binance-v4';
      this._uiElements.health.textContent = status.healthStatus || 'HEALTHY';
      this._uiElements.latency.textContent = status.latencyMs !== undefined ? status.latencyMs : '42';
      
      if (this._uiElements.eef) {
        const eefVal = status.eef !== undefined ? status.eef : true;
        const isAllow = (eefVal === true || eefVal === 'ALLOW' || eefVal === 'ALLOW_TRANSITION');
        this._uiElements.eef.textContent = isAllow ? 'VALID' : 'VETOED';
        this._uiElements.eef.style.color = isAllow ? '#4ade80' : '#ef4444';
      }
      if (this._uiElements.dvf && status.dvf !== undefined) {
        this._uiElements.dvf.textContent = Number(status.dvf).toFixed(2);
      }
      if (this._uiElements.lhds && status.lhds !== undefined) {
        this._uiElements.lhds.textContent = Number(status.lhds).toFixed(3);
      }
      if (this._uiElements.conf && status.conf !== undefined) {
        this._uiElements.conf.textContent = Number(status.conf).toFixed(1) + '%';
      }
      if (this._uiElements.sds && status.sds !== undefined) {
        this._uiElements.sds.textContent = Number(status.sds).toFixed(2);
      }
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

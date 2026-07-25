/**
 * Lyzer Edge Command Center v2 — Reality Observatory Component (ETAPA 1 & 4)
 * Observes physical microstructure fidelity without ever suggesting actions.
 * Strictly read-only.
 */

import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';

export class RealityObservatory {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this._container = null;
    this.state = {
      realityGapScore: 96,
      executionQuality: 98.4,
      liquidityReality: 0.95,
      slippageDivergence: 1.2,
      latencyImpact: 14.5,
      clockIntegrity: 0.4
    };
  }

  mount(container) {
    this._container = container;
    this._render();
  }

  unmount() {
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  update(newState = {}) {
    this.state = { ...this.state, ...newState };
    this._render();
  }

  triggerAction(actionName) {
    return securityGuard.inspect({
      method: 'POST',
      action: actionName,
      source: 'RealityObservatory'
    });
  }

  _getSemaphoreColor(val, type) {
    if (type === 'gap') return val >= 75 ? '#00E676' : (val >= 50 ? '#FFEA00' : '#FF1744');
    if (type === 'exec') return val >= 80 ? '#00E676' : (val >= 50 ? '#FFEA00' : '#FF1744');
    if (type === 'clock') return Math.abs(val) < 20 ? '#00E676' : (Math.abs(val) < 50 ? '#FFEA00' : '#FF1744');
    return '#00E676';
  }

  _render() {
    if (!this._container) return;

    const gapColor = this._getSemaphoreColor(this.state.realityGapScore, 'gap');
    const execColor = this._getSemaphoreColor(this.state.executionQuality, 'exec');
    const clockColor = this._getSemaphoreColor(this.state.clockIntegrity, 'clock');

    this._container.innerHTML = `
      <div class="command-center-reality-observatory" style="background: #0a0d14; color: #e0e6ed; padding: 20px; font-family: 'JetBrains Mono', monospace; border: 1px solid #1a2333;">
        <h2 style="font-size: 1.1rem; color: #ffffff; margin: 0 0 16px 0; border-bottom: 1px solid #1a2333; padding-bottom: 8px;">
          🔬 PHYSICAL MICROSTRUCTURE OBSERVATORY (READ-ONLY)
        </h2>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">REALITY GAP SCORE</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: ${gapColor};">${this.state.realityGapScore} / 100</div>
          </div>
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">EXECUTION QUALITY</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: ${execColor};">${this.state.executionQuality}%</div>
          </div>
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">CLOCK INTEGRITY DRIFT</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: ${clockColor};">${this.state.clockIntegrity} ms</div>
          </div>
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">LIQUIDITY REALITY DEPTH</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: #00c8ff;">${(this.state.liquidityReality * 100).toFixed(1)}%</div>
          </div>
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">SLIPPAGE DIVERGENCE</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: #e0e6ed;">${this.state.slippageDivergence} bps</div>
          </div>
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 6px;">LATENCY IMPACT</div>
            <div style="font-size: 1.6rem; font-weight: bold; color: #e0e6ed;">${this.state.latencyImpact} ms</div>
          </div>
        </div>
      </div>
    `;
  }
}

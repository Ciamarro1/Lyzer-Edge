/**
 * Lyzer Edge Command Center v2 — Black Swan Defense Panel Component (ETAPA 1 & 6)
 * Observes adversarial stress certification results.
 * Strictly read-only.
 */

import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';

export class BlackSwanDefensePanel {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this._container = null;
    this.state = {
      scenarios: [
        { name: 'Exchange outage', status: 'PASSED', duration: '120s' },
        { name: 'Liquidity evaporation', status: 'PASSED', duration: '60s' },
        { name: 'Timestamp corruption', status: 'PASSED', duration: '30s' },
        { name: 'Network failure', status: 'PASSED', duration: '180s' },
        { name: 'Data corruption', status: 'PASSED', duration: '45s' },
        { name: 'Spread explosion', status: 'PASSED', duration: '90s' }
      ],
      overallStatus: 'PASSED',
      failedCount: 0
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
      source: 'BlackSwanDefensePanel'
    });
  }

  _render() {
    if (!this._container) return;

    const overallColor = this.state.failedCount === 0 ? '#00E676' : '#FF1744';

    const scenariosHtml = this.state.scenarios.map(s => {
      const color = s.status === 'PASSED' ? '#00E676' : '#FF1744';
      return `
        <div style="background: #111622; padding: 12px; border: 1px solid #223047; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: #e0e6ed; font-size: 0.9rem;">${s.name}</span>
            <div style="color: #8899aa; font-size: 0.75rem;">Test Duration: ${s.duration}</div>
          </div>
          <div style="color: ${color}; font-weight: bold; border: 1px solid ${color}; padding: 2px 8px; border-radius: 2px;">
            ${s.status}
          </div>
        </div>
      `;
    }).join('');

    this._container.innerHTML = `
      <div class="command-center-black-swan" style="background: #0a0d14; color: #e0e6ed; padding: 20px; font-family: 'JetBrains Mono', monospace; border: 1px solid #1a2333;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a2333; padding-bottom: 8px; margin-bottom: 16px;">
          <h2 style="font-size: 1.1rem; color: #ffffff; margin: 0;">
            🦢 BLACK SWAN DEFENSE PANEL (ADVERSARIAL STRESS CERTIFICATION)
          </h2>
          <div style="font-size: 1rem; font-weight: bold; color: ${overallColor};">
            OVERALL: [ ${this.state.overallStatus} ] • FAILED: ${this.state.failedCount}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          ${scenariosHtml}
        </div>
      </div>
    `;
  }
}

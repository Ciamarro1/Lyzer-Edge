/**
 * Lyzer Edge Command Center v2 — Executive Overview Component (ETAPA 1 & 3)
 * First screen. Answers in 5 seconds: "Posso confiar no sistema?"
 * Strictly read-only.
 */

import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';

export class ExecutiveOverview {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this._container = null;
    this.state = {
      lifecycleStage: 'L15 ACTIVE',
      governanceStatus: 'GREEN',
      alphaStatus: 'IMMUTABLE',
      capitalStatus: 'NOT CONNECTED',
      realityGapScore: 96,
      realityStatus: 'GREEN',
      truthKernelHash: 'a8f5b2c9e7d1048372619405827364510928374655a1b2c3d4e5f60718293a4b',
      mutationAttempts: 0,
      firewallVetoes: 12
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

  /**
   * Block any attempt to trigger actions from UI
   */
  triggerAction(actionName) {
    return securityGuard.inspect({
      method: 'POST',
      action: actionName,
      source: 'ExecutiveOverview'
    });
  }

  _getSemaphoreColor(status) {
    switch (status) {
      case 'GREEN':
      case 'IMMUTABLE':
      case 'VALID':
      case 'PASSED':
      case 'NOT CONNECTED':
        return '#00E676'; // Institutional Green
      case 'YELLOW':
      case 'WARNING':
        return '#FFEA00'; // Institutional Yellow
      case 'ORANGE':
        return '#FF9100'; // Institutional Orange
      case 'RED':
      case 'HALTED':
      case 'CORRUPTED':
      case 'FAILED':
        return '#FF1744'; // Institutional Red
      default:
        return '#00E676';
    }
  }

  _render() {
    if (!this._container) return;

    const govColor = this._getSemaphoreColor(this.state.governanceStatus);
    const alphaColor = this._getSemaphoreColor(this.state.alphaStatus);
    const capitalColor = this._getSemaphoreColor(this.state.capitalStatus);
    const realityColor = this._getSemaphoreColor(this.state.realityStatus);

    this._container.innerHTML = `
      <div class="command-center-executive-overview" style="background: #0a0d14; color: #e0e6ed; padding: 20px; font-family: 'JetBrains Mono', monospace; border: 1px solid #1a2333;">
        <div style="border-bottom: 2px solid #1a2333; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="font-size: 1.4rem; margin: 0; color: #ffffff; letter-spacing: 1px;">LYZER EDGE COMMAND CENTER v2</h1>
            <span style="font-size: 0.85rem; color: #8899aa;">INSTITUTIONAL FIDUCIARY OBSERVATORY • READ-ONLY</span>
          </div>
          <div style="background: #111622; padding: 6px 12px; border: 1px solid #223047; border-radius: 4px; font-weight: bold;">
            MISSION: <span style="color: #00c8ff;">${this.state.lifecycleStage}</span>
          </div>
        </div>

        <!-- 3 Pillars Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
          <!-- System Status -->
          <div style="background: #111622; border: 1px solid #223047; padding: 16px; border-radius: 4px;">
            <h2 style="font-size: 0.95rem; color: #8899aa; margin: 0 0 12px 0; text-transform: uppercase;">SYSTEM STATUS</h2>
            <div style="margin-bottom: 8px;">
              <span style="color: #8899aa; font-size: 0.85rem;">Governance:</span>
              <span style="color: ${govColor}; font-weight: bold; float: right;">[ ${this.state.governanceStatus} ]</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="color: #8899aa; font-size: 0.85rem;">Alpha Core:</span>
              <span style="color: ${alphaColor}; font-weight: bold; float: right;">[ ${this.state.alphaStatus} ]</span>
            </div>
            <div>
              <span style="color: #8899aa; font-size: 0.85rem;">Capital Connection:</span>
              <span style="color: ${capitalColor}; font-weight: bold; float: right;">[ ${this.state.capitalStatus} ]</span>
            </div>
          </div>

          <!-- Reality Status -->
          <div style="background: #111622; border: 1px solid #223047; padding: 16px; border-radius: 4px; text-align: center;">
            <h2 style="font-size: 0.95rem; color: #8899aa; margin: 0 0 12px 0; text-transform: uppercase;">REALITY GAP STATUS</h2>
            <div style="font-size: 2.2rem; font-weight: bold; color: ${realityColor}; margin-bottom: 4px;">
              ${this.state.realityGapScore} / 100
            </div>
            <div style="display: inline-block; background: #0a0d14; border: 1px solid ${realityColor}; color: ${realityColor}; padding: 2px 8px; font-size: 0.8rem; border-radius: 2px;">
              STATUS: ${this.state.realityStatus}
            </div>
          </div>

          <!-- Integrity Status -->
          <div style="background: #111622; border: 1px solid #223047; padding: 16px; border-radius: 4px;">
            <h2 style="font-size: 0.95rem; color: #8899aa; margin: 0 0 12px 0; text-transform: uppercase;">CRYPTOGRAPHIC INTEGRITY</h2>
            <div style="margin-bottom: 8px;">
              <div style="color: #8899aa; font-size: 0.75rem;">TruthKernel SHA256:</div>
              <div style="color: #00E676; font-size: 0.75rem; word-break: break-all; background: #0a0d14; padding: 4px; border: 1px solid #1a2333;">
                ${this.state.truthKernelHash.substring(0, 24)}...
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-top: 8px;">
              <span>Mutation Attempts: <strong style="color: #00E676;">${this.state.mutationAttempts}</strong></span>
              <span>Firewall Veto: <strong style="color: #00c8ff;">${this.state.firewallVetoes}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

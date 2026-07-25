/**
 * Lyzer Edge Command Center v2 — Human Oversight Panel Component (ETAPA 1)
 * Synthesizes CIO, CRO, Auditor, and Regulator fiduciary interrogation views.
 * Strictly read-only.
 */

import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';

export class HumanOversightPanel {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this._container = null;
    this.state = {
      cioStatus: 'FIDUCIARY ALIGNMENT GREEN',
      croStatus: 'BLACK SWAN PASSED (6/6)',
      auditorStatus: 'HASH IMMUTABLE (0 MUTATIONS)',
      regulatorStatus: 'CAPITAL DISCONNECTED (SHADOW ONLY)'
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
      source: 'HumanOversightPanel'
    });
  }

  _render() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="command-center-human-oversight" style="background: #0a0d14; color: #e0e6ed; padding: 20px; font-family: 'JetBrains Mono', monospace; border: 1px solid #1a2333;">
        <h2 style="font-size: 1.1rem; color: #ffffff; margin: 0 0 16px 0; border-bottom: 1px solid #1a2333; padding-bottom: 8px;">
          👔 HUMAN OVERSIGHT PANEL (C-LEVEL FIDUCIARY INTERROGATION)
        </h2>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #00c8ff; font-weight: bold; margin-bottom: 4px;">👔 CIO VIEW</div>
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 8px;">"Posso confiar na execução de longo prazo?"</div>
            <div style="color: #00E676; font-weight: bold;">[ ${this.state.cioStatus} ]</div>
          </div>

          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #FF9100; font-weight: bold; margin-bottom: 4px;">🛡️ CRO VIEW</div>
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 8px;">"Qual a exposição ao risco estrutural e de cauda?"</div>
            <div style="color: #00E676; font-weight: bold;">[ ${this.state.croStatus} ]</div>
          </div>

          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #00E676; font-weight: bold; margin-bottom: 4px;">🔍 AUDITOR VIEW</div>
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 8px;">"Consigo provar matematicamente a imutabilidade do Alpha?"</div>
            <div style="color: #00E676; font-weight: bold;">[ ${this.state.auditorStatus} ]</div>
          </div>

          <div style="background: #111622; padding: 14px; border: 1px solid #223047; border-radius: 4px;">
            <div style="color: #e0e6ed; font-weight: bold; margin-bottom: 4px;">⚖️ REGULATOR VIEW</div>
            <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 8px;">"Existe controle e bloqueio automático contra drift?"</div>
            <div style="color: #00E676; font-weight: bold;">[ ${this.state.regulatorStatus} ]</div>
          </div>
        </div>
      </div>
    `;
  }
}

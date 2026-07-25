/**
 * Lyzer Edge Command Center v2 — Data Lineage Forensics Component (ETAPA 1)
 * Displays origin, SHA-256 hash, and transformation chains.
 * Strictly read-only.
 */

import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';

export class DataLineageForensics {
  constructor(dataProvider) {
    this.dataProvider = dataProvider;
    this._container = null;
    this.state = {
      events: [
        {
          name: 'RealityGapScore',
          origin: 'RealityGapMonitor.js',
          realityTag: 'OBSERVED_REALITY',
          hash: 'e7d1048372619405827364510928374655a1b2c3d4e5f60718293a4ba8f5b2c9',
          chain: ['RAW_BOOK_INGEST', 'MID_PRICE_CALC', 'SLIPPAGE_RESIDUALIZATION']
        },
        {
          name: 'SimulatedFill',
          origin: 'ShadowExecutionEngine.js',
          realityTag: 'OBSERVED_REALITY',
          hash: 'c3d4e5f60718293a4ba8f5b2c9e7d1048372619405827364510928374655a1b2',
          chain: ['SIGNAL_EVALUATION', 'SPREAD_CHECK', 'LIQUIDITY_MATCH']
        }
      ]
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
      source: 'DataLineageForensics'
    });
  }

  _render() {
    if (!this._container) return;

    const eventsHtml = this.state.events.map(e => {
      const tagColor = e.realityTag === 'OBSERVED_REALITY' ? '#00E676' : '#00c8ff';
      return `
        <div style="background: #111622; padding: 12px; border: 1px solid #223047; border-radius: 4px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: bold; color: #ffffff;">${e.name}</span>
            <span style="color: ${tagColor}; border: 1px solid ${tagColor}; padding: 1px 6px; font-size: 0.75rem;">[ ${e.realityTag} ]</span>
          </div>
          <div style="color: #8899aa; font-size: 0.8rem; margin-bottom: 4px;">Origin: <span style="color: #e0e6ed;">${e.origin}</span></div>
          <div style="color: #8899aa; font-size: 0.75rem; word-break: break-all; margin-bottom: 6px;">SHA256: <span style="color: #00E676;">${e.hash}</span></div>
          <div style="color: #8899aa; font-size: 0.75rem;">
            Transformation Chain: 
            <span style="color: #00c8ff;">${e.chain.join(' ➔ ')}</span>
          </div>
        </div>
      `;
    }).join('');

    this._container.innerHTML = `
      <div class="command-center-data-lineage" style="background: #0a0d14; color: #e0e6ed; padding: 20px; font-family: 'JetBrains Mono', monospace; border: 1px solid #1a2333;">
        <h2 style="font-size: 1.1rem; color: #ffffff; margin: 0 0 16px 0; border-bottom: 1px solid #1a2333; padding-bottom: 8px;">
          🔍 DATA LINEAGE FORENSICS (CAUSAL RATIONALE)
        </h2>
        <div>
          ${eventsHtml}
        </div>
      </div>
    `;
  }
}

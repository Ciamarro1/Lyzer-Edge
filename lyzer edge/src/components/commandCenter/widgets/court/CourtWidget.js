/**
 * Lyzer Edge Command Center V2 — CourtWidget
 * Visual Institutional Governance Widget rendering Constitutional Court vetoes,
 * EEF validations, LHDS scores, and DecisionLedger evidence.
 */

import { courtManifest } from './manifest.js';

export class CourtWidget {
  constructor() {
    this.manifest = courtManifest;
    this._container = null;
    this._runtime = null;
    this._ui = {};
    this._disposable = null;
  }

  async mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._render();
    await this._subscribe();
  }

  _render() {
    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; font-size: 11px; background: #1b1d23; color: #abb2bf; border: 1px solid #4b5263; border-radius: 6px; height: 100%; box-sizing: border-box; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #4b5263; padding-bottom: 6px; margin-bottom: 10px;">
          <h4 style="margin: 0; color: #e5c07b; font-size: 13px; font-weight: bold;">⚖️ CONSTITUTIONAL COURT</h4>
          <span id="cw-status" style="background: #98c379; color: #1e1e1e; padding: 2px 6px; border-radius: 3px; font-weight: bold;">ALLOW</span>
        </div>

        <!-- COURT METRICS -->
        <div style="margin-bottom: 10px; background: #21252b; padding: 8px; border-radius: 4px;">
          <div>LHDS Score: <span id="cw-lhds" style="color: #61afef;">0.00</span></div>
          <div>EEF Constraint: <span id="cw-eef" style="color: #98c379;">VALID</span></div>
          <div>MOL Recovery State: <span id="cw-mol" style="color: #98c379;">EXECUTE</span></div>
        </div>

        <!-- DECISION LEDGER LOG -->
        <div style="background: #21252b; padding: 8px; border-radius: 4px;">
          <div style="color: #e5c07b; font-weight: bold; margin-bottom: 6px;">DECISION LEDGER AUDIT</div>
          <div id="cw-ledger-list" style="max-height: 150px; overflow-y: auto;">
            <div style="color: #5c6370; font-style: italic;">No decisions recorded...</div>
          </div>
        </div>
      </div>
    `;

    this._ui = {
      status: this._container.querySelector('#cw-status'),
      lhds: this._container.querySelector('#cw-lhds'),
      eef: this._container.querySelector('#cw-eef'),
      mol: this._container.querySelector('#cw-mol'),
      ledgerList: this._container.querySelector('#cw-ledger-list')
    };
  }

  async _subscribe() {
    try {
      if (this._runtime && typeof this._runtime.getDecisionLedger === 'function') {
        const history = await this._runtime.getDecisionLedger({ limit: 10 });
        this._renderLedger(history);
      }

      if (this._runtime && typeof this._runtime.subscribeDecisionLedger === 'function') {
        this._disposable = await this._runtime.subscribeDecisionLedger((entry) => {
          this._addLedgerEntry(entry);
        });
      }
    } catch (e) {
      console.error('[CourtWidget] Subscription error:', e);
    }
  }

  _renderLedger(entries) {
    if (!this._ui.ledgerList || !Array.isArray(entries) || entries.length === 0) return;
    this._ui.ledgerList.innerHTML = '';
    entries.forEach(e => this._addLedgerEntry(e));
  }

  _addLedgerEntry(entry) {
    if (!this._ui.ledgerList) return;
    
    // Clear initial empty text
    if (this._ui.ledgerList.children.length === 1 && this._ui.ledgerList.children[0].style.fontStyle === 'italic') {
      this._ui.ledgerList.innerHTML = '';
    }

    const item = document.createElement('div');
    item.style.marginBottom = '6px';
    item.style.borderBottom = '1px dashed #3b4048';
    item.style.paddingBottom = '4px';

    const color = entry.decision.includes('ALLOW') ? '#98c379' : '#e06c75';
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <strong style="color: ${color};">${entry.decision}</strong>
        <span style="color: #5c6370; font-size: 10px;">${new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color: #abb2bf;">${entry.component}: ${entry.reason}</div>
      <div style="color: #5c6370; font-size: 10px;">Confidence: ${(entry.confidence * 100).toFixed(0)}%</div>
    `;

    this._ui.ledgerList.insertBefore(item, this._ui.ledgerList.firstChild);
  }

  dispose() {
    if (this._disposable && typeof this._disposable.dispose === 'function') {
      this._disposable.dispose();
      this._disposable = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._runtime = null;
  }

  unmount() {
    this.dispose();
  }
}

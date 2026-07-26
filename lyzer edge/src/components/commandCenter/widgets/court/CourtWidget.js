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
      <div style="padding: 16px; font-family: 'Inter', system-ui, sans-serif; font-size: 11px; background: rgba(8, 12, 20, 0.45); backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3); color: #cbd5e1; border: 1px solid rgba(56, 189, 248, 0.06); border-radius: 10px; height: 100%; box-sizing: border-box; overflow-y: auto; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(6, 182, 212, 0.08); padding-bottom: 10px; margin-bottom: 12px;">
          <h4 style="margin: 0; color: #e2e8f0; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.4);"></span>
            CONSTITUTIONAL COURT
          </h4>
          <span id="cw-status" style="background: rgba(16,185,129,0.1); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 9px; letter-spacing: 0.5px; border: 1px solid rgba(16,185,129,0.15);">ALLOW</span>
        </div>

        <div style="margin-bottom: 12px; background: rgba(8, 14, 28, 0.4); backdrop-filter: blur(8px); border: 1px solid rgba(56, 189, 248, 0.06); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(148, 163, 184, 0.6); font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">LHDS Score</span>
            <span id="cw-lhds" style="color: #38bdf8; font-weight: 800; font-family: 'JetBrains Mono', monospace;">0.000</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(148, 163, 184, 0.6); font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">EEF Constraint</span>
            <span id="cw-eef" style="color: #4ade80; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 10px;">VALID</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: rgba(148, 163, 184, 0.6); font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">MOL State</span>
            <span id="cw-mol" style="color: #4ade80; font-weight: 700; font-family: 'JetBrains Mono', monospace; font-size: 10px;">EXECUTE</span>
          </div>
        </div>

        <div style="background: rgba(12, 16, 30, 0.4); border: 1px solid rgba(148, 163, 184, 0.06); border-radius: 8px; padding: 10px;">
          <div style="color: rgba(56, 189, 248, 0.5); font-weight: 700; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Decision Ledger Audit</div>
          <div id="cw-ledger-list" style="max-height: 150px; overflow-y: auto;">
            <div style="color: rgba(148, 163, 184, 0.2); font-style: italic; font-size: 10px;">No decisions recorded...</div>
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
    item.style.borderBottom = '1px solid rgba(148,163,184,0.06)';
    item.style.paddingBottom = '6px';

    const allowed = entry.decision.includes('ALLOW');
    const color = allowed ? '#10b981' : '#ef4444';
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 10px; color: ${color}; display: flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: ${color}; box-shadow: 0 0 4px ${color};"></span>
          ${entry.decision}
        </span>
        <span style="color: rgba(148,163,184,0.3); font-size: 8px; font-family: 'JetBrains Mono', monospace;">${new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      <div style="color: rgba(148,163,184,0.5); font-size: 9px; margin-top: 2px;">${entry.component}: ${entry.reason}</div>
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

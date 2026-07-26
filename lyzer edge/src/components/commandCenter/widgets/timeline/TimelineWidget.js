/**
 * Lyzer Edge Command Center V2 — TimelineWidget
 * Multi-dimensional chronological pipeline visualizer.
 * Renders end-to-end event lineage (Ticks -> Reality Transitions -> Decisions -> Renders).
 */

import { timelineManifest } from './manifest.js';

export class TimelineWidget {
  constructor() {
    this.manifest = timelineManifest;
    this._container = null;
    this._runtime = null;
    this._ui = {};
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
      <div style="padding: 12px; font-family: monospace; font-size: 11px; background: #1a1c23; color: #abb2bf; border: 1px solid #3e4451; border-radius: 6px; height: 100%; box-sizing: border-box; overflow-y: auto;">
        <div style="border-bottom: 1px solid #3e4451; padding-bottom: 6px; margin-bottom: 10px;">
          <h4 style="margin: 0; color: #61afef; font-size: 13px; font-weight: bold;">⏱️ CAUSAL INTENT TIMELINE</h4>
        </div>

        <div id="tw-timeline-list" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Timeline trace elements -->
          <div style="border-left: 2px solid #61afef; padding-left: 8px;">
            <div style="color: #61afef; font-weight: bold;">[INIT] System Boot Completed</div>
            <div style="color: #5c6370; font-size: 10px;">Reality: OBSERVED_REALITY</div>
          </div>
        </div>
      </div>
    `;

    this._ui = {
      list: this._container.querySelector('#tw-timeline-list')
    };
  }

  _subscribe() {
    if (typeof this._runtime.subscribeSnapshot === 'function') {
      this._disposable = this._runtime.subscribeSnapshot((snapshot) => {
        this._addTraceItem('SNAPSHOT_UPDATE', `Reality: ${snapshot.realityTag || 'OBSERVED'}`, '#98c379');
      });
    }
  }

  _addTraceItem(type, description, color = '#61afef') {
    if (!this._ui.list) return;

    const item = document.createElement('div');
    item.style.borderLeft = `2px solid ${color}`;
    item.style.paddingLeft = '8px';
    item.style.marginBottom = '4px';

    item.innerHTML = `
      <div style="color: ${color}; font-weight: bold;">[${type}] ${new Date().toLocaleTimeString()}</div>
      <div style="color: #abb2bf; font-size: 10px;">${description}</div>
    `;

    this._ui.list.insertBefore(item, this._ui.list.firstChild);

    // Limit visible traces
    while (this._ui.list.children.length > 20) {
      this._ui.list.removeChild(this._ui.list.lastChild);
    }
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

/**
 * Lyzer Edge Command Center V2 — CausalGraphWidget
 * Interactive dependency graph rendering the live institutional flow:
 * Provider -> Reality -> Decision -> Runtime -> Widgets -> Chart
 */

import { causalGraphManifest } from './manifest.js';

export class CausalGraphWidget {
  constructor() {
    this.manifest = causalGraphManifest;
    this._container = null;
    this._runtime = null;
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
      <div style="padding: 12px; font-family: monospace; font-size: 11px; background: #16181d; color: #abb2bf; border: 1px solid #3b4048; border-radius: 6px; height: 100%; box-sizing: border-box; overflow-x: auto;">
        <div style="border-bottom: 1px solid #3b4048; padding-bottom: 6px; margin-bottom: 12px;">
          <h4 style="margin: 0; color: #d19a66; font-size: 13px; font-weight: bold;">INSTITUTIONAL CAUSAL GRAPH</h4>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 600px; padding: 10px 0;">
          <!-- Node 1: Provider -->
          <div style="background: #21252b; border: 1px solid #98c379; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #98c379; font-weight: bold;">PROVIDER</div>
            <div id="cg-provider-id" style="font-size: 10px;">live-default</div>
          </div>

          <div style="color: #5c6370; font-weight: bold;">➔</div>

          <!-- Node 2: Reality -->
          <div style="background: #21252b; border: 1px solid #61afef; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #61afef; font-weight: bold;">REALITY</div>
            <div id="cg-reality-tag" style="font-size: 10px;">OBSERVED</div>
          </div>

          <div style="color: #5c6370; font-weight: bold;">➔</div>

          <!-- Node 3: Decision Engine -->
          <div style="background: #21252b; border: 1px solid #e5c07b; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #e5c07b; font-weight: bold;">DECISION ENGINE</div>
            <div style="font-size: 10px; color: #98c379;">ALLOW</div>
          </div>

          <div style="color: #5c6370; font-weight: bold;">➔</div>

          <!-- Node 4: Runtime -->
          <div style="background: #21252b; border: 1px solid #c678dd; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #c678dd; font-weight: bold;">RUNTIME</div>
            <div style="font-size: 10px;">FACADE V1.0</div>
          </div>

          <div style="color: #5c6370; font-weight: bold;">➔</div>

          <!-- Node 5: Widgets -->
          <div style="background: #21252b; border: 1px solid #56b6c2; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #56b6c2; font-weight: bold;">WIDGETS</div>
            <div id="cg-widgets-count" style="font-size: 10px;">6 Active</div>
          </div>

          <div style="color: #5c6370; font-weight: bold;">➔</div>

          <!-- Node 6: Chart -->
          <div style="background: #21252b; border: 1px solid #e06c75; border-radius: 4px; padding: 8px; text-align: center; flex: 1;">
            <div style="color: #e06c75; font-weight: bold;">CHART / CANVAS</div>
            <div style="font-size: 10px;">RENDERED</div>
          </div>
        </div>
      </div>
    `;
  }

  _subscribe() {
    if (this._runtime && typeof this._runtime.subscribeSnapshot === 'function') {
      this._disposable = this._runtime.subscribeSnapshot((snapshot) => {
        const providerEl = this._container.querySelector('#cg-provider-id');
        const realityEl = this._container.querySelector('#cg-reality-tag');

        if (providerEl) providerEl.textContent = snapshot.providerId || 'live-default';
        if (realityEl) realityEl.textContent = snapshot.realityTag || 'OBSERVED';
      });
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

/**
 * Lyzer Edge Command Center v2 — Institutional Shell
 *
 * Full-page institutional command center layout. Owns:
 *   - Header: version, lifecycle stage, governance, alpha freeze, capital status
 *   - Navigation: 8 fiduciary observation modules
 *   - Viewport: active component
 *   - Footer: read-only attestation and veto counter
 *
 * ARCHITECTURAL RULES:
 *   1. Shell consumes ONLY the RuntimeAdapter — never raw L15 modules.
 *   2. Shell is strictly read-only. Any mutation attempt triggers DASHBOARD_CONTROL_VETO.
 *   3. Shell follows Institutional Dark Command Center aesthetic (Purple Ban enforced).
 */

import { runtimeAdapter } from '../../services/dashboard/dashboardRuntimeAdapter.js';
import { securityGuard } from '../../services/dashboard/dashboardSecurityGuard.js';
import { CommandCenterRouter } from './CommandCenterRouter.js';
import { CommandCenterNavigation } from './CommandCenterNavigation.js';

export class CommandCenterShell {
  constructor() {
    this._container = null;
    this._navigation = null;
    this._router = null;
    this._adapter = runtimeAdapter;
  }

  /**
   * Mount the entire Command Center into a container element.
   * Conforms to the standard Lyzer component contract: mount(el) / unmount().
   * @param {HTMLElement} container
   */
  mount(container) {
    this._container = container;
    this._renderLayout();

    // Initialize internal router
    this._router = new CommandCenterRouter(this._adapter);
    const viewport = this._container.querySelector('#cc-viewport');
    this._router.setViewport(viewport);

    // Initialize navigation
    const navContainer = this._container.querySelector('#cc-nav-container');
    this._navigation = new CommandCenterNavigation({
      activeModule: 'overview',
      onNavigate: (moduleKey) => this._onModuleSwitch(moduleKey)
    });
    this._navigation.mount(navContainer);

    // Mount initial module
    this._router.navigateTo('overview');

    // Render header status from adapter snapshot
    this._updateHeaderStatus();
  }

  unmount() {
    if (this._navigation) {
      this._navigation.unmount();
      this._navigation = null;
    }
    if (this._router) {
      this._router.destroy();
      this._router = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  /**
   * Block any attempt to trigger actions from UI.
   * Required by the component contract for security guard integration.
   */
  triggerAction(actionName) {
    return securityGuard.inspect({
      method: 'POST',
      action: actionName,
      source: 'CommandCenterShell'
    });
  }

  // ── PRIVATE METHODS ──────────────────────────────────────────────────

  /** @private */
  _onModuleSwitch(moduleKey) {
    this._router.navigateTo(moduleKey);
  }

  /** @private */
  _updateHeaderStatus() {
    const snapshot = this._adapter.hasData()
      ? this._adapter.getSnapshot()
      : this._adapter.getDefaultSnapshot();

    const stageEl = this._container.querySelector('#cc-status-stage');
    const govEl = this._container.querySelector('#cc-status-governance');
    const alphaEl = this._container.querySelector('#cc-status-alpha');
    const capitalEl = this._container.querySelector('#cc-status-capital');
    const vetoEl = this._container.querySelector('#cc-footer-veto');

    if (stageEl) stageEl.textContent = snapshot.system_stage;
    if (govEl) {
      govEl.textContent = `GOV: ${snapshot.governance}`;
      govEl.className = `cc-status-pill cc-status-${snapshot.governance.toLowerCase()}`;
    }
    if (alphaEl) {
      alphaEl.textContent = `ALPHA: ${snapshot.alpha_state}`;
      alphaEl.className = `cc-status-pill cc-status-${snapshot.alpha_state === 'IMMUTABLE' ? 'green' : 'red'}`;
    }
    if (capitalEl) {
      capitalEl.textContent = `CAPITAL: ${snapshot.capital_status}`;
      capitalEl.className = `cc-status-pill cc-status-${snapshot.capital_status === 'NOT_CONNECTED' ? 'neutral' : 'yellow'}`;
    }
    if (vetoEl) {
      const count = securityGuard.getVetoCount();
      vetoEl.textContent = `VETO COUNT: ${count}`;
    }
  }

  /** @private */
  _renderLayout() {
    if (!this._container) return;

    this._container.innerHTML = `
      <div class="cc-shell" style="
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 100vh;
        background: #06080d;
        color: #c8d0da;
        font-family: 'JetBrains Mono', 'Cascadia Code', 'SF Mono', 'Fira Code', monospace;
      ">

        <!-- HEADER: Institutional Status Bar -->
        <header class="cc-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 20px;
          background: #0a0d14;
          border-bottom: 1px solid #1a2333;
          flex-shrink: 0;
          min-height: 44px;
        ">
          <div class="cc-header-brand" style="
            font-size: 0.85rem;
            font-weight: 700;
            color: #e0e6ed;
            letter-spacing: 0.08em;
          ">
            LYZER EDGE
            <span style="color: #4a5568; margin: 0 6px;">|</span>
            <span style="color: #8899aa; font-weight: 400;">INSTITUTIONAL COMMAND CENTER</span>
          </div>

          <div class="cc-header-status" style="display: flex; gap: 10px; align-items: center;">
            <span id="cc-status-stage" class="cc-status-pill cc-status-neutral" style="
              font-size: 0.7rem;
              padding: 2px 10px;
              border-radius: 2px;
              border: 1px solid #334155;
              color: #00c8ff;
              background: rgba(0, 200, 255, 0.06);
            ">L15</span>

            <span id="cc-status-governance" class="cc-status-pill cc-status-green" style="
              font-size: 0.7rem;
              padding: 2px 10px;
              border-radius: 2px;
              border: 1px solid #00E676;
              color: #00E676;
              background: rgba(0, 230, 118, 0.06);
            ">GOV: GREEN</span>

            <span id="cc-status-alpha" class="cc-status-pill cc-status-green" style="
              font-size: 0.7rem;
              padding: 2px 10px;
              border-radius: 2px;
              border: 1px solid #00E676;
              color: #00E676;
              background: rgba(0, 230, 118, 0.06);
            ">ALPHA: IMMUTABLE</span>

            <span id="cc-status-capital" class="cc-status-pill cc-status-neutral" style="
              font-size: 0.7rem;
              padding: 2px 10px;
              border-radius: 2px;
              border: 1px solid #334155;
              color: #8899aa;
              background: rgba(136, 153, 170, 0.06);
            ">CAPITAL: NOT_CONNECTED</span>
          </div>
        </header>

        <!-- NAVIGATION: 8 Module Tabs -->
        <div id="cc-nav-container" style="
          background: #0c1018;
          border-bottom: 1px solid #1a2333;
          flex-shrink: 0;
        "></div>

        <!-- VIEWPORT: Active Module Container -->
        <main id="cc-viewport" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background: #06080d;
        "></main>

        <!-- FOOTER: Read-Only Attestation -->
        <footer class="cc-footer" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 20px;
          background: #0a0d14;
          border-top: 1px solid #1a2333;
          font-size: 0.65rem;
          color: #4a5568;
          flex-shrink: 0;
          min-height: 24px;
        ">
          <span>MODE: READ-ONLY FIDUCIARY</span>
          <span id="cc-footer-veto">VETO COUNT: 0</span>
        </footer>

      </div>
    `;
  }
}

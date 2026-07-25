/**
 * Lyzer Edge Command Center v2 — Internal Module Router
 *
 * Manages the lifecycle (mount/unmount) of the 8 observational components.
 * Does NOT interact with the browser hash — the outer app router handles that.
 * This is a simple component switcher inside the Command Center viewport.
 */

import { ExecutiveOverview } from './ExecutiveOverview.js';
import { RealityObservatory } from './RealityObservatory.js';
import { AlphaIntegrityMonitor } from './AlphaIntegrityMonitor.js';
import { ShadowExecutionCenter } from './ShadowExecutionCenter.js';
import { OperationalSurvivalCenter } from './OperationalSurvivalCenter.js';
import { BlackSwanDefensePanel } from './BlackSwanDefensePanel.js';
import { DataLineageForensics } from './DataLineageForensics.js';
import { HumanOversightPanel } from './HumanOversightPanel.js';

/**
 * Maps module keys to their component constructors.
 * Each constructor receives the runtimeAdapter as its single dependency.
 */
const MODULE_REGISTRY = {
  overview:   (adapter) => new ExecutiveOverview(adapter),
  reality:    (adapter) => new RealityObservatory(adapter),
  alpha:      (adapter) => new AlphaIntegrityMonitor(adapter),
  shadow:     (adapter) => new ShadowExecutionCenter(adapter),
  endurance:  (adapter) => new OperationalSurvivalCenter(adapter),
  blackswan:  (adapter) => new BlackSwanDefensePanel(adapter),
  forensics:  (adapter) => new DataLineageForensics(adapter),
  oversight:  (adapter) => new HumanOversightPanel(adapter)
};

export class CommandCenterRouter {
  /**
   * @param {Object} runtimeAdapter - The CommandCenterRuntimeAdapter singleton
   */
  constructor(runtimeAdapter) {
    this._adapter = runtimeAdapter;
    this._viewport = null;
    this._activeModule = null;
    this._activeComponent = null;
  }

  /**
   * Set the DOM element where components will be mounted.
   * @param {HTMLElement} viewport
   */
  setViewport(viewport) {
    this._viewport = viewport;
  }

  /**
   * Navigate to a module by key. Cleanly unmounts the previous component
   * and mounts the new one.
   *
   * @param {string} moduleKey - One of: overview, reality, alpha, shadow,
   *                             endurance, blackswan, forensics, oversight
   * @returns {boolean} true if navigation succeeded
   */
  navigateTo(moduleKey) {
    if (!this._viewport) {
      console.error('[CommandCenterRouter] No viewport set.');
      return false;
    }

    const factory = MODULE_REGISTRY[moduleKey];
    if (!factory) {
      console.error(`[CommandCenterRouter] Unknown module: "${moduleKey}"`);
      return false;
    }

    // Unmount current component
    if (this._activeComponent?.unmount) {
      try {
        this._activeComponent.unmount();
      } catch (err) {
        console.error('[CommandCenterRouter] Error unmounting:', err);
      }
    }

    // Clear viewport
    this._viewport.innerHTML = '';

    // Mount new component
    try {
      this._activeComponent = factory(this._adapter);
      this._activeComponent.mount(this._viewport);
      this._activeModule = moduleKey;
      return true;
    } catch (err) {
      console.error('[CommandCenterRouter] Error mounting:', err);
      this._viewport.innerHTML = `
        <div style="padding: 40px; color: #FF1744; font-family: 'JetBrains Mono', monospace; text-align: center;">
          <div style="font-size: 1.2rem; margin-bottom: 8px;">MODULE LOAD FAILURE</div>
          <div style="color: #8899aa; font-size: 0.85rem;">${moduleKey}: ${err.message}</div>
        </div>`;
      return false;
    }
  }

  /**
   * Returns the currently active module key.
   * @returns {string|null}
   */
  getActiveModule() {
    return this._activeModule;
  }

  /**
   * Returns a list of all registered module keys.
   * @returns {string[]}
   */
  static getRegisteredModules() {
    return Object.keys(MODULE_REGISTRY);
  }

  /**
   * Unmount everything and clean up.
   */
  destroy() {
    if (this._activeComponent?.unmount) {
      try { this._activeComponent.unmount(); } catch (_) { /* swallow */ }
    }
    this._activeComponent = null;
    this._activeModule = null;
    if (this._viewport) {
      this._viewport.innerHTML = '';
      this._viewport = null;
    }
  }
}

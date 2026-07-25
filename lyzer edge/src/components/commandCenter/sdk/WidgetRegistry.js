/**
 * Lyzer Edge Command Center V2 — WidgetRegistry
 *
 * Central catalog managing widget plugin manifests, enforcing SemVer runtime
 * compatibility checks, capability registration, and unique identity constraints.
 */

import { validateManifest, WidgetError } from './types.js';

export const CURRENT_RUNTIME_VERSION = '3.4.0';

export class WidgetRegistry {
  constructor(runtimeVersion = CURRENT_RUNTIME_VERSION) {
    this._runtimeVersion = runtimeVersion;
    this._registry = new Map();
  }

  get runtimeVersion() {
    return this._runtimeVersion;
  }

  get size() {
    return this._registry.size;
  }

  /**
   * Registers a widget manifest in the central registry.
   * @param {Object} manifest - WidgetManifest object
   * @returns {Object} Frozen registered manifest
   */
  register(manifest) {
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      throw new WidgetError(
        'ERR_MANIFEST_INVALID',
        `Manifest validation failed: ${validation.errors.join(' ')}`,
        { errors: validation.errors }
      );
    }

    if (this._registry.has(manifest.id)) {
      throw new WidgetError(
        'ERR_DUPLICATE_WIDGET_ID',
        `Widget with ID '${manifest.id}' is already registered.`
      );
    }

    // Version compatibility check
    if (!this._isCompatible(manifest.minRuntimeVersion, this._runtimeVersion)) {
      throw new WidgetError(
        'ERR_VERSION_INCOMPATIBLE',
        `Widget '${manifest.id}' requires runtime version '${manifest.minRuntimeVersion}', but host runtime is '${this._runtimeVersion}'.`,
        { minRuntimeVersion: manifest.minRuntimeVersion, runtimeVersion: this._runtimeVersion }
      );
    }

    const frozenManifest = Object.freeze({
      ...manifest,
      capabilities: Object.freeze([...manifest.capabilities])
    });

    this._registry.set(manifest.id, frozenManifest);
    return frozenManifest;
  }

  /**
   * Retrieves a registered manifest by widget ID.
   * @param {string} id
   * @returns {Object|undefined}
   */
  get(id) {
    return this._registry.get(id);
  }

  /**
   * Checks if a widget ID is registered.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._registry.has(id);
  }

  /**
   * Returns an array of all registered manifests.
   * @returns {Object[]}
   */
  getAll() {
    return Array.from(this._registry.values());
  }

  /**
   * Returns all manifests targeting a specific pane ('LEFT_PANE' | 'RIGHT_PANE').
   * @param {string} targetPane
   * @returns {Object[]}
   */
  getByPane(targetPane) {
    return this.getAll().filter(m => m.targetPane === targetPane);
  }

  /**
   * Unregisters a widget manifest by ID.
   * @param {string} id
   * @returns {boolean} true if unregistered
   */
  unregister(id) {
    return this._registry.delete(id);
  }

  /**
   * Clears all registered widgets.
   */
  clear() {
    this._registry.clear();
  }

  /**
   * Helper function comparing major.minor versions for compatibility.
   * @private
   */
  _isCompatible(reqVer, hostVer) {
    try {
      const cleanReq = String(reqVer).replace(/-.*$/, '');
      const cleanHost = String(hostVer).replace(/-.*$/, '');
      const [reqMajor = 0, reqMinor = 0] = cleanReq.split('.').map(Number);
      const [hostMajor = 0, hostMinor = 0] = cleanHost.split('.').map(Number);
      if (reqMajor > hostMajor) return false;
      if (reqMajor === hostMajor && reqMinor > hostMinor) return false;
      return true;
    } catch {
      return false;
    }
  }
}

export const widgetRegistry = new WidgetRegistry();

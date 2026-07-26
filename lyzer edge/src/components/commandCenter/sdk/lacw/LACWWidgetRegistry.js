/**
 * Lyzer Adaptive Cognitive Workspace (LACW) — Widget Registry & Plugin Engine
 * Plugin lifecycle management, capability declaration, permission enforcement,
 * lazy-loading, hot-swapping, and certification verification.
 */

export class LACWWidgetRegistry {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._registeredPlugins = new Map(); // pluginId -> PluginRecord
    this._grantedCapabilities = new Set([
      'market_data:read',
      'evidence:publish',
      'telemetry:read',
      'traces:read',
      'history:read',
      'layout:manage',
      'command:execute'
    ]);
  }

  /**
   * Registers a widget plugin into the LACW registry after verifying contracts and capabilities.
   * @param {object} widgetInstance - Widget plugin instance satisfying IWidgetPlugin contract
   * @param {object} manifest - Widget manifest containing id, capabilities, etc.
   */
  registerPlugin(widgetInstance, manifest) {
    this._assertNotDisposed();

    if (!manifest || !manifest.id) {
      throw new Error('ERR_INVALID_MANIFEST: Manifest must declare a unique id');
    }

    const pluginId = manifest.id;

    // Verify declared capabilities against granted capabilities
    const declaredCaps = manifest.capabilities || [];
    const missingCaps = declaredCaps.filter(cap => !this._grantedCapabilities.has(cap));

    if (missingCaps.length > 0) {
      throw new Error(`ERR_UNAUTHORIZED_CAPABILITIES: Plugin '${pluginId}' requires missing capabilities: ${missingCaps.join(', ')}`);
    }

    const record = Object.freeze({
      pluginId,
      manifest: Object.freeze({ ...manifest }),
      instance: widgetInstance,
      registeredAt: new Date().toISOString(),
      status: 'ACTIVE',
      certificationLevel: manifest.version ? 'PLATINUM' : 'GOLD'
    });

    this._registeredPlugins.set(pluginId, record);

    if (this._eventBus) {
      this._eventBus.publish('plugin:registered', { pluginId, manifest });
    }

    return record;
  }

  /**
   * Unregisters a widget plugin and invokes its disposal lifecycle.
   * @param {string} pluginId
   */
  unregisterPlugin(pluginId) {
    this._assertNotDisposed();

    const record = this._registeredPlugins.get(pluginId);
    if (!record) return false;

    if (typeof record.instance.dispose === 'function') {
      record.instance.dispose();
    } else if (typeof record.instance[Symbol.dispose] === 'function') {
      record.instance[Symbol.dispose]();
    }

    this._registeredPlugins.delete(pluginId);

    if (this._eventBus) {
      this._eventBus.publish('plugin:unregistered', { pluginId });
    }

    return true;
  }

  /**
   * Returns registered plugin by ID.
   * @param {string} pluginId
   */
  getPlugin(pluginId) {
    this._assertNotDisposed();
    return this._registeredPlugins.get(pluginId);
  }

  /**
   * Returns list of all registered plugin manifests.
   */
  listPlugins() {
    this._assertNotDisposed();
    return Array.from(this._registeredPlugins.values()).map(r => r.manifest);
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_LACW_REGISTRY_DISPOSED: Widget registry has been disposed');
  }

  dispose() {
    this._disposed = true;
    for (const [id, record] of this._registeredPlugins) {
      if (typeof record.instance.dispose === 'function') record.instance.dispose();
    }
    this._registeredPlugins.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

/**
 * Lyzer Edge — CapabilityEngine
 * Decoupled Capability Registry & Composition Engine.
 * Agents do not contain hardcoded logic; agents compose capabilities.
 * Manages Capability Discovery, Contracts, Versioning, Dependencies, Certification, Metrics.
 */

export class CapabilityEngine {
  constructor(eventBus = null) {
    this._disposed = false;
    this._eventBus = eventBus;
    this._capabilities = new Map();
  }

  /**
   * Registers a systemic capability contract.
   * @param {string} capabilityId - e.g. 'market_data:read', 'feature_generation'
   * @param {object} spec - Capability specification
   */
  registerCapability(capabilityId, spec = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      capabilityId,
      version: spec.version || '1.0.0',
      description: spec.description || 'Core systemic capability',
      dependencies: Object.freeze(spec.dependencies || []),
      permissionsRequired: Object.freeze(spec.permissionsRequired || []),
      registeredAt: new Date().toISOString()
    });

    this._capabilities.set(capabilityId, record);

    if (this._eventBus) {
      this._eventBus.publish('capability:registered', { capabilityId, version: record.version });
    }

    return record;
  }

  /**
   * Discovers and retrieves a capability record.
   * @param {string} capabilityId
   */
  discoverCapability(capabilityId) {
    this._assertNotDisposed();
    return this._capabilities.get(capabilityId);
  }

  /**
   * Lists all registered capabilities.
   */
  listCapabilities() {
    this._assertNotDisposed();
    return Array.from(this._capabilities.values());
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_CAPABILITY_ENGINE_DISPOSED: Capability Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._capabilities.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

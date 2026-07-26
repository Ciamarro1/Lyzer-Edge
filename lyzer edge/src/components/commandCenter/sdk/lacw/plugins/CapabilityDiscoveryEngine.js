/**
 * Lyzer Edge — CapabilityDiscoveryEngine
 * Dynamic Capability Resolution & Query Engine.
 * Answers "Who can do this?" across all registered plugins, agents, and connectors.
 */

export class CapabilityDiscoveryEngine {
  constructor() {
    this._disposed = false;
    this._providers = new Map(); // capabilityId -> Array of provider records
  }

  /**
   * Registers a provider for a capability.
   * @param {string} capabilityId
   * @param {string} providerId
   * @param {string} providerType - 'PLUGIN' | 'AGENT' | 'CONNECTOR'
   */
  registerProvider(capabilityId, providerId, providerType = 'PLUGIN') {
    this._assertNotDisposed();

    if (!this._providers.has(capabilityId)) {
      this._providers.set(capabilityId, []);
    }

    const list = this._providers.get(capabilityId);
    const record = Object.freeze({ providerId, providerType, registeredAt: Date.now() });
    list.push(record);
    return record;
  }

  /**
   * Resolves available providers for a capability query.
   * @param {string} capabilityId
   */
  discoverCapabilityProviders(capabilityId) {
    this._assertNotDisposed();

    const list = this._providers.get(capabilityId) || [];
    return Object.freeze({
      capabilityId,
      providers: Object.freeze([...list]),
      providerCount: list.length,
      resolvedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_CAPABILITY_DISCOVERY_ENGINE_DISPOSED: Capability Discovery Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._providers.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

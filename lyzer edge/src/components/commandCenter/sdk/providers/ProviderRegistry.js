import { IDataProvider } from './IDataProvider.js';

/**
 * ProviderRegistry
 * Manages instantiated Data Providers and allows switching between realities.
 */
export class ProviderRegistry {
  constructor() {
    this._providers = new Map();
    this._activeProviderId = null;
  }

  /**
   * Registers a new data provider instance.
   * @param {IDataProvider} provider 
   */
  register(provider) {
    if (!(provider instanceof IDataProvider)) {
      throw new Error('[ERR_INVALID_PROVIDER] Provider must extend IDataProvider.');
    }
    if (this._providers.has(provider.id)) {
      throw new Error(`[ERR_PROVIDER_EXISTS] Provider with id '${provider.id}' is already registered.`);
    }
    this._providers.set(provider.id, provider);
  }

  /**
   * Unregisters a provider.
   * @param {string} id 
   */
  unregister(id) {
    this._providers.delete(id);
    if (this._activeProviderId === id) {
      this._activeProviderId = null;
    }
  }

  /**
   * Retrieves a provider by id.
   * @param {string} id 
   * @returns {IDataProvider}
   */
  get(id) {
    return this._providers.get(id) || null;
  }

  /**
   * Sets the currently active provider.
   * @param {string} id 
   */
  setActive(id) {
    if (!this._providers.has(id)) {
      throw new Error(`[ERR_PROVIDER_NOT_FOUND] Cannot set active provider. ID '${id}' not found.`);
    }
    this._activeProviderId = id;
  }

  /**
   * Retrieves the currently active provider.
   * @returns {IDataProvider}
   */
  getActive() {
    if (!this._activeProviderId) return null;
    return this._providers.get(this._activeProviderId);
  }
}

export const providerRegistry = new ProviderRegistry();

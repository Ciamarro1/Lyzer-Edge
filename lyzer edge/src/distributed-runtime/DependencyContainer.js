/**
 * @fileoverview DependencyContainer — Phase 13 (ADR-030)
 *
 * Lightweight Dependency Injection (DI) Container for the Lyzer Edge ecosystem.
 * Enables decoupling, plugin hot-swapping, mock injection for testing, and dynamic resolution.
 */
export class DependencyContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }

  /**
   * Registers a singleton service instance or value.
   *
   * @param {string} name - Service key
   * @param {*} instance - Service instance or object
   */
  register(name, instance) {
    if (!name) throw new Error('Service name is required for registration');
    this.services.set(name, instance);
  }

  /**
   * Registers a factory function for lazy instantiation.
   *
   * @param {string} name
   * @param {Function} factoryFn
   */
  registerFactory(name, factoryFn) {
    if (!name || typeof factoryFn !== 'function') {
      throw new Error('Name and factoryFn function are required');
    }
    this.factories.set(name, factoryFn);
  }

  /**
   * Resolves a registered service or instantiates via factory.
   *
   * @param {string} name - Service key
   * @returns {*} Resolved service instance
   */
  resolve(name) {
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      const instance = factory(this);
      this.services.set(name, instance); // cache as singleton
      return instance;
    }

    throw new Error(`Service or dependency '${name}' not found in container`);
  }

  has(name) {
    return this.services.has(name) || this.factories.has(name);
  }

  reset() {
    this.services.clear();
    this.factories.clear();
  }
}

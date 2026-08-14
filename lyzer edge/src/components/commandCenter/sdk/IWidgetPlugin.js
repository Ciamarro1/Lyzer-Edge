/**
 * Lyzer Edge Command Center V2 — IWidgetPlugin v1.0.0 Interface Contract
 * Frozen contract specification for external and internal widgets.
 */

import { validateManifest } from './types.js';

/**
 * Validates whether a candidate object fulfills the IWidgetPlugin interface and manifest rules.
 * @param {Object} plugin 
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateWidgetPlugin(plugin) {
  const errors = [];
  if (!plugin || typeof plugin !== 'object') {
    return { valid: false, errors: ['Plugin must be a non-null object.'] };
  }

  const manifestValidation = validateManifest(plugin.manifest);
  if (!manifestValidation.valid) {
    errors.push(...manifestValidation.errors);
  }

  if (typeof plugin.mount !== 'function') {
    errors.push("Widget plugin must implement 'mount(container, runtime)'.");
  }

  if (typeof plugin.dispose !== 'function') {
    errors.push("Widget plugin must implement 'dispose()'.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export class IWidgetPlugin {
  constructor(manifest) {
    this.manifest = manifest;
  }

  async mount(container, runtime) {
    throw new Error('mount(container, runtime) must be implemented by subclass.');
  }

  dispose() {
    throw new Error('dispose() must be implemented by subclass.');
  }
}

/**
 * Lyzer Edge Command Center V2 — IWidgetPlugin v1.0.0 Interface Contract
 * Frozen contract specification for external and internal widgets.
 */

import { validateManifest, WidgetError } from './types.js';

export const SDK_CONTRACT_VERSION = '1.0.0';

/**
 * Validates whether an object strictly implements the IWidgetPlugin contract.
 * @param {Object} plugin 
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateWidgetPlugin(plugin) {
  const errors = [];
  if (!plugin || typeof plugin !== 'object') {
    return { valid: false, errors: ['Widget plugin must be a non-null object or instance.'] };
  }

  // 1. Manifest Validation
  const manifestValidation = validateManifest(plugin.manifest);
  if (!manifestValidation.valid) {
    errors.push(...manifestValidation.errors);
  }

  // 2. Lifecycle Method Checks
  if (typeof plugin.mount !== 'function') {
    errors.push("Plugin must implement 'mount(container, runtime)' method.");
  }

  if (typeof plugin.dispose !== 'function' && typeof plugin.unmount !== 'function') {
    errors.push("Plugin must implement 'dispose()' or 'unmount()' method.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

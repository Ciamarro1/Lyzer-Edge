/**
 * Lyzer Edge - WidgetHost
 * A strict boundary container that only mounts and unmounts widgets via WidgetLoader.
 * It contains NO domain logic.
 */

import { WidgetLoader } from '../sdk/WidgetLoader.js';

export class WidgetHost {
  constructor(registry, runtimeOptions = {}) {
    this._registry = registry;
    this._loader = new WidgetLoader(registry);
    this._runtimeOptions = runtimeOptions;
    this._activeInstances = new Map();
  }

  /**
   * Mounts a widget into the target container DOM element.
   * @param {string} widgetId 
   * @param {HTMLElement} container 
   * @returns {Object} Lifecycle handle { dispose(), widgetId, mountedAt }
   */
  async mount(widgetId, container) {
    if (!container) throw new Error('[WidgetHost] Container DOM element required.');

    // Enforce isolation by ensuring container is empty
    container.innerHTML = '';

    // Load and mount via SDK
    const mountedInstance = await this._loader.loadAndMount(
      widgetId,
      container,
      null, // pluginOrPath
      this._runtimeOptions
    );

    const handleId = `${widgetId}_${Date.now()}`;
    
    const handle = {
      widgetId,
      instanceId: mountedInstance.runtime.instanceId,
      mountedAt: Date.now(),
      dispose: () => {
        if (mountedInstance.plugin.dispose) {
          mountedInstance.plugin.dispose();
        } else if (mountedInstance.plugin.unmount) {
          mountedInstance.plugin.unmount();
        }
        mountedInstance.runtime.dispose();
        container.innerHTML = ''; // Cleanup DOM
        this._activeInstances.delete(handleId);
      }
    };

    this._activeInstances.set(handleId, handle);
    return handle;
  }
}

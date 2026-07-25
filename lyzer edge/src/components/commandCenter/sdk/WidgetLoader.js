/**
 * Lyzer Edge Command Center V2 — WidgetLoader
 *
 * Orchestrates dynamic loading, sandboxed mounting into DOM pane containers,
 * lifecycle state transitions, and leak-proof unmounting with WidgetErrorBoundary isolation.
 */

import { widgetRegistry } from './WidgetRegistry.js';
import { CommandCenterRuntime } from './CommandCenterRuntime.js';
import { WidgetErrorBoundary } from './WidgetErrorBoundary.js';
import { WidgetError, isWidgetPlugin } from './types.js';

const ALLOWED_PATH_PREFIXES = ['./', '../', '@/'];

export class WidgetLoader {
  /**
   * Instantiates a WidgetLoader.
   * @param {Object} [registry] - WidgetRegistry instance
   */
  constructor(registry = widgetRegistry) {
    this._registry = registry;
    this._activeMounts = new Map(); // instanceId -> { instanceId, widgetId, plugin, runtime, errorBoundary, container }
  }

  get activeCount() {
    return this._activeMounts.size;
  }

  /**
   * Validates dynamic import module path scheme.
   * @param {string} path
   * @returns {boolean}
   */
  validateModulePath(path) {
    if (typeof path !== 'string') return false;
    return ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  }

  /**
   * Loads and mounts a registered widget into a DOM container.
   * @param {string} widgetId - ID of registered widget
   * @param {HTMLElement} container - DOM pane container
   * @param {Object|string} [pluginOrPath] - Optional pre-loaded plugin object or ESM path
   * @returns {Promise<Object>} Active mount record
   */
  async loadAndMount(widgetId, container, pluginOrPath = null) {
    if (!container) {
      throw new WidgetError('ERR_INVALID_CONTAINER', `Container element is required to mount widget '${widgetId}'.`);
    }

    const manifest = this._registry.get(widgetId);
    if (!manifest) {
      throw new WidgetError('ERR_WIDGET_NOT_REGISTERED', `Widget '${widgetId}' is not registered in WidgetRegistry.`);
    }

    const instanceId = `${widgetId}_inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const runtime = new CommandCenterRuntime(manifest, instanceId);
    const errorBoundary = new WidgetErrorBoundary(container, widgetId, instanceId);

    let plugin = null;

    try {
      // Load plugin object
      await errorBoundary.executeAsync(async () => {
        if (pluginOrPath && typeof pluginOrPath === 'object') {
          plugin = pluginOrPath;
        } else if (typeof pluginOrPath === 'string') {
          if (!this.validateModulePath(pluginOrPath)) {
            throw new WidgetError('ERR_CAPABILITY_DENIED', `Unauthorized module path '${pluginOrPath}'.`);
          }
          const module = await import(/* @vite-ignore */ pluginOrPath);
          plugin = module.default || module.plugin || module;
        } else if (typeof manifest.modulePath === 'string') {
          if (!this.validateModulePath(manifest.modulePath)) {
            throw new WidgetError('ERR_CAPABILITY_DENIED', `Unauthorized module path '${manifest.modulePath}'.`);
          }
          const module = await import(/* @vite-ignore */ manifest.modulePath);
          plugin = module.default || module.plugin || module;
        } else {
          throw new WidgetError('ERR_PLUGIN_NOT_PROVIDED', `Plugin object or module path must be provided for '${widgetId}'.`);
        }
      }, 'loading');

      if (!plugin || !isWidgetPlugin(plugin)) {
        if (!errorBoundary.isCrashed) {
          errorBoundary.handleError(
            new WidgetError('ERR_INVALID_PLUGIN', `Loaded plugin for '${widgetId}' does not conform to IWidgetPlugin contract.`),
            'loading'
          );
        }
        runtime.dispose();
        return null;
      }

      const mountRecord = {
        instanceId,
        widgetId,
        manifest,
        plugin,
        runtime,
        errorBoundary,
        container
      };

      // Register recovery reload hook
      errorBoundary.onReload(async () => {
        await this.unmount(instanceId);
        await this.loadAndMount(widgetId, container, plugin);
      });

      // Execute mount hook (supports object context or positional args)
      await errorBoundary.executeAsync(async () => {
        const context = Object.freeze({
          container,
          instanceId,
          manifest,
          runtime,
          theme: 'dark',
          locale: 'en-US',
          paneId: manifest.targetPane
        });
        await plugin.mount(context, runtime);
      }, 'mounting');

      if (errorBoundary.isCrashed) {
        runtime.dispose();
        return null;
      }

      this._activeMounts.set(instanceId, mountRecord);
      return mountRecord;

    } catch (err) {
      runtime.dispose();
      if (!errorBoundary.isCrashed) {
        errorBoundary.handleError(err, 'loading');
      }
      return null;
    }
  }

  /**
   * Unmounts an active widget instance and disposes all associated resources.
   * @param {string} instanceId
   * @returns {Promise<boolean>} true if successfully unmounted
   */
  async unmount(instanceId) {
    const mountRecord = this._activeMounts.get(instanceId);
    if (!mountRecord) {
      return false;
    }

    const { plugin, runtime, errorBoundary, container } = mountRecord;

    try {
      if (plugin && typeof plugin.unmount === 'function') {
        await errorBoundary.executeAsync(async () => {
          await plugin.unmount();
        }, 'unmounting');
      }
    } finally {
      if (runtime) {
        runtime.dispose();
      }
      if (container && container.innerHTML !== undefined) {
        container.innerHTML = '';
      }
      this._activeMounts.delete(instanceId);
    }

    return true;
  }

  /**
   * Checks if an instance ID is currently active.
   * @param {string} instanceId
   * @returns {boolean}
   */
  hasActive(instanceId) {
    return this._activeMounts.has(instanceId);
  }

  /**
   * Retrieves an active mount record by instance ID.
   * @param {string} instanceId
   * @returns {Object|undefined}
   */
  getMount(instanceId) {
    return this._activeMounts.get(instanceId);
  }

  /**
   * Returns all active mount records.
   * @returns {Object[]}
   */
  getAllActive() {
    return Array.from(this._activeMounts.values());
  }

  /**
   * Unmounts all active widget instances safely in parallel.
   */
  async unmountAll() {
    const instanceIds = Array.from(this._activeMounts.keys());
    await Promise.allSettled(instanceIds.map(id => this.unmount(id)));
  }
}

export const widgetLoader = new WidgetLoader();

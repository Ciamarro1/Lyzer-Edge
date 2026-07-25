/**
 * Lyzer Edge - CommandCenterApp
 * Root composition shell for V2.
 * Pure composition, no domain logic.
 */

import { LayoutEngine } from './LayoutEngine.js';
import { WidgetHost } from './WidgetHost.js';
import { PaneManager } from './PaneManager.js';

export class CommandCenterApp {
  constructor(rootElement, registry, orchestrator) {
    if (!rootElement) throw new Error('[CommandCenterApp] Root DOM element required.');
    
    this._root = rootElement;
    this._registry = registry;
    this._orchestrator = orchestrator;
    
    this._layout = new LayoutEngine(this._root);
    
    // Pass the orchestrator to runtime options so it's injected into CommandCenterRuntime
    const runtimeOptions = { orchestrator: this._orchestrator };
    this._host = new WidgetHost(registry, runtimeOptions);
    this._paneManager = new PaneManager(this._layout, this._host);
  }

  async mount(layoutConfig, widgetMap = {}) {
    this._root.innerHTML = '';
    
    // 1. Initialize Layout
    this._layout.load(layoutConfig);
    
    // 2. Start observers
    this._paneManager.startObserving();
    
    // 3. Mount predefined widgets to their panes
    const mountPromises = [];
    for (const [paneId, widgetIds] of Object.entries(widgetMap)) {
      for (const widgetId of widgetIds) {
        mountPromises.push(this._paneManager.mountWidgetToPane(widgetId, paneId));
      }
    }
    
    await Promise.all(mountPromises);
    return true;
  }

  dispose() {
    this._paneManager.disposeAll();
    this._root.innerHTML = '';
  }
}

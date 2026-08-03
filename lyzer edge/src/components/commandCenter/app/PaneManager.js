/**
 * Lyzer Edge - PaneManager
 * Manages boundaries of a layout pane and handles ResizeObserver.
 */

export class PaneManager {
  constructor(layoutEngine, widgetHost) {
    this._layout = layoutEngine;
    this._host = widgetHost;
    this._resizeObserver = null;
    this._paneWidgets = new Map(); // paneId -> Set of widget handles
  }

  /**
   * Mounts a widget directly into a specified pane ID.
   * @param {string} widgetId 
   * @param {string} paneId 
   */
  async mountWidgetToPane(widgetId, paneId) {
    const paneEl = this._layout.getPaneElement(paneId);
    if (!paneEl) {
      throw new Error(`[PaneManager] Pane ${paneId} not found in current layout.`);
    }

    // Ensure the pane handles multiple widgets via Flexbox column stacking
    paneEl.style.display = 'flex';
    paneEl.style.flexDirection = 'column';

    const container = document.createElement('div');
    container.className = 'widget-container';
    container.style.width = '100%';
    container.style.flex = '1';
    container.style.minHeight = '0';
    container.style.overflow = 'hidden';
    paneEl.appendChild(container);

    const handle = await this._host.mount(widgetId, container);
    
    if (!this._paneWidgets.has(paneId)) {
      this._paneWidgets.set(paneId, new Set());
    }
    this._paneWidgets.get(paneId).add(handle);

    return handle;
  }

  startObserving() {
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        // Dispatch synthetic resize events or resize hooks to widgets if needed
      });
      
      // Observe all current panes
      for (const paneId of this._paneWidgets.keys()) {
        const el = this._layout.getPaneElement(paneId);
        if (el) this._resizeObserver.observe(el);
      }
    }
  }

  stopObserving() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  disposeAll() {
    this.stopObserving();
    for (const [paneId, handles] of this._paneWidgets.entries()) {
      for (const handle of handles) {
        handle.dispose();
      }
    }
    this._paneWidgets.clear();
  }
}

/**
 * Lyzer Edge - LayoutEngine
 * Abstract layout parser and grid manager.
 */

export class LayoutEngine {
  constructor(rootContainer) {
    if (!rootContainer) throw new Error('[LayoutEngine] Root container required.');
    this._root = rootContainer;
    this._panes = new Map();
  }

  /**
   * Applies a layout configuration to the root container.
   * @param {Object} config - e.g. { type: 'institutional', panes: { LeftPane: '20%', CenterPane: '60%', RightPane: '20%' } }
   */
  load(config) {
    this._root.innerHTML = ''; // Clear previous layout
    this._panes.clear();

    // Basic Flexbox implementation for V1
    this._root.style.display = 'flex';
    this._root.style.width = '100%';
    this._root.style.height = '100%';
    this._root.style.boxSizing = 'border-box';
    
    if (!config || !config.panes) return;

    for (const [paneId, width] of Object.entries(config.panes)) {
      const paneEl = document.createElement('div');
      paneEl.id = paneId;
      paneEl.style.flex = `0 0 ${width}`;
      paneEl.style.height = '100%';
      paneEl.style.position = 'relative';
      paneEl.style.borderRight = paneId === 'RightPane' ? 'none' : '1px solid var(--border-color, #333)';
      
      this._root.appendChild(paneEl);
      this._panes.set(paneId, paneEl);
    }
  }

  getPaneElement(paneId) {
    return this._panes.get(paneId) || null;
  }
}

/**
 * Lyzer Edge — CognitiveGridEngine
 * Multi-Resolution Adaptive Grid System.
 * Supports: UltraWide, Desktop, Laptop, Tablet, Foldables, Mobile, Wall Displays, Ops Center.
 */

export const RESOLUTION_MODES = Object.freeze([
  'MOBILE',
  'TABLET',
  'LAPTOP',
  'DESKTOP',
  'ULTRAWIDE',
  'WALL_DISPLAY',
  'OPS_CENTER'
]);

export class CognitiveGridEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Resolves grid parameters based on viewport width in pixels.
   * @param {number} viewportWidthPx
   */
  resolveGrid(viewportWidthPx) {
    this._assertNotDisposed();

    let mode = 'DESKTOP';
    let columns = 12;
    let gutterPx = 12;
    let marginPx = 16;
    let isSidePanelCollapsible = false;

    if (viewportWidthPx < 640) {
      mode = 'MOBILE';
      columns = 4;
      gutterPx = 8;
      marginPx = 8;
      isSidePanelCollapsible = true;
    } else if (viewportWidthPx < 1024) {
      mode = 'TABLET';
      columns = 8;
      gutterPx = 10;
      marginPx = 12;
      isSidePanelCollapsible = true;
    } else if (viewportWidthPx < 1440) {
      mode = 'LAPTOP';
      columns = 12;
      gutterPx = 12;
      marginPx = 16;
    } else if (viewportWidthPx < 2560) {
      mode = 'DESKTOP';
      columns = 16;
      gutterPx = 16;
      marginPx = 24;
    } else if (viewportWidthPx < 3840) {
      mode = 'ULTRAWIDE';
      columns = 24;
      gutterPx = 20;
      marginPx = 32;
    } else {
      mode = 'WALL_DISPLAY';
      columns = 32;
      gutterPx = 24;
      marginPx = 48;
    }

    return Object.freeze({
      viewportWidthPx,
      mode,
      columns,
      gutterPx,
      marginPx,
      isSidePanelCollapsible,
      resolvedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_GRID_ENGINE_DISPOSED: Cognitive Grid Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

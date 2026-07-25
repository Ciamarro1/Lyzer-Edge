/**
 * Lyzer Edge Command Center V2 — ChartViewport
 * Encapsulates container viewport dimensions, auto-resize behavior, and range tracking.
 */

export class ChartViewport {
  constructor(container, onResize = null) {
    this._container = container;
    this._onResize = onResize;
    this._resizeObserver = null;
    this._width = container?.clientWidth || 800;
    this._height = container?.clientHeight || 400;

    this._initObserver();
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  _initObserver() {
    if (typeof ResizeObserver !== 'undefined' && this._container) {
      this._resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;
            if (typeof this._onResize === 'function') {
              this._onResize(width, height);
            }
          }
        }
      });
      this._resizeObserver.observe(this._container);
    }
  }

  dispose() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    this._container = null;
    this._onResize = null;
  }
}

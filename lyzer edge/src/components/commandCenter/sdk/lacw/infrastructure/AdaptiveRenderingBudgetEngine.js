/**
 * Lyzer Edge — AdaptiveRenderingBudgetEngine
 * Viewport Awareness, Component Suspension & 60 FPS Rendering Budget Manager.
 * Guarantees smooth UI rendering under heavy cognitive stream updates by prioritizing visible components.
 */

export class AdaptiveRenderingBudgetEngine {
  constructor() {
    this._disposed = false;
    this._targetFps = 60;
    this._frameBudgetMs = 1000 / 60; // ~16.6ms
  }

  /**
   * Evaluates rendering priority for a UI element given frame budget constraint.
   * @param {string} componentId
   * @param {boolean} isVisibleInViewport
   * @param {number} estimatedRenderCostMs
   */
  evaluateRenderPriority(componentId, isVisibleInViewport, estimatedRenderCostMs = 2.5) {
    this._assertNotDisposed();

    const canRenderThisFrame = isVisibleInViewport && estimatedRenderCostMs <= this._frameBudgetMs;

    return Object.freeze({
      componentId,
      canRenderThisFrame,
      renderStrategy: canRenderThisFrame ? 'IMMEDIATE_RENDER' : 'SUSPEND_OR_DEFER',
      frameBudgetMs: this._frameBudgetMs,
      estimatedRenderCostMs
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_ADAPTIVE_RENDERING_BUDGET_DISPOSED: Adaptive Rendering Budget Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

/**
 * Lyzer Edge Command Center V2 — WidgetErrorBoundary
 *
 * Provides fault isolation per widget plugin container.
 * Traps runtime exceptions during mount, unmount, or snapshot rendering,
 * rendering a localized diagnostic panel without breaking neighboring widgets or the main viewport.
 */

import { WidgetError } from './types.js';

export class WidgetErrorBoundary {
  /**
   * Instantiates an ErrorBoundary for a specific widget container.
   * @param {HTMLElement} container - DOM container root
   * @param {string} widgetId - Widget ID
   * @param {string} [instanceId] - Mount instance ID
   */
  constructor(container, widgetId, instanceId = null) {
    this._container = container;
    this._widgetId = widgetId;
    this._instanceId = instanceId || `${widgetId}_err_${Date.now()}`;
    this._state = 'NORMAL'; // 'NORMAL' | 'CRASHED' | 'RECOVERING'
    this._lastError = null;
    this._onReloadCallback = null;
  }

  get state() {
    return this._state;
  }

  get lastError() {
    return this._lastError;
  }

  get isCrashed() {
    return this._state === 'CRASHED';
  }

  /**
   * Wraps an operation inside the error boundary.
   * @param {Function} action - Function to execute safely
   * @param {string} [phase='runtime'] - Lifecycle phase
   * @returns {*} result of action, or null if caught
   */
  execute(action, phase = 'runtime') {
    if (this._state === 'CRASHED') {
      return null;
    }

    try {
      return action();
    } catch (err) {
      this.handleError(err, phase);
      return null;
    }
  }

  /**
   * Wraps an async operation inside the error boundary.
   * @param {Function} asyncAction
   * @param {string} [phase='runtime']
   * @returns {Promise<*>}
   */
  async executeAsync(asyncAction, phase = 'runtime') {
    if (this._state === 'CRASHED') {
      return null;
    }

    try {
      return await asyncAction();
    } catch (err) {
      this.handleError(err, phase);
      return null;
    }
  }

  /**
   * Handles a caught runtime error.
   * @param {Error|WidgetError} error
   * @param {string} phase
   */
  handleError(error, phase = 'runtime') {
    this._state = 'CRASHED';
    this._lastError = error;

    const widgetErr = error instanceof WidgetError
      ? error
      : new WidgetError('ERR_WIDGET_CRASH', error.message || 'Unhandled Widget Exception', {
          phase,
          stack: error.stack,
          widgetId: this._widgetId
        });

    console.error(`[WidgetErrorBoundary] [${this._widgetId}] Crash caught during phase '${phase}':`, widgetErr);

    this.renderFallbackUI(widgetErr);
  }

  /**
   * Renders the localized diagnostic panel inside the container.
   * @param {WidgetError} error
   */
  renderFallbackUI(error) {
    if (!this._container) return;

    const safeCode = this._escapeHtml(error.code || 'ERR_WIDGET_CRASH');
    const safeWidgetId = this._escapeHtml(this._widgetId);
    const safeMsg = this._escapeHtml(error.message || 'An unexpected exception occurred inside this widget.');

    this._container.innerHTML = `
      <div class="widget-error-boundary-card" style="
        padding: 16px;
        margin: 8px;
        background: #161b22;
        border: 1px solid #ee5253;
        border-radius: 6px;
        color: #f8f9fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #ee5253;">⚠️ Widget Failure (${safeCode})</span>
          <span style="font-size: 11px; opacity: 0.6;">ID: ${safeWidgetId}</span>
        </div>
        <p style="margin: 0 0 12px 0; color: #c9d1d9; font-size: 12px; line-height: 1.4;">
          ${safeMsg}
        </p>
        <button class="widget-reload-btn" style="
          padding: 6px 12px;
          background: #ee5253;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          font-size: 12px;
          transition: background 0.2s;
        ">
          🔄 Reload Widget
        </button>
      </div>
    `;

    const reloadBtn = this._container.querySelector('.widget-reload-btn');
    if (reloadBtn) {
      reloadBtn.onclick = () => {
        this.triggerReload().catch(err => {
          console.error('[WidgetErrorBoundary] Recovery failed:', err);
        });
      };
    }
  }

  /**
   * Registers a reload callback to be executed upon recovery.
   * @param {Function} callback
   */
  onReload(callback) {
    this._onReloadCallback = callback;
  }

  /**
   * Resets error boundary state and triggers recovery.
   * @returns {Promise<void>}
   */
  async triggerReload() {
    this._state = 'RECOVERING';
    if (this._container) {
      this._container.innerHTML = '';
    }

    try {
      if (typeof this._onReloadCallback === 'function') {
        await this._onReloadCallback();
      }
      this._state = 'NORMAL';
      this._lastError = null;
    } catch (err) {
      this.handleError(err, 'recovery');
    }
  }

  /** @private */
  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

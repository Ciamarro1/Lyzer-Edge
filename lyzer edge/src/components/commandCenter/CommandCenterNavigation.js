/**
 * Lyzer Edge Command Center v2 — Navigation Component
 *
 * Renders the 8-module horizontal tab bar.
 * Purely presentational — no data logic, no direct L15 imports.
 * Emits navigation events via callback.
 */

const MODULES = [
  { key: 'overview',   label: 'EXECUTIVE OVERVIEW' },
  { key: 'reality',    label: 'REALITY OBSERVATORY' },
  { key: 'alpha',      label: 'ALPHA INTEGRITY' },
  { key: 'shadow',     label: 'SHADOW EXECUTION' },
  { key: 'endurance',  label: 'OPERATIONAL SURVIVAL' },
  { key: 'blackswan',  label: 'BLACK SWAN DEFENSE' },
  { key: 'forensics',  label: 'DATA LINEAGE' },
  { key: 'oversight',  label: 'HUMAN OVERSIGHT' }
];

export class CommandCenterNavigation {
  /**
   * @param {Object} options
   * @param {Function} options.onNavigate - Called with (moduleKey) when a tab is clicked
   * @param {string}   [options.activeModule='overview'] - Initially active module key
   */
  constructor(options = {}) {
    this._onNavigate = options.onNavigate || (() => {});
    this._activeModule = options.activeModule || 'overview';
    this._container = null;
    this._clickHandler = null;
  }

  /**
   * Returns the list of module definitions (read-only).
   * @returns {Array<{key: string, label: string}>}
   */
  static getModules() {
    return [...MODULES];
  }

  /**
   * @param {HTMLElement} container
   */
  mount(container) {
    this._container = container;
    this._render();
    this._bindEvents();
  }

  unmount() {
    if (this._container && this._clickHandler) {
      this._container.removeEventListener('click', this._clickHandler);
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }

  /**
   * Update the active tab highlight.
   * @param {string} moduleKey
   */
  setActive(moduleKey) {
    this._activeModule = moduleKey;
    if (this._container) {
      this._container.querySelectorAll('.cc-nav-item').forEach(el => {
        el.classList.toggle('cc-nav-active', el.dataset.module === moduleKey);
      });
    }
  }

  /** @private */
  _render() {
    if (!this._container) return;

    const tabsHtml = MODULES.map(m => {
      const isActive = m.key === this._activeModule;
      return `<button class="cc-nav-item${isActive ? ' cc-nav-active' : ''}" data-module="${m.key}" type="button">${m.label}</button>`;
    }).join('');

    this._container.innerHTML = `<nav class="cc-navigation" role="tablist">${tabsHtml}</nav>`;
  }

  /** @private */
  _bindEvents() {
    if (!this._container) return;

    this._clickHandler = (e) => {
      const btn = e.target.closest('.cc-nav-item');
      if (!btn) return;
      const moduleKey = btn.dataset.module;
      if (moduleKey && moduleKey !== this._activeModule) {
        this.setActive(moduleKey);
        this._onNavigate(moduleKey);
      }
    };

    this._container.addEventListener('click', this._clickHandler);
  }
}

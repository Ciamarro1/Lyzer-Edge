/**
 * @fileoverview Hash-based SPA router with parameter support and navigation guards.
 *
 * Usage:
 *   const router = new Router(routes, { container: '#app' });
 *   router.navigate('/trades');
 *   router.getCurrentRoute();
 */

import { eventBus } from './lib/eventBus.js';

/**
 * @typedef {Object} RouteDefinition
 * @property {string}   path       - Route pattern, e.g. '/trades/:id'
 * @property {Function} component  - Factory returning a view instance with mount(el)/unmount()
 * @property {string}   [title]    - Document title suffix
 */

export class Router {
  /**
   * @param {RouteDefinition[]} routes
   * @param {Object} [options]
   * @param {string} [options.container='#app-view'] - CSS selector for the render target
   * @param {Function} [options.guard] - async (to, from) => boolean
   */
  constructor(routes, options = {}) {
    /** @type {RouteDefinition[]} */
    this._routes = routes.map((r) => ({
      ...r,
      _regex: this._pathToRegex(r.path),
      _paramNames: this._extractParamNames(r.path),
    }));

    this._container = options.container ?? '#app-view';
    this._guard = options.guard ?? null;

    /** @type {{ route: RouteDefinition|null, params: Record<string,string>, path: string }} */
    this._current = { route: null, params: {}, path: '' };
    this._activeView = null;

    this._onHashChange = this._onHashChange.bind(this);
    window.addEventListener('hashchange', this._onHashChange);

    // Listen for programmatic navigate events from the event bus
    eventBus.on('navigate', (path) => this.navigate(path));
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Navigate to a path.  Sets window.location.hash which triggers routing.
   * @param {string} path - e.g. '/trades/5'
   */
  navigate(path) {
    const hash = `#${path.startsWith('/') ? path : '/' + path}`;
    if (window.location.hash === hash) {
      // Force re-render even if hash unchanged
      this._resolve(path);
    } else {
      window.location.hash = hash;
    }
  }

  /**
   * @returns {{ route: RouteDefinition|null, params: Record<string,string>, path: string }}
   */
  getCurrentRoute() {
    return { ...this._current };
  }

  /** Perform initial route resolution (call once after app mounts). */
  start() {
    const hash = window.location.hash || '#/';
    const path = hash.replace(/^#/, '') || '/';
    this._resolve(path);
  }

  /** Clean up event listeners. */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  /** @private */
  _onHashChange() {
    const path = window.location.hash.replace(/^#/, '') || '/';
    this._resolve(path);
  }

  /** @private */
  async _resolve(path) {
    const match = this._match(path);

    // Navigation guard
    if (this._guard) {
      const allowed = await this._guard(match, this._current);
      if (!allowed) return;
    }

    // Unmount current view
    if (this._activeView?.unmount) {
      try {
        this._activeView.unmount();
      } catch (e) {
        console.error('[Router] Error unmounting view:', e);
      }
    }

    this._current = {
      route: match.route,
      params: match.params,
      path,
    };

    // Update document title
    const titleSuffix = match.route?.title ?? 'Lyzer Edge';
    document.title = `${titleSuffix} — Lyzer Edge Analyst`;

    // Mount new view
    const container = document.querySelector(this._container);
    if (!container) {
      console.error(`[Router] Container "${this._container}" not found`);
      return;
    }

    container.innerHTML = '';

    if (match.route?.component) {
      try {
        this._activeView = match.route.component(match.params);
        if (this._activeView?.mount) {
          this._activeView.mount(container);
        }
      } catch (e) {
        console.error('[Router] Error mounting view:', e);
        container.innerHTML = `
          <div class="empty-state">
            <h3>Something went wrong</h3>
            <p class="text-muted">Unable to load this page.</p>
          </div>`;
      }
    } else {
      // 404
      container.innerHTML = `
        <div class="empty-state">
          <h3>Page Not Found</h3>
          <p class="text-muted">The page "${path}" does not exist.</p>
          <a href="#/" class="btn btn-secondary" style="margin-top:var(--space-4)">Back to Dashboard</a>
        </div>`;
    }

    // Update active nav state
    this._updateActiveNav(path);
  }

  /**
   * Match a path against registered routes.
   * @private
   * @param {string} path
   * @returns {{ route: RouteDefinition|null, params: Record<string,string> }}
   */
  _match(path) {
    for (const route of this._routes) {
      const match = path.match(route._regex);
      if (match) {
        const params = {};
        route._paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });
        return { route, params };
      }
    }
    return { route: null, params: {} };
  }

  /**
   * Convert a path pattern to a RegExp.
   * @private
   * @param {string} path
   * @returns {RegExp}
   */
  _pathToRegex(path) {
    const pattern = path
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars first
      .replace(/\\:([a-zA-Z_]+)/g, '([^/]+)'); // then replace :param
    return new RegExp(`^${pattern}$`);
  }

  /**
   * @private
   * @param {string} path
   * @returns {string[]}
   */
  _extractParamNames(path) {
    const names = [];
    const regex = /:([a-zA-Z_]+)/g;
    let m;
    while ((m = regex.exec(path)) !== null) {
      names.push(m[1]);
    }
    return names;
  }

  /**
   * @private
   * @param {string} currentPath
   */
  _updateActiveNav(currentPath) {
    document.querySelectorAll('.nav-item').forEach((el) => {
      const href = el.getAttribute('href')?.replace(/^#/, '') ?? '';
      // Exact match or prefix match for nested routes
      const isActive =
        currentPath === href ||
        (href !== '/' && currentPath.startsWith(href + '/'));
      el.classList.toggle('active', isActive);
    });
  }
}

export default Router;
 
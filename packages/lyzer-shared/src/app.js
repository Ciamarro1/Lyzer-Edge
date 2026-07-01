/**
 * @fileoverview Main application controller — builds the layout, sidebar,
 * and initialises the router.
 */

import { Router } from './router.js';
import { eventBus } from './lib/eventBus.js';
import { Dashboard } from './components/Dashboard.js';
import { Settings } from './components/Settings.js';
import { TradeLog } from './components/TradeLog.js';
import { TradeForm } from './components/TradeForm.js';
import { TradeDetail } from './components/TradeDetail.js';
import { MonteCarloView } from './components/MonteCarloView.js';
import { EdgeExplorerView } from './components/EdgeExplorerView.js';
import { BehaviorView } from './components/BehaviorView.js';
import { ReplayView } from './components/ReplayView.js';
import { EvolutionView } from './components/EvolutionView.js';
import { Recommendations } from './components/Recommendations.js';
import { PolicyEditor } from './components/PolicyEditor.js';
import { SystemHealthView } from './components/SystemHealthView.js';
import { DecisionStream } from './components/DecisionStream.js';
import { DecisionAnalytics } from './components/DecisionAnalytics.js';
import { ZSpaceDashboard } from './components/ZSpaceDashboard.js';
import { wsClient } from './services/wsClient.js';
import { activeConfig } from './db/activeConfig.js';

// ── SVG Icons (inline, 18×18) ────────────────────────────────────────────────

const ICONS = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>`,

  list: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,

  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,

  dice: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>`,

  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,

  grid: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,

  brain: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.7V20h8v-5.3c1.8-1.2 3-3.3 3-5.7a7 7 0 0 0-7-7z"/><path d="M9 22h6"/><path d="M10 2v2"/><path d="M14 2v2"/></svg>`,

  gear: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/></svg>`,

  reports: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,

  alerts: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,

  replay: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,

  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,

  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
};

// ── Logo SVG ─────────────────────────────────────────────────────────────────

const LOGO_SVG = `<svg class="sidebar-logo-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="var(--color-accent)"/>
  <path d="M8 22 L14 10 L18 16 L24 8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24" cy="8" r="2" fill="#fff"/>
</svg>`;

// ── Navigation Definition ────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Edge Dashboard', icon: 'dashboard', path: '#/',            badge: null },
  { label: 'Trade Log',      icon: 'list',      path: '#/trades',      badge: null },
  { label: 'New Trade',      icon: 'plus',      path: '#/trades/new',  badge: null },
  { label: 'Analytics',      icon: 'chart',     path: '#/analytics',   badge: null },
  { label: 'Recommendations',icon: 'reports',   path: '#/recommendations', badge: null },
  { label: 'Evolution',      icon: 'activity',  path: '#/evolution',   badge: null },
  { label: 'System Health',  icon: 'activity',  path: '#/system-health',badge: null },
  'divider',
  { label: 'Monte Carlo',    icon: 'dice',      path: '#/montecarlo',  badge: null },
  { label: 'Risk Analysis',  icon: 'shield',    path: '#/risk',        badge: 'Soon' },
  { label: 'Patterns',       icon: 'grid',      path: '#/patterns',    badge: 'Soon' },
  { label: 'Behavior',       icon: 'brain',     path: '#/behavior',    badge: null },
  { label: 'Replay',         icon: 'replay',    path: '#/replay',      badge: null },
  { label: 'Decision Stream',icon: 'replay',    path: '#/decision-stream',badge: null },
  { label: 'Decision Analytics', icon: 'reports', path: '#/decision-analytics', badge: null },
  { label: 'Z-Space Live',   icon: 'brain',     path: '#/z-space-live', badge: 'Live' },
  'divider',
  { label: 'Reports',        icon: 'reports',   path: '#/reports',     badge: 'Soon' },
  { label: 'Alerts',         icon: 'alerts',    path: '#/alerts',      badge: 'Soon' },
  { label: 'Policy Editor',  icon: 'brain',     path: '#/policy-editor',badge: null },
  'divider',
  { label: 'Settings',       icon: 'gear',      path: '#/settings',    badge: null },
];


// ── Placeholder Views ────────────────────────────────────────────────────────

function placeholderView(title, subtitle = '') {
  return () => ({
    mount(container) {
      container.innerHTML = `
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">${title}</h1>
            ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ''}
          </div>
          <div class="card">
            <div class="empty-state">
              <h3>Under Construction</h3>
              <p class="text-muted">This view will be implemented in a future sprint.</p>
            </div>
          </div>
        </div>`;
    },
    unmount() {},
  });
}

function comingSoonView(title) {
  return () => ({
    mount(container) {
      container.innerHTML = `
        <div class="page-container">
          <div class="coming-soon">
            <div class="icon">🚧</div>
            <h2>${title}</h2>
            <p class="text-muted">This feature is planned for a future release.</p>
            <a href="#/" class="btn btn-secondary">Back to Dashboard</a>
          </div>
        </div>`;
    },
    unmount() {},
  });
}

// ── Route Definitions ────────────────────────────────────────────────────────

const ROUTES = [
  { path: '/',             component: () => new Dashboard(), title: 'Dashboard' },
  { path: '/trades',       component: () => new TradeLog(),                                                      title: 'Trade Log' },
  { path: '/trades/new',   component: () => new TradeForm(),                                                     title: 'New Trade' },
  { path: '/trades/:id',   component: (params) => new TradeDetail(params),                                       title: 'Trade Detail' },
  { path: '/analytics',    component: () => new EdgeExplorerView(),                                              title: 'Analytics' },
  { path: '/recommendations', component: () => new Recommendations(),                                            title: 'Recommendations' },
  { path: '/evolution',    component: () => new EvolutionView(),                                                 title: 'Evolution' },
  { path: '/system-health',component: () => new SystemHealthView(),                                              title: 'System Health' },
  { path: '/settings',     component: () => new Settings(), title: 'Settings' },
  // Beta / 1.0
  { path: '/montecarlo',   component: () => new MonteCarloView(),                title: 'Monte Carlo' },
  { path: '/risk',         component: comingSoonView('Risk Analysis'),           title: 'Risk Analysis' },
  { path: '/patterns',     component: comingSoonView('Pattern Recognition'),     title: 'Patterns' },
  { path: '/behavior',     component: () => new BehaviorView(),                  title: 'Behavior' },
  { path: '/replay',       component: () => new ReplayView(),                    title: 'Replay' },
  { path: '/decision-stream', component: () => new DecisionStream({ config: activeConfig }), title: 'Decision Stream' },
  { path: '/decision-analytics', component: () => new DecisionAnalytics(),        title: 'Decision Analytics' },
  { path: '/z-space-live', component: () => new ZSpaceDashboard(), title: 'Z-Space Live' },
  { path: '/reports',      component: comingSoonView('Reports'),                 title: 'Reports' },
  { path: '/alerts',       component: comingSoonView('Alerts'),                  title: 'Alerts' },
  { path: '/policy-editor',component: () => new PolicyEditor(),                  title: 'Policy Editor' },
];

// ── App Class ────────────────────────────────────────────────────────────────

export class App {
  constructor() {
    /** @type {Router|null} */
    this.router = null;
    /** @type {HTMLElement|null} */
    this._root = null;
    this._sidebarOpen = false;
  }

  /**
   * Mount the entire application into a container element.
   * @param {string} selector - CSS selector for the root element
   */
  mount(selector) {
    this._root = document.querySelector(selector);
    if (!this._root) {
      throw new Error(`[App] Root element "${selector}" not found`);
    }

    this._render();
    this._bindEvents();
    wsClient.connect();

    this.router = new Router(ROUTES, { container: '#app-view' });
    this.router.start();
  }

  /** Tear down. */
  destroy() {
    this.router?.destroy();
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  /** @private */
  _render() {
    this._root.innerHTML = `
      <div class="app-layout">
        <!-- Mobile toggle -->
        <button class="mobile-menu-btn sidebar-toggle" aria-label="Toggle navigation">
          ${ICONS.menu}
        </button>

        <!-- Sidebar -->
        <aside class="sidebar" id="sidebar">
          <div class="sidebar-logo">
            ${LOGO_SVG}
            <div class="sidebar-logo-text">
              <span class="sidebar-logo-title">Lyzer Edge</span>
              <span class="sidebar-logo-subtitle">Analyst</span>
            </div>
          </div>
          <nav class="sidebar-nav">
            ${this._renderNavItems()}
          </nav>
        </aside>

        <!-- Overlay (mobile) -->
        <div class="sidebar-overlay" id="sidebar-overlay"></div>

        <!-- Main content -->
        <main class="main-content">
          <div id="app-view"></div>
        </main>
      </div>`;
  }

  /** @private */
  _renderNavItems() {
    return NAV_ITEMS.map((item) => {
      if (item === 'divider') {
        return '<div class="nav-divider"></div>';
      }

      const icon = ICONS[item.icon] ?? '';
      const badge = item.badge
        ? `<span class="badge badge-soon nav-badge">${item.badge}</span>`
        : '';

      return `
        <a href="${item.path}" class="nav-item sidebar-nav-item" data-path="${item.path}">
          <span class="nav-icon sidebar-nav-icon">${icon}</span>
          <span class="nav-label">${item.label}</span>
          ${badge}
        </a>`;
    }).join('');
  }

  // ── Events ───────────────────────────────────────────────────────────────

  /** @private */
  _bindEvents() {
    // Mobile sidebar toggle
    const toggle = this._root.querySelector('.sidebar-toggle');
    const sidebar = this._root.querySelector('#sidebar');
    const overlay = this._root.querySelector('#sidebar-overlay');

    toggle?.addEventListener('click', () => {
      this._sidebarOpen = !this._sidebarOpen;
      sidebar?.classList.toggle('open', this._sidebarOpen);
    });

    overlay?.addEventListener('click', () => {
      this._sidebarOpen = false;
      sidebar?.classList.remove('open');
    });

    // Close sidebar on nav click (mobile)
    sidebar?.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem && window.innerWidth <= 1024) {
        this._sidebarOpen = false;
        sidebar.classList.remove('open');
      }
    });
  }
}

export default App;
 
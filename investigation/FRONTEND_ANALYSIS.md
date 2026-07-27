# Lyzer Edge — Frontend Analysis

## Build System

**Config**: `lyzer edge/vite.config.js` (10 lines)
- Vite with a single `@` alias → `./src`
- No plugins, no special transforms, no CSS processing pipeline
- Relies on browser-native ESM (`type="module"` in `index.html`)

**Entry**: `lyzer edge/index.html` → `src/main.js`
- Loads Google Fonts (Inter + JetBrains Mono) via `<link>` preconnect
- Loads TradingView (`tv.js`) and Lightweight Charts (`lightweight-charts@4.2`) from CDN as global scripts
- Dark mode via `<meta name="color-scheme" content="dark">` + inline SVG favicon

## Two Runtime Modes

`main.js` detects which mode to run via `RuntimeSelector.resolve()`:

### 1. Legacy Dashboard (Router-based SPA)
- `App.mount('#app')` → `GamifiedCommandCenterView` (legacy path, not the Router)
- Actually the "legacy" path still uses `GamifiedCommandCenterView` — not the hash router

### 2. Command Center V2 (Widget Shell)
- Uses `CommandCenterApp` with `WidgetRegistry`, `RealityOrchestrator`, `ProviderRegistry`
- 6 widgets registered directly: `realityStatus`, `chartHost`, `runtimeInspector`, `court`, `timeline`, `causalGraph`
- Layout: 3-pane institutional (`22% / 53% / 25%`)
- Left: timeline; Center: causal-graph + chart-host; Right: court + runtime-inspector + reality-status

## Router Structure

**File**: `src/router.js` (222 lines)
- Hash-based (`hashchange` event)
- Supports param extraction (`/trades/:id` → `params.id`)
- Navigation guard (async, can veto)
- View lifecycle: calls `component(params)` factory → `mount(container)` / `unmount()`
- 404 fallback with "Page Not Found"
- Active nav state via `.nav-item` class toggle
- `eventBus.on('navigate')` for programmatic routing

Routes are NOT defined in router.js itself — they're passed as an array of `RouteDefinition[]` on construction. Where routes are defined is unknown (not in main.js, probably in App or a routes file).

## Component Architecture

### File Count
- **View-level components** (`src/components/*.js`): 25+ files
- **Command Center subsystem** (`src/components/commandCenter/`): ~60 files
  - `app/` — LayoutEngine, PaneManager, WidgetHost, CommandCenterApp
  - `sdk/` — WidgetRegistry, WidgetLoader, WidgetErrorBoundary, types, StreamBuffer, RingBuffer, RenderScheduler, Clock
  - `sdk/providers/` — IDataProvider, ProviderRegistry, LiveProvider, MockProvider, HistoricalProvider, ReplayProvider
  - `sdk/reality/` — RealityOrchestrator, RealityStateMachine, RealityTransitionGuard, ProviderTelemetry
  - `sdk/lacw/` — LACWEventBus, LACWCommandPalette + runtime engines (UniversalExecutionEngine, SmartSchedulerEngine, etc.)
  - `sdk/governance/` — DecisionLedger
  - `sdk/observability/` — PerformanceMonitor
  - `widgets/` — court, chartHost, timeline, causalGraph, realityStatus, runtimeInspector, agentHub, tradeLog, cognitiveAudit, alphaDiscovery, calibrationDashboard, etc.
- **Engine modules** (`src/engine/`): 40 files (stats, risk, signalEngine, kernel, edgescore, patterns, etc.)
- **ECA frontend** (`src/eca/`): 10 files (court.js, permission.js, ledger.js, constraintEngine.js, etc.)
- **Services** (`src/services/`): 6 files (wsClient, DataSeederService, BinanceSeederService, etc.)
- **DB** (`src/db/`): 5 files (database.js via Dexie, queries.js, etc.)

### Component Patterns

**Pattern A — View Components** (Legacy SPA views)
- Class with `mount(container)` / `unmount()` lifecycle
- Constructor sets instance state
- `mount()` renders via `innerHTML`, binds events, loads async data
- `unmount()` cleans up: removes charts, clears intervals, nulls references
- Examples: Dashboard.js (429 lines), TradeLog.js, etc.

**Pattern B — Widget Components** (Command Center V2)
- Class with `mount(container, runtime)` / `dispose()` / `unmount()` lifecycle
- Has an associated `manifest.js` (id, name, version, capabilities, targetPane, realityTag)
- Manifest is validated by `WidgetRegistry` against a schema (SemVer, capabilities enum)
- Receives a `runtime` object (inversion of control) for data access
- Renders via `innerHTML`, caches UI element references in `this._ui`
- Subscribes to runtime data streams, stores disposable handles
- Examples: CourtWidget.js (136 lines), ChartHostWidget.js, etc.

### Naming Conventions
- PascalCase classes exported as named exports
- Files: PascalCase for components (`Dashboard.js`, `TradeLog.js`), camelCase for utilities (`eventBus.js`, `wsClient.js`)
- Widget manifests: camelCase (`courtManifest`, `chartHostManifest`)
- Private members: underscore prefix (`this._container`, `this._runtime`)
- CSS classes: kebab-case (`.g-topbar`, `.g-dock-btn`, `.nav-item`, `.page-container`)

## State Management Approach

**No reactive framework** — the app uses an ad-hoc mix of approaches:

1. **Event Bus** (`src/lib/eventBus.js`): Singleton pub/sub with `.on()`, `.off()`, `.once()`, `.emit()`, wildcard support. Used for cross-component communication and programmatic navigation.

2. **WebSocket Client** (`src/services/wsClient.js`): Singleton managing a single WS connection. Buffers messages when no listeners are attached. Supports `.onData(fn)` / `.offData(fn)`. Auto-reconnects on close (3s delay). Vite dev mode redirects to port 7860.

3. **IndexedDB** via Dexie (`src/db/database.js`): Local persistence layer for trades, settings, edge score history. Query functions in `queries.js`.

4. **Custom DOM Events**: `window.dispatchEvent(new CustomEvent('lyzer:plot-trade', ...))` pattern for widget communication.

5. **Runtime Object (IoC)**: Widgets receive a `runtime` object on mount that provides `getDecisionLedger()`, `subscribeTicks()`, `getMarketData()`, `getSystemMetrics()`, etc. In `GamifiedCommandCenterView`, this is a mock object — not a real runtime.

6. **No Redux/Zustand/Store**: State is scattered across component instances, module-level singletons, and IndexedDB.

## CSS Architecture

- `variables.css` — CSS custom properties (dark palette, glassmorphism tokens, spacings, shadows)
- `base.css` — CSS reset, body/heading/link defaults, scrollbar styling
- `layout.css` — Sidebar layout, grid layouts, responsive breakpoints (1024px, 768px)
- `components.css` — .nav-item, .card, .btn, .status-badge, .page-header, .empty-state utilities

Design system: Dark mode, glassmorphism 2.0 (backdrop-filter, rgba borders), neon accents (cyan #00f3ff, emerald #00ff9d), JetBrains Mono for data, Inter for UI.

## ECA / Frontend Integration

The `src/eca/` directory contains a frontend port of the backend Constitutional Court:

- `court.js` — `ConstitutionalCourt` class (module-level singleton pattern on backend, but imported directly here)
- `permission.js` — `PermissionToken` for audit trail
- `ledger.js` — Immutable decision ledger
- `constraintEngine.js` — Deterministic constraint evaluation
- `axioms.js` — Constitutional axioms
- `killSwitch.js` — Emergency stop
- `vault.js`, `riskPolicy.js`, `proposalBudget.js`, `realityAnchor.js`

The court is rendered via `CourtWidget` which subscribes to runtime decision ledger events and displays veto/allow decisions, LHDS scores, EEF status, and MOL state.

## Risks & Issues

### Critical
1. **Monolithic `GamifiedCommandCenterView`** (625 lines): Contains rendering, WS subscription, mock data generation, tick simulation, notification balloons, leaderboard, and metrics updates. Extremely hard to maintain or test.
2. **Mock data mixed with production**: `_startGamification()` generates fake trades with simulated price movement and spawns intervals. This mock layer runs alongside real WS data, making behavior unpredictable.
3. **No reactive framework**: All DOM updates use `innerHTML` assignment, which destroys event listeners, loses focus, and is an XSS vector if data contains user-controlled content.

### Architecture
4. **Dual runtime paths**: Both `CommandCenterView` and `GamifiedCommandCenterView` exist with overlapping functionality. The `main.js` startup decides which to use, but both import similar widgets and create similar infrastructure.
5. **No formal state management**: Data flows through `wsClient._latestData`, `window` events, `eventBus`, and direct instances — no single source of truth.
6. **CommandCenterView and main.js duplicate widget registration**: Both register the same 6 widgets with the same layout config in almost identical code.
7. **Routes undefined in repo**: The `Router` class is complete but the route definitions array is not visible in main.js or app.js. May be defined elsewhere or not yet fully wired.

### Code Quality
8. **inconsistent error handling**: Some async operations are wrapped in try/catch, others are not. The `GamifiedCommandCenterView._mountStaticWidgets()` catches errors silently, while `_mountActiveWidget()` has its own catch block.
9. **Font loading duplication**: Fonts are loaded both in `index.html` (preconnect + stylesheet) and dynamically in `GamifiedCommandCenterView.mount()` (duplicate link elements).
10. **Charting library mix**: Uses Lightweight Charts (free tier), ApexCharts, and TradingView — three charting libraries with different APIs and bundle footprints.
11. **WS client potential leak**: `onData()` pushes to a flat array with no deduplication. Repeated subscriptions without corresponding `offData()` calls will accumulate listeners.

### Performance
12. **`innerHTML` everywhere**: Every view re-renders its entire subtree on mount, even for small updates. No virtual DOM, no diffing, no targeted DOM updates.
13. **No code splitting**: All widgets are imported eagerly at startup (see main.js imports). Command Center V2 already imports 6+ widgets; GamifiedCommandCenterView imports 11+.
14. **Interval-based mock simulation**: `_startGamification()` creates `setInterval` for clock, trade spawning, and tick simulation — all running even when the widget is not visible.

### CSS
15. **Inline styles in JS**: Many components mix CSS-in-JS strings (backtick templates with inline `style=` attributes) rather than using the CSS modules or the global stylesheets, making theming and overrides difficult.

### Testing
16. **No component tests visible**: The test infrastructure (vitest) exists but there's no evidence of component-level tests for the frontend views and widgets.

# Lyzer Edge — Final Synthesis Report

> Generated 2026-07-27 from 6 specialist agent reports (system-map, backend, frontend, security, data, investigation plan)

---

## 1. Project Overview

**Lyzer Edge** is an institutional algorithmic trading system with a 7-layer quantitative pipeline. It ingests live market data via Binance WebSocket, runs signals through SMC/ICT/SnD/Momentum providers, evaluates via the TruthKernel and Constitutional Court, and executes trades with exchange-agnostic adapters.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express 5, ws, SQLite (sqlite3 + better-sqlite3) |
| Frontend | Vanilla JS SPA, Vite, Dexie (IndexedDB) |
| Rust | 17 crates across 3 workspaces (kernel, hub, edge services) |
| Messaging | NATS JetStream, gRPC |
| Charting | Lightweight Charts, ApexCharts, TradingView |
| Test/Build | Vitest, jsdom, ESLint, Prettier |

### File Counts (project only, excluding node_modules)

| Type | Count |
|------|-------|
| .js | ~944 |
| .ts | ~103 |
| .rs | 55 |
| .md | ~834 |

---

## 2. Architecture

### Backend Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    server.js (Express 5)                       │
│  Port 7860 · HTTP + WebSocket · Admin routes · Fleet reports  │
│  SIGINT → backup_restore.py → exit(0)                         │
└──────────┬──────────────────────────────────┬─────────────────┘
           │ spawns ×6                         │ serves static
           ▼                                   ▼
┌──────────────────────────┐          ┌──────────────────┐
│   StreamEngine (×6)      │          │   Vite Build     │
│  BTC, ETH, SOL, BNB,     │          │  ../dist/        │
│  EUR, GBP                │          └──────────────────┘
└──────────┬───────────────┘
           │ processCandle()
           ▼
┌─────────────────────────────────────────────────────────────┐
│              7-Layer Pipeline (per tick)                     │
│                                                             │
│  1. Providers V1-V4 (SMC, SnD, RSI, IMCE)                  │
│  2. ResidualizationLayer → DVF + TRG                        │
│  3. ExecutionTriggerLayer → EEF ≥ 0.4                       │
│  4. TruthKernel → LHDS veto, ontological collapse           │
│  5. C-CLIST → stress oracle, lethalIllusionLimit            │
│  6. MOL → recovery state machine                            │
│  7. ConstitutionalCourt → PermissionToken                   │
│                                                             │
│  All layers must pass for a trade to execute                │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Architecture

```
index.html
    │
    ▼
main.js ──→ RuntimeSelector.resolve()
    │
    ├── CommandCenterV2 (6 widgets, 3-pane layout)
    │   ├── WidgetRegistry + ProviderRegistry
    │   ├── RealityOrchestrator (state machine)
    │   ├── LACW EventBus + Command Palette
    │   └── Widgets: realityStatus, chartHost, runtimeInspector,
    │       court, timeline, causalGraph
    │
    └── Legacy SPA (21 hash routes, 625-line view)
        ├── Dashboard, TradeLog, Analytics, etc.
        └── GamifiedCommandCenterView (mock + real data)
```

### Pipeline Flow (per candle)

```
Binance WS ──→ LiveDataIngestor ──→ StreamEngine
                                         │
                                    Reconstruct Narratives
                                         │
                                    CSRL Coherence (scale alignment, topology, invariants)
                                         │
                                    Dual Reality Divergence (LHDS)
                                         │
                                    TruthKernel Evaluation
                                         │
                                    Court C-CLIST + MOL
                                         │
                                    Position Management (SL/TP/confidence/reversal)
                                         │
                                    Execution (order placement)
```

### Data Flow

```
Exchange WebSocket
    │
    ▼
StreamEngine (6 instances)
    │
    ├──► CausalMemoryDB (SQLite) — candles, events, experiments, param versions
    ├──► ShadowTradingTelemetry (better-sqlite3) — shadow trades
    ├──► ConstitutionalCourt (in-memory Array) — veto/approve ledger
    │         ⚠ Lost on restart
    └──► WebSocket broadcast → Frontend clients
                                    │
                               Dexie/IndexedDB — trades, settings, screenshots,
                               equity snapshots, pattern snapshots
```

---

## 3. Key Findings by Domain

### Backend (5 findings)

1. **Monolithic `processCandle` (430+ lines)** — `streamEngine.js:483-915` handles signal aggregation, position management, court evaluation, broadcast, and execution in one deeply nested method. Violates SRP; refactoring is high-risk.

2. **No response in `update-status` handler** — `server.js:162` calls `broadcast()` but omits `res.json()` or `res.end()`. Clients hang until timeout.

3. **Singleton `signalEngine` shared across 6 instances** — Created at module scope in `streamEngine.js`. All 6 asset engines share one `EvSignalEngine` instance. Thread-safety not guaranteed if providers maintain internal state.

4. **No WebSocket heartbeat/ping-pong** — `server.js` manages a manual `clients` array with add/remove but no liveness detection. Stale connections accumulate indefinitely.

5. **Shadow trading null-pointer risk** — When `shadowTradingEnabled` is true, `this.execution` is set to null but `handleExecution()` calls `this.execution.placeOrder()` without a null check. Would throw at runtime.

### Frontend (4 findings)

1. **Monolithic `GamifiedCommandCenterView` (625 lines)** — Renders, subscribes to WS, generates mock data, spawns timers, manages notifications. Extremely hard to maintain or test.

2. **Mock data runs alongside production** — `_startGamification()` generates fake trades and simulated prices on `setInterval` while real WS data also flows in. Behavior is unpredictable.

3. **`innerHTML` everywhere** — Every view re-renders its entire subtree on mount. Destroys event listeners, loses focus, and is an XSS vector if data contains user-controlled content.

4. **No component tests** — Vitest infrastructure exists but zero component-level tests for frontend views or widgets were found.

### Security (4 findings)

1. **CRITICAL: Live tokens in .env** — GitHub (`ghp_Zwf...`) and HuggingFace (`hf_oENS...`) tokens committed. Anyone with repo access can act as the user. Rotate immediately.

2. **`child_process.exec()` for backup** — `server.js` calls `exec()` to run `backup_restore.py`. If arguments are ever derived from user input, command injection is possible.

3. **No security middleware** — Express server has no `helmet`, no `cors`, no rate limiting. Admin auth uses a query string parameter (`?adminKey=...`) visible in logs and browser history. WebSocket has zero authentication.

4. **Docker runs as root** — No `USER` directive, no `.dockerignore` to exclude `.env` with secrets.

### Data (4 findings)

1. **No schema migrations** — `CREATE TABLE IF NOT EXISTS` is the only mechanism. Any column addition requires manual DDL and will fail on existing databases.

2. **In-memory ledger is ephemeral** — `ConstitutionalLedger.entries` (a plain Array) is lost on process restart. Edge-riding counters reset to zero. No replay or recovery.

3. **Dual file copies** — `database.js`, `queries.js`, `SQLiteSchema.ts` exist in both `packages/lyzer-shared/` and `lyzer edge/src/` as duplicates. Schema changes require applying to both or they diverge silently.

4. **No sync between frontend IndexedDB and backend SQLite** — Trades saved in the frontend journal never appear in `causal_events_log` and vice versa. No conflict resolution exists.

---

## 4. Risk Matrix

| Risk | Severity | Impact | Recommendation |
|------|----------|--------|---------------|
| Live GitHub/HF tokens in .env | CRITICAL | Account takeover, repo access | Revoke tokens immediately; add .env to .gitignore |
| No schema migrations | CRITICAL | Data loss on schema changes; silent corruption | Add migration framework with `PRAGMA user_version` |
| In-memory ledger lost on restart | CRITICAL | Edge-riding counters reset; no audit trail persistence | Persist to `court_ledger` SQLite table at startup |
| Admin API key in query string | HIGH | Credential leaked in logs, proxies, browser history | Move to `Authorization: Bearer` header |
| Monolithic processCandle (430 lines) | HIGH | High defect rate; safe refactoring nearly impossible | Decompose into focused methods/classes |
| Mock data mixed with production | HIGH | Unpredictable trading behavior; false signals | Gate mock layer behind `MOCK_MODE` env var, off by default |
| innerHTML for all DOM updates | HIGH | XSS vector; destroyed event listeners; poor perf | Use textContent for text; sanitize HTML; adopt template-based rendering |
| No data sync frontend↔backend | HIGH | Trade journal and causal events diverge; no single source of truth | Define master data source; push frontend trades to backend as causal events |
| No WebSocket authentication | MEDIUM | Anyone can connect and receive real-time trading data | Add token auth on WS upgrade |
| Shared singleton signalEngine | MEDIUM | Race conditions if providers maintain state across 6 engines | Create per-engine signalEngine instance |
| No connection pooling (SQLite) | MEDIUM | 6 engines serialize on one connection; bottleneck under load | Switch to better-sqlite3 (sync) or use connection pool |
| Unbounded table growth | MEDIUM | `causal_events_log`, `shadow_trades_v1` grow forever; no TTL | Add retention policy + periodic janitor job |
| No graceful WS close/error handling | MEDIUM | Stale connections accumulate; memory leak | Add ping/pong, `ws.on('error')`, heartbeat interval |
| CER DDL defined but never wired | LOW | Constitutional Evidence Registry is aspirational only | Wire CER into startup; connect evidence recording at TruthKernel |
| Mixed sync/async SQLite drivers | LOW | Cognitive load; different error handling patterns | Unify on `better-sqlite3` (already a transitive dep) |
| docker runs as root | MEDIUM | Container breakout risk; secrets in image layers | Add `USER` directive + `.dockerignore` |

---

## 5. Scorecard

| Dimension | Score (0-10) | Notes |
|-----------|:-----------:|-------|
| Architecture | 7 | 7-layer pipeline is well-conceived. Clean separation in theory, but `processCandle` violates SRP and singleton usage creates coupling. |
| Security | 3 | Live tokens in repo is a showstopper. No helmet/CORS/rate limiting. Admin auth via query string. WS is open. |
| Code Quality | 5 | Good modularity in packages, but monolithic methods (430+ lines), duplicated files, inconsistent error handling, and no TypeScript drag the score down. |
| Testing | 3 | Vitest infra exists, but no component tests for frontend. Backend pipeline core files (kernel, residualization, court) have no dedicated tests. |
| Documentation | 6 | Comprehensive knowledge base (834 .md files) and AGENTS.md. But some docs are in Portuguese, some systems (CER, SchemaCompatibilityGate) are aspirational and documented as though they work. |

---

## 6. Recommendations

### Top 5 Actions (ordered by priority)

1. **Rotate exposed tokens NOW** — Revoke `ghp_***REDACTED***` and `hf_***REDACTED***` on GitHub and HuggingFace. Add `.env` to `.gitignore`. Audit git history for any other committed secrets.

2. **Add schema migrations** — Implement a `_migrations` table with sequential DDL files. Check `PRAGMA user_version` on startup. This is a prerequisite for any data schema change.

3. **Decompose `processCandle`** — Split the 430-line method into focused modules: signal aggregation, position management, court evaluation, and broadcast. Each module should be independently testable.

4. **Replace `innerHTML` with safe DOM operations** — Use `textContent` for user-facing text. Sanitize any HTML. Consider adopting a template-based approach (e.g., Tagged Templates or lit-html) rather than raw string concatenation.

5. **Persist the ConstitutionalLedger** — On each veto/approve decision, write to a `court_ledger` table in backend SQLite. On startup, restore edge-riding counters from the last N entries. This prevents zero-state recovery on restart.

# Backend Analysis Report

## 1. `backend/server.js` — Express 5 Server

### Purpose
Main HTTP/WebSocket entry point. Express 5 app serving the Vite-built SPA, WebSocket broadcasting, admin API endpoints (experiments, archeologist, mind MRI), and periodic backup/fleet reporting.

### Key Exports / Functions
- **`app`**: Express application instance
- **`server`**: `http.createServer(app)` listening on port 7860
- **`wss`**: WebSocketServer for real-time UI updates
- **`broadcast(payload)`**: Sends JSON to all connected WebSocket clients
- **`authenticateAdmin`**: Middleware guarding admin routes via `ADMIN_API_KEY` header/query
- **`runBackup()`**: Shell exec of `backup_restore.py` for Hugging Face Storage Bucket persistence
- **`sendFleetReport()`**: Every 4h, aggregates engine stats and sends Telegram alert

### Dependencies
- `dotenv`, `express`, `ws`, `path`, `url` (Node built-ins)
- Internal: `streamEngine.js` (StreamEngine, arl), `statePersistence.js`, `telegram.js`, `db.js`, `experimentManager.js`, `lyzerArcheologist.js`, `lyzerMindMRI.js`
- From `../src/observability/index.js` (Prometheus metrics)

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/metrics` | Admin | Prometheus metrics scrape endpoint |
| GET | `/api/experiments/dashboard` | No | Full experiment ecosystem dashboard |
| GET | `/api/experiments/active` | No | Active experiment details |
| POST | `/api/experiments/freeze-and-new` | Admin | Freeze current + create new experiment |
| POST | `/api/experiments/promote-champion` | Admin | Promote experiment to Champion |
| GET | `/api/experiments/alpha-discovery` | No | Cross-experiment pattern discovery |
| POST | `/api/experiments/update-status` | Admin | Update 6-state lifecycle status |
| GET | `/api/experiments/ranking` | No | Historical experiment leaderboard |
| GET | `/api/experiments/:id` | No | Single experiment + snapshot + trades |
| GET | `/api/archeologist/dna` | No | Codebase DNA composition |
| GET | `/api/archeologist/rankings` | No | Module importance ranking |
| GET | `/api/archeologist/dead-code` | No | Dead code candidates |
| GET | `/api/archeologist/philosopher-report` | No | Philosopher report |
| GET | `/api/mind/mri` | No | Full project MRI report |
| GET | `/api/status` | No | Health check |
| POST | `/api/trades/close` | Admin | Close active trade manually |
| POST | `/api/trades/delete` | Admin | **Always 403** — Zero Entropy Policy |
| POST | `/api/trades/wipe` | Admin | Redirected to freeze-and-new |
| GET | `/api/trades/export` | No | Export all trades as JSON |
| GET | `/api/test-telegram` | No | Test Telegram integration |
| GET | `/api/candles/:symbol` | No | Per-symbol candle + trade data |
| GET | `/api/extinction/status` | No | Legacy extinction engine status |

### Code Quality Observations
- **Good**: Modular route organization, clear middleware pattern for admin auth, async error handling with try/catch
- **Good**: Separation between API routes and SPA fallback via path prefix check (`/api`)
- **Concern**: Inline `broadcast` variable references `clients` array with manual add/remove — no heartbeat or ping-pong; stale connections can accumulate
- **Concern**: `engines` is a mutable module-level array referenced by inline closures — not encapsulated
- **Concern**: `POST /api/experiments/update-status` does not return a response body on success (missing `res.json(...)`)
- **Concern**: `sendFleetReport()` accesses `engine.candles[engine.candles.length - 1]` without bounds check

### Risks / Issues
- **Missing response in `update-status` handler** (line 162): `broadcast()` is called but no `res.json()` or `res.end()` follows — client will hang until timeout
- **Weak admin auth**: API key passed in query string (`?adminKey=...`) is logged by most proxies and visible in browser history
- **Process shutdown**: `SIGINT`/`SIGTERM` handlers call `runBackup()` then `process.exit(0)` after 4s — if backup takes longer, DB state may be lost
- **No graceful WebSocket close**: No `ws.on('error')` handler, no ping/pong for liveness detection

---

## 2. `backend/streamEngine.js` — Orchestrator (6 instances)

### Purpose
Core pipeline orchestrator. Each `StreamEngine` instance manages one asset: data ingestion → narrative generation (4 providers) → CSRL coherence → TruthKernel → C-CLIST/MOL court → trade execution. Created 6 times in `server.js` (BTC, ETH, SOL, BNB, EUR, GBP).

### Key Exports
- **`StreamEngine` class** (extends `EventEmitter`)
- **`arlEngineInstance`**: Singleton compat instance for legacy BTCUSDT
- **`arl`**: Alias to `arlEngineInstance.ecoEngine` (EVAlphaResearchEngine)

### Key Methods
- `start()`: Boots simulation or live mode
- `processCandle(candle, index)`: Main pipeline entry — reconstruct narratives, CSRL, TruthKernel, court stress evaluation, position management, broadcast
- `startSimulationLoop()`: Synthetic candles every 500ms
- `startLiveMode()`: WebSocket → MTF aggregation → pipeline
- `updateMtfCandles(candle)`: Buckets 1m ticks into 5m/15m/1h/4h/1d candles
- `checkTickPositionExit(candle)`: Tick-level SL/TP guard for active positions
- `initializeExecution()`: Creates `ExchangeExecution` for TESTNET/LIVE modes
- `handleStateChange(state)`: Connection degradation → fallback simulation loop
- `handleExecution(direction, candle, quantity)`: Places market order via execution layer

### Constructor Creates
- **4 providers**: V1 (LiquidityReconstruction), V2 (StructuralBoundary), V3 (MomentumRSI), V4 (IMCE)
- **2 SMC engines**: LiquidityEngine, StructureEngine, SmcEngineFacade
- **CSRL subsystem**: ScaleNormalizer, CrossScaleTensorGraph, InvariantExtractor, DivergenceDetector
- **TruthKernel**: Evaluation engine with configurable thresholds
- **ConstitutionalCourt**: C-CLIST stress oracle + MOL recovery state
- **EVAlphaResearchEngineV3_3**: Evolutionary research (also exposes `extinctionEngine`)
- **DualRealityMonitor**, **SpectrogramUI**, optionally **RealityGapMonitor**

### Pipeline Flow (processCandle)
1. Reconstruct narratives from V1-V4 providers
2. CSRL coherence computation (scale alignment → topology → invariants → divergence)
3. Dual reality divergence (LHDS)
4. TruthKernel evaluation (TRG, DVF, EEF, epistemological authority)
5. Court C-CLIST stress + MOL state evaluation
6. Active position SL/TP/confidence/reversal checks
7. New position evaluation (stabilization window, court permission, dynamic sizing, micro ATR SL/TP)
8. Step evolutionary research engine
9. Broadcast ARL payload via EventEmitter

### Code Quality Observations
- **Good**: Clean separation of concerns — providers are injected via constructor, CSRL subsystem is isolated
- **Good**: All thresholds configurable via env vars with sensible defaults
- **Good**: Stabilization window prevents premature trading after boot
- **Concern**: `processCandle` is 430+ lines with deep nesting — difficult to test and maintain
- **Concern**: `globalEVMemory` is a plain mutable object shared across calls — no encapsulation
- **Concern**: `warmupSyntheticCandles()` always starts at $60,000 regardless of symbol

### Risks / Issues
- **Monolithic method**: `processCandle` (line 483-915) is extremely long with deeply nested conditionals — refactoring is high risk
- **Shadow trading /execution clash**: If `shadowTradingEnabled` is true, `initializeExecution()` sets `this.execution = null`, but `handleExecution()` still calls `this.execution.placeOrder()` without null check — would throw
- **Missing null check**: `handleExecution()` (line 917) accesses `this.execution` without verifying it's non-null
- **Duplicate position exit logic**: `processCandle` (lines 599-701) and `checkTickPositionExit` (lines 394-481) contain nearly identical SL/TP resolution code — divergence risk
- **`candle.openTime` vs `candle.timestamp`**: Inconsistent field naming between simulation (uses `timestamp`) and live data (uses `openTime`); fallback logic spread across multiple files
- **No backpressure**: `processCandle` runs synchronously on every incoming candle — no queue if execution or DB sync lags behind
- **Singleton `signalEngine`**: Created once at module scope and shared across all 6 engine instances — thread-safety not guaranteed if providers maintain internal state

---

## 3. `backend/db.js` — Causal Memory Database

### Purpose
SQLite3 wrapper (`CausalMemoryDB` class) providing persistent storage for candles, causal events, semantic memory, parameter versions, evolution ledger, and experiment registry. Singleton pattern (`sharedInstance`).

### Key Exports
- **`CausalMemoryDB` class** (default export: `db` singleton)
- **`db`**: Shared instance at `DEFAULT_DB_PATH` (`/tmp/data/historical_causal_memory.db`)

### Key Methods

| Method | Purpose |
|--------|---------|
| `init()` | Creates 8 tables + indexes with WAL pragmas |
| `insertBatch(symbol, timeframe, candles)` | Bulk candle insert (transaction-batched) |
| `getVisibleHistory(symbol, timeframe, currentMs, limit)` | Time-aware candle query (strictly closed) |
| `insertCausalEvent(event)` | Append-only causal event log with hash chaining |
| `insertParameterVersion(...)` / `getActiveParameterVersion(...)` | Parameter versioning (ADR-016) |
| `insertEvolutionLedgerEntry(...)` / `updateEvolutionLedgerResult(...)` | Evolution ledger (ADR-019) |
| `insertSemanticPattern(pattern)` | Semantic memory upsert (ADR-012) |
| Experiment CRUD: `createExperiment`, `getActiveExperiment`, `freezeExperiment`, `setChampion`, `getChampion`, `getExperimentRanking` | Experiment lifecycle |
| Trade persistence: `insertExperimentTrade`, `updateExperimentTrade`, `getExperimentTrades` | Zero Entropy trade storage |

### Tables Created
- `candles` (symbol, timeframe, timestamp indexed)
- `causal_events_log` (hash-chained event log with correlation_id index)
- `semantic_memory` (ML pattern storage with confidence scoring)
- `parameter_versions` (ADR-016 parameter governance)
- `evolution_ledger` (ADR-019 evolution audit trail)
- `experiments` (Zero Entropy experiment registry)
- `experiment_trades` (Immutable append-only trade records)
- `experiment_snapshots` (Frozen metric snapshots)

### Code Quality Observations
- **Good**: WAL mode pragmas for concurrent read performance, 64MB page cache, memory-mapped I/O
- **Good**: All inserts use `db.serialize()` for sequential execution within each operation
- **Good**: `ON CONFLICT ... DO UPDATE` pattern for semantic_memory upsert
- **Concern**: Every query wraps `db.serialize()` — unnecessary for single statements, adds overhead
- **Concern**: `insertBatch` creates a new prepared statement per call — never explicitly `stmt.finalize()` on error path
- **Concern**: `getVisibleHistory` returns `rows.reverse()` — in-memory reversal of SQL ORDER BY DESC

### Risks / Issues
- **Shared instance anti-pattern**: Constructor returns `sharedInstance` if already created (line 15-17) — however `new CausalMemoryDB(customPath)` **ignores the singleton check** when `customDbPath` is provided, leading to multiple DB connections to different files
- **No connection pooling**: Single `sqlite3.Database` with `serialize()` means all operations are serialized — potential bottleneck under load
- **`insertBatch` prepared statement leak**: `stmt.finalize()` is called after `COMMIT` only, but if `BEGIN TRANSACTION` succeeds and a statement run fails, `stmt` is never finalized
- **No migration system**: Schema is created via `CREATE TABLE IF NOT EXISTS` — no versioned migration support for schema changes
- **Default path is `/tmp/data`**: May be ephemeral in container environments; depends on external volume mounting

---

## 4. `backend/exchangeExecution.js` — Exchange Adapter

### Purpose
Thin wrapper around Binance REST API (`/api/v3/order`) for spot market orders. Supports testnet (`testnet.binance.vision`) and live (`api.binance.com`).

### Key Exports
- **`ExchangeExecution` class**

### Key Methods
- `constructor(apiKey, apiSecret, isTestnet)`: Stores credentials, sets base URL
- `placeOrder(symbol, side, type, quantity)`: Builds HMAC-SHA256 signed query, POSTs to Binance, returns response

### Code Quality Observations
- **Good**: Minimal, single-responsibility class
- **Good**: Graceful simulated fallback when credentials are missing (`FILLED_MOCK`)
- **Concern**: Query string includes API secret? No — secret is used only for HMAC signing, not transmitted
- **Concern**: No rate limiting or retry logic

### Risks / Issues
- **No order type validation**: Accepts any `type` string — could pass invalid order types to Binance
- **No symbol validation**: No check that symbol exists or is tradable
- **Hardcoded `recvWindow`**: 5000ms is generous — consider configurable
- **No order status polling**: Market orders are fire-and-forget; no verification of fill price vs expected
- **Credentials in memory**: API key and secret stored as instance properties for the lifetime of the object

---

## 5. `backend/liveDataIngestor.js` — Data Ingestion

### Purpose
Resilient data ingestion from Binance with multi-endpoint fallback across 6 base URLs. Falls back to synthetic candle generation when all endpoints are unreachable, guaranteeing 100% uptime.

### Key Exports
- **`LiveDataIngestor` class**

### Key Methods
- `constructor(symbol, interval)`: Stores symbol/interval, initializes base price
- `warmupCandles()`: Fetches 101 klines via REST, tries all 6 base URLs, falls back to `_generateSyntheticWarmup()`
- `startWebSocket(onCandleClose, onStateChange)`: Connects to Binance WebSocket stream, falls back to polling after 2 reconnect attempts
- `_startPolling(...)`, `_doPoll(...)`, `_schedulePoll(...)`: REST poll loop (2s interval), fetches latest 2 klines, detects closed candles, falls back to synthetic generation

### Code Quality Observations
- **Good**: Robust multi-endpoint rotation with transient failure tolerance
- **Good**: Synthetic fallback ensures engine stays active during network outages
- **Good**: AbortController with 3-4s timeout prevents hanging requests
- **Concern**: WebSocket `on('close')` immediately switches to polling — no exponential backoff for WS reconnection
- **Concern**: `_generateSyntheticWarmup()` uses very simplistic random walk with no market structure

### Risks / Issues
- **No WS reconnection after polling fallback**: Once `_startPolling()` is called (after 2 WS reconnect failures), it never attempts WebSocket reconnection. Connection loss is permanent until engine restart.
- **Race condition on `_usingPolling`**: `_startPolling()` checks and sets `_usingPolling` at line 124-125, but the WS `close` handler (line 298-303) and `error` handler (line 306-309) can both call `_startPolling()` concurrently
- **Synthetic data pollution**: During outages, synthetic candles are fed into the pipeline as if they were real — no metadata flag distinguishes synthetic from live data. Downstream consumers cannot differentiate.
- **Base price assumption**: `BASE_PRICES` hardcodes initial prices — these may drift significantly from real prices
- **No symbol filtering**: `startWebSocket` constructs WS URL from `this.symbol.toLowerCase()` — no validation that Binance supports the symbol

---

## 6. `package.json` — Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5.2.1 | HTTP server framework |
| `ws` | ^8.21.0 | WebSocket server + client |
| `sqlite3` | ^6.0.1 | Database driver |
| `dotenv` | ^17.4.2 | Env var loading |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `uuid` | ^14.0.0 | UUID generation |
| `nats` | ^2.29.3 | NATS messaging (intent registry, risk gateway) |
| `@grpc/grpc-js` | ^1.14.4 | gRPC client (risk gateway, intent registry) |
| `@grpc/proto-loader` | ^0.8.1 | Protobuf loading |
| `apexcharts`, `lightweight-charts` | — | Frontend charting |
| `dexie` | ^3.2.4 | IndexedDB wrapper (client-side) |
| `tsx`, `ts-node`, `typescript` | ^6.0.3 | TypeScript runtime support |

### Dev Dependencies
- `vite` ^5.0.0, `vitest` ^1.0.0, `@vitest/coverage-v8`, `jsdom` (testing/bundling)
- `eslint`, `prettier` (linting/formatting)
- `concurrently` (run backend + Vite in parallel)

### Observations
- **Dual runtime deps**: `@grpc/grpc-js` + `nats` — the system uses both gRPC and NATS for inter-service communication
- **Heavy frontend deps in backend package**: `apexcharts`, `dexie`, `lightweight-charts` are frontend-only but listed as runtime dependencies — should be devDependencies
- **`sqlite3` v6.0.1**: Native module — requires build tools on install (may cause issues on some platforms)

---

## 7. `vite.config.js` — Build Config

### Purpose
Minimal Vite configuration for the frontend SPA.

### Key Config
- **Alias**: `@` → `./src` directory

### Observations
- Minimal config — no plugins, no build target specified, no CSS preprocessing
- No proxy configuration for API requests during development (`npm run dev` only serves frontend; API calls must go to port 7860 directly)
- Assumes frontend code uses `@/` imports for src files

---

## 8. `vitest.config.js` — Test Config

### Purpose
Vitest test runner configuration.

### Key Config
- **`globals: true`**: Test globals (`describe`, `it`, `expect`) available without import
- **`environment: 'jsdom'`**: DOM emulation for frontend component tests
- **Coverage**: text, json, html reporters

### Observations
- No `setupFiles` defined — no global test setup/mocking
- `jsdom` environment is appropriate for frontend tests but may not suffice for backend/Node integration tests (e.g., WebSocket, crypto)
- No test file pattern override — uses Vitest defaults (`**/*.test.*`, `**/*.spec.*`)

---

## Cross-Cutting Concerns

### Single Points of Failure
- **`db.js` singleton**: All backend code shares one SQLite connection with serialized access
- **`streamEngine.js` `signalEngine` singleton**: One `EvSignalEngine` shared by all 6 engine instances
- **No message queue**: WebSocket broadcasts, DB writes, and exchange orders all happen synchronously within `processCandle`

### Data Consistency
- **Candle field naming**: Simulation uses `timestamp`/`datetime`, Binance REST uses `openTime`/`closeTime`, WebSocket uses `k.t` — conversion/fix logic is scattered
- **Trade object shape**: `trade.trade_id || trade.id` fallback suggests inconsistent ID field naming across code paths
- **`pnl` vs `pnl_pct`**: Some paths store PnL as decimal ratio (0.05 = 5%), others multiply by 100

### Error Handling
- **Inconsistent async error catching**: Some API handlers use try/catch (experiments), others are synchronous (archeologist rankings, dead-code)
- **Silent catch blocks**: Several `catch(() => {})` patterns discard errors (e.g., `insertExperimentTrade` in `server.js:440`)
- **Telegram failures are non-fatal**: All `sendTelegramAlert` calls are `.catch(e => console.error(...))` — Telegram being down does not block the pipeline

### Security
- **API key in query string**: `adminKey` query param leaked in server logs and browser history
- **Binance keys in process env**: `BINANCE_API_KEY`, `BINANCE_API_SECRET` accessible via `/proc` or `process.env` — no encryption at rest
- **No HTTPS in production**: Server listens on `0.0.0.0` without TLS — all traffic including admin keys transmitted in cleartext

### Maintainability
- **`processCandle` at 430 lines**: Single method handles signal aggregation, position management, court interaction, broadcast, and execution — violates Single Responsibility Principle
- **No TypeScript**: All backend code is plain ESM JavaScript with no type checking — refactoring is high-risk
- **Global state**: `server.js` has module-level mutable references (`engines`, `clients`) shared across all requests and engine instances

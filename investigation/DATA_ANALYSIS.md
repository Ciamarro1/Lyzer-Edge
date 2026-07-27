# Lyzer Edge — Data Layer Analysis

## Overview

The project uses **two independent database systems** with **no synchronization** between them:

| System | Tech | Location | Purpose |
|--------|------|----------|---------|
| Backend SQLite | `sqlite3` (callback-based) | `lyzer edge/backend/db.js` | Causal memory, candles, experiments, evolution ledger |
| Frontend IndexedDB | Dexie.js | `lyzer edge/src/db/database.js` + `packages/lyzer-shared/src/db/database.js` | Trade journal, screenshots, settings, equity snapshots |
| Shadow Trading | `better-sqlite3` (sync) | `packages/lyzer-shared/src/research/operations/shadowTradingTelemetry.js` | Shadow execution telemetry |
| CER (Constitutional Evidence Registry) | SQLite DDL string | `packages/lyzer-constitution/src/cer/SQLiteSchema.ts` + `lyzer edge/src/cer/SQLiteSchema.ts` | Evidence, rollups, epoch metadata |

---

## All Schemas Found

### 1. Backend SQLite (`CausalMemoryDB` in `db.js`)

| Table | Purpose | Key Columns | Indices |
|-------|---------|-------------|---------|
| `candles` | OHLCV market data | `symbol, timeframe, timestamp, open, high, low, close, volume, close_time` | `idx_symbol_tf_ts`, `idx_symbol_tf_close` |
| `causal_events_log` | Append-only hash-chain event log (ADR-007/008) | `event_id UNIQUE, timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, hash_prev, epistemic_regime, payload JSON, context JSON, hash` | `idx_causal_ts`, `idx_causal_correlation` |
| `semantic_memory` | Learned pattern registry (ADR-012) | `pattern_id UNIQUE, pattern_type, conditions_json, observations_count, success_rate, avg_pnl, confidence_score, graph_edges_json` | `idx_semantic_pattern` |
| `parameter_versions` | Parameter governance (ADR-016) | `module, parameter, version UNIQUE, value_json, status, proposal_id, approved_by, rollback_reason` | `idx_param_ver` |
| `evolution_ledger` | Parameter evolution audit (ADR-019) | `ledger_id UNIQUE, event_type, module, parameter, from_value_json, to_value_json, acs_score, ars_score, regime_stability_json, impact_analysis_json` | `idx_evo_module`, `idx_evo_type` |
| `experiments` | Quant Research Lab experiment registry | `experiment_id UNIQUE, strategy_hash, config_snapshot_json, model_snapshot_json, champion_flag, parent_experiment_id` | `idx_exp_status`, `idx_exp_champion` |
| `experiment_trades` | Immutable experiment trade log | `trade_id, experiment_id, symbol, direction, entry_price, exit_price, pnl, pnl_pct, status, signal_json, regime, governance_decision, ev_json` | `idx_exp_trades_exp`, `idx_exp_trades_symbol`, `idx_exp_trades_status` |
| `experiment_snapshots` | Frozen experiment metrics | `experiment_id UNIQUE, total_trades, win_rate, profit_factor, sharpe_ratio, equity_curve_json, drawdown_curve_json` | (PK only) |

### 2. Frontend IndexedDB (Dexie — `LyzerEdgeDB`)

| Store | Key Path | Compound Indices |
|-------|----------|------------------|
| `trades` | `++id` | `[symbol+status]`, `[direction+status]`, `[market+status]` |
| `tradeEvents` | `++id` | `[tradeId+type]` |
| `screenshots` | `++id` | (Blob storage) |
| `marketContext` | `++id` | `[marketState]`, `[session]` |
| `equitySnapshots` | `&date` (unique) | — |
| `edgeScoreHistory` | `++id` | `[date]` |
| `simulationCache` | `++id` | — |
| `settings` | `key` | — |
| `alerts` | `++id` | `[read+timestamp]` |
| `tags` | `&name` (unique) | — |
| `tradeTags` | `++id` | `[tradeId]`, `[tagId]` |
| `tradeFeatures` | `++id` | `[tradeId+featureKey]` |
| `patternSnapshots` | `++id` | `[type]`, `[timestamp]` |
| `edgeSnapshots` | `&date` (unique) | — |

### 3. Shadow Trading (`better-sqlite3`)

| Table | Columns |
|-------|---------|
| `shadow_trades_v1` | `id PK, timestamp, asset, detected_regime, signal_type, signal_confidence, hypothetical_entry_price, real_market_price, market_spread, expected_slippage, realized_slippage, governor_decision, veto_reason, hypothetical_pnl, mfe, mae` |

### 4. CER — Constitutional Evidence Registry (SQLite)

| Table | Columns |
|-------|---------|
| `cer_evidence` | `id TEXT PK, timestamp, classification, retention_class, eps, ncr, ccs, payload` |
| `cer_rollups` | `id TEXT PK, period_start, period_end, rollup_type, causal_narrative, aggregated_metrics, rollup_provenance, rollup_confidence` |
| `epoch_metadata` | `constitution_version TEXT PK, constitution_hash, transition_timestamp, previous_constitution, structural_changes` |

### 5. In-Memory Ledger (ConstitutionalCourt)

| Class | Storage | Purpose |
|-------|---------|---------|
| `ConstitutionalLedger` | `Array` in `ledger.js` | Append-only in-memory array of `{timestamp, request, verdict, state, tokenId}`. Not persisted. |

---

## Data Duplication

The **same file exists in two places** (known from AGENTS.md — workspace import quirk):

| File | Path 1 | Path 2 |
|------|--------|--------|
| `database.js` | `packages/lyzer-shared/src/db/database.js` | `lyzer edge/src/db/database.js` |
| `queries.js` | `packages/lyzer-shared/src/db/queries.js` | `lyzer edge/src/db/queries.js` |
| `activeConfig.js` | `packages/lyzer-shared/src/db/activeConfig.js` | `lyzer edge/src/db/activeConfig.js` |
| `historicalData.js` | `packages/lyzer-shared/src/db/historicalData.js` | `lyzer edge/src/db/historicalData.js` |
| `SQLiteSchema.ts` | `packages/lyzer-constitution/src/cer/SQLiteSchema.ts` | `lyzer edge/src/cer/SQLiteSchema.ts` |

These are exact copies. Any schema change must be applied to both.

---

## Data Flow

```
Exchange WebSocket
    │
    ▼
StreamEngine (6 instances, backend)
    │
    ├─► CausalMemoryDB (SQLite) — candles, causal events
    ├─► ShadowTradingTelemetry (better-sqlite3) — shadow trades
    └─► ConstitutionalCourt (in-memory) — veto/approve decisions
            │
            ▼
        ConstitutionalLedger (Array in ledger.js)
    
    Frontend (Vite SPA)
    │
    ├─► Dexie/IndexedDB — trades, events, screenshots, settings
    └─► API calls to backend /api/* routes
```

Key observations:
- **Real-time market data** flows from WebSocket → StreamEngine → `CausalMemoryDB.insertBatch()` via prepared transaction
- **Trading decisions** flow through the 7-layer pipeline, with each layer's decision potentially stored in `causal_events_log`
- **Frontend trade journal** uses IndexedDB exclusively — no backend sync of trade records exists
- **CER evidence** is defined as a DDL string but not instantiated in `db.js` — it appears to be intended for a separate SQLite database (the `constitutional_memory.db` found at `packages/data/constitutional_memory.db`)
- **Experiments** are persisted in the backend SQLite and queried via REST API for the frontend dashboard

---

## Persistence Strategy

| Layer | Strategy | Durability |
|-------|----------|------------|
| Backend SQLite | WAL mode, `synchronous=NORMAL`, `busy_timeout=5000` | Good — crash-safe with WAL |
| Candle inserts | Explicit `BEGIN TRANSACTION` + `COMMIT` with `stmt.finalize()` | Good — batched atomic writes |
| Causal events | Single `INSERT` per event | Acceptable — no transaction batching |
| Frontend Dexie | IndexedDB auto-persist (browser native) | Good — browser-managed |
| Shadow telemetry | `better-sqlite3` sync WAL mode | Excellent — synchronous writes |
| In-memory ledger | Nothing persisted | **Critical risk** — lost on restart |
| CER DDL | Defined as exported string, no instantiation in codebase | **Not yet active** |

### Pragmas used (backend SQLite):
- `journal_mode = WAL` — concurrent read/write safe
- `synchronous = NORMAL` — balance speed/safety
- `busy_timeout = 5000` — 5s wait on lock contention
- `temp_store = MEMORY` — temp tables in RAM
- `cache_size = -64000` — 64MB page cache
- `mmap_size = 30000000000` — 30GB memory-mapped I/O
- `wal_autocheckpoint = 1000` — checkpoint every 1000 pages

---

## Risks

### Critical

1. **No schema migrations** — `CREATE TABLE IF NOT EXISTS` is the only mechanism. Any column addition requires manual DDL and will fail on existing databases. There is zero migration tooling.

2. **In-memory ledger is ephemeral** — `ConstitutionalLedger.entries` (Array) is lost on process restart. Edge-riding counters reset to zero. No replay or recovery mechanism.

3. **Dual file copies** — `database.js`, `queries.js`, etc. exist in both `packages/lyzer-shared/src/db/` and `lyzer edge/src/db/` as duplicates. Schema changes require applying to both or they diverge silently.

4. **No data synchronization** — Frontend IndexedDB trades and backend SQLite causal events are completely independent. A trade created in the frontend journal does not appear in `causal_events_log` and vice versa. No conflict resolution exists.

### High

5. **Prepared statement leak risk** — `insertBatch()` in `db.js` creates a `stmt = this.db.prepare(...)` inside a loop per call but does call `stmt.finalize()`. However, the `sqlite3` library (callback-based) is known for issues with prepared statement lifecycle. If `finalize()` fails or the promise rejects before `finalize()`, statements leak.

6. **Unbounded table growth** — `causal_events_log`, `experiment_trades`, `shadow_trades_v1` have no TTL or retention policy. No `DELETE` or archive mechanism exists anywhere in the codebase.

7. **No connection pooling** — Backend opens a single `sqlite3.Database` as a shared singleton (`CausalMemoryDB`). All 6 `StreamEngine` instances compete on the same connection. Mutex is provided by `db.serialize()` in many (but not all) methods — several methods (e.g. `getActiveExperiment`, `getExperimentRanking`) do **not** use `serialize()`.

8. **Mixed sync/async patterns** — `sqlite3` (callback-based) wrapped in Promises in backend vs `better-sqlite3` (synchronous) in shadow telemetry. Two different SQLite drivers with different concurrency models.

### Medium

9. **CER DDL not wired** — The `CER_DDL` string in `SQLiteSchema.ts` is defined but never executed in `db.js`. The `SchemaCompatibilityGate` is a stub with all logic commented out. CER persistence is aspirational.

10. **JSON blobs everywhere** — `payload`, `context`, `signal_json`, `ev_json`, `equity_curve_json`, etc. are stored as serialized JSON strings. No validation of schema at write time. `tradeLogSchema.js` defines a schema but it is never enforced at the DB layer.

11. **No WAL checkpoint strategy** — Despite WAL mode, `wal_checkpoint(PASSIVE)` is exposed but never called in normal operation. WAL files may grow unbounded under write-heavy loads.

12. **Shadow DB path is hardcoded** — `knowledge/operations/shadow_execution_database.sqlite` is a relative path from the shared package. In production (Docker), this likely resolves to an unexpected location or the read-only filesystem.

### Low

13. **`insertExperimentSnapshot` uses `INSERT OR REPLACE`** — This silently destroys the previous snapshot rather than versioning it. The `experiment_snapshots` table uses `experiment_id` as its logical key but has an auto-increment PK, meaning `REPLACE` deletes the old row entirely (different PK, same `experiment_id`).

14. **Settings table uses `put` with upsert** — In the frontend, `settings` store uses `key` as primary key with Dexie's `put()`, which is correct. But the import/export cycle resets settings to defaults only in the import path's `bulkAdd`, not on first-run detection.

---

## Recommendations

### Immediate (1-2 sprints)

1. **Add a migration framework** — Use `better-sqlite3` (already a dependency) with a `_migrations` table and sequential versioned DDL files. Each startup checks `PRAGMA user_version` and applies pending migrations.

2. **Persist the ConstitutionalLedger** — Write ledger entries to a `court_ledger` table in the backend SQLite. At minimum, persist edge-riding counters so they survive restart.

3. **Deduplicate file copies** — Eliminate the `lyzer edge/src/db/` copies. Configure Vite to resolve `@lyzer/shared` properly so the workspace package is the single source of truth.

4. **Add TTL policies** — Implement a retention job (e.g. `DELETE FROM causal_events_log WHERE timestamp < ?`) with configurable retention window. Add a `created_at` index to support efficient purging.

### Short-term (3-4 sprints)

5. **Sync frontend ↔ backend data** — Either push Dexie trades to the backend as causal events, or pull backend candle/experiment data into IndexedDB for offline frontend use. Choose a master data source.

6. **Serially wrap all DB methods** — Audit every method in `CausalMemoryDB` and wrap in `serialize()` to prevent race conditions between 6 concurrent StreamEngine instances. Add a test that proves concurrent safety.

7. **Wire CER DDL** — Instantiate the CER database connection in the backend startup, apply `CER_DDL`, and connect evidence recording to the pipeline (likely at the TruthKernel step).

### Long-term

8. **Consider SQLite WAL checkpoint scheduling** — Run periodic `PRAGMA wal_checkpoint(TRUNCATE)` during idle cycles to keep WAL file size bounded.

9. **Schema validation on write** — Use the `TradeLogSchema` definition or a library like `zod` at the DB boundary to validate JSON payloads before insertion, rather than trusting callers.

10. **Replace `sqlite3` (callback) with `better-sqlite3` (sync)** — The `better-sqlite3` driver provides synchronous API, better prepared statement management, and is already used in shadow telemetry. Unifying on one driver reduces cognitive load and bug surface.

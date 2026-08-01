# Implementation Report — Milestone 3 (Database Schema Migrations & DB Lifecycle)

## Overview
Worker 3 completed the implementation of the zero-dependency schema migration engine (v1-v4), automated batch TTL cleanup service, SQLite court ledger persistence, and startup hydration routine in the Constitutional Ledger.

## Summary of Changes

### 1. Created `lyzer edge/backend/migrations.js` (NEW)
- **`runMigrations(db)`**: Zero-dependency migration runner querying `PRAGMA user_version` and executing transactional migrations (v1 to v4):
  - `v1_baseline_schema`: Creates tables (`candles`, `causal_events_log`, `semantic_memory`, `parameter_versions`, `evolution_ledger`, `experiments`, `experiment_trades`, `experiment_snapshots`) and their corresponding performance indices.
  - `v2_snapshot_meta_columns`: Idempotently adds snapshot metadata columns (`equity_curve_json`, `drawdown_curve_json`, `monthly_returns_json`, `metrics_json`, `market_snapshot_json`, `alpha_score`, `reason_for_snapshot`) to `experiment_snapshots`.
  - `v3_court_ledger_table`: Creates `court_ledger` table with indices on `timestamp`, `granted`, and `near_miss_type`.
  - `v4_cer_evidence_table`: Creates `cer_evidence` table for raw CER evidence streams.
  - Maintains `_migrations` log table storing `(version, name, executed_at)` and updates `PRAGMA user_version`.
- **`runTTLCleanup(db, options)`**: Non-blocking batch deletion function with `LIMIT 5000` per batch:
  - `candles`: 90-day retention (`close_time < cutoff_90d`).
  - `causal_events_log`: 30-day retention (`timestamp < cutoff_30d`).
  - `cer_evidence`: 14-day retention (`timestamp < cutoff_14d`).
  - `experiment_trades`: 60-day retention for scratch trades (`created_at < cutoff_60d`).
  - **Zero Entropy Compliance**: Strictly preserves all `CHAMPION` and `ARCHIVED` experiment trades.

### 2. Refactored `lyzer edge/backend/db.js`
- Integrated `runMigrations(db)` on database initialization inside `init()`.
- Exposed `runTTLCleanup()` and `startPeriodicTTLCleanup()` helper methods on `CausalMemoryDB`.
- Added helper methods `insertCourtLedgerEntry(entry)` and `getCourtLedgerEntries(limit)` to query and write to `court_ledger`.
- Added `close()` method to `CausalMemoryDB` for clean connection teardown.
- Exported `runMigrations` and `runTTLCleanup`.

### 3. Refactored `packages/lyzer-constitution/src/eca/ledger.js`
- Updated `ConstitutionalLedger` constructor to accept custom database handle.
- Refactored `appendRecord()` to persist permission tokens and near-miss events to SQLite `court_ledger` table with full payload and state snapshots.
- Implemented `loadFromDb(dbInstance)` startup hydration routine:
  - Queries `court_ledger` ordered by `timestamp ASC`.
  - Restores historical `this.entries`.
  - Re-evaluates `edgeRidingCounters` (`drawdownNearMisses`, `slippageNearMisses`) from historical records, preventing counter reset across server restarts.

### 4. Created Unit Tests `lyzer edge/tests/unit/dbLifecycle.test.js` (NEW)
- Test 1: `executes schema migrations v1-v4 transactionally and bumps PRAGMA user_version to 4` (testing version bump, table creation, `_migrations` log, and idempotency).
- Test 2: `performs batch TTL cleanup preserving CHAMPION and ARCHIVED trades` (testing 90d/30d/14d/60d retention and zero-entropy trade preservation).
- Test 3: `persists Constitutional Court records and restores near-miss counters across restarts` (testing persistence and startup hydration routine `loadFromDb()`).

## Verification Commands & Test Results
- Command: `npx vitest run tests/unit/dbLifecycle.test.js`
- Execution Working Directory: `E:\projcts\lyzer\lyzer edge`
- Result: 100% Pass (3/3 tests passed)

```
 RUN  v1.6.1 E:/projcts/lyzer/lyzer edge

stdout | Database.<anonymous> (E:\projcts\lyzer\lyzer edge\backend\db.js:25:25)
[DB] Connected to SQLite Causal Memory Database (\tmp\data\historical_causal_memory.db).

stdout | tests/unit/dbLifecycle.test.js > Database Schema Migrations & DB Lifecycle (Milestone 3) > performs batch TTL cleanup preserving CHAMPION and ARCHIVED trades
[DB] Connected to SQLite Causal Memory Database (E:\projcts\lyzer\lyzer edge\test_db_lifecycle.db).

stdout | tests/unit/dbLifecycle.test.js > Database Schema Migrations & DB Lifecycle (Milestone 3) > persists Constitutional Court records and restores near-miss counters across restarts
[DB] Connected to SQLite Causal Memory Database (E:\projcts\lyzer\lyzer edge\test_db_lifecycle.db).

stdout | tests/unit/dbLifecycle.test.js > Database Schema Migrations & DB Lifecycle (Milestone 3) > persists Constitutional Court records and restores near-miss counters across restarts
[DB] Connected to SQLite Causal Memory Database (E:\projcts\lyzer\lyzer edge\test_db_lifecycle.db).

 ✓ tests/unit/dbLifecycle.test.js  (3 tests) 255ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  22:59:50
   Duration  4.94s (transform 284ms, setup 0ms, collect 616ms, tests 255ms, environment 2.94s, prepare 405ms)
```

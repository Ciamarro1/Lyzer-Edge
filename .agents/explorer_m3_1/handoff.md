# Handoff Report — Explorer 7 (Milestone 3)

## 1. Observation
Direct findings from inspect tools on `E:\projcts\lyzer`:

1. **Database Module Schema Initialization**:
   - `lyzer edge/backend/db.js` lines 33–248: Table creation is done via inline `CREATE TABLE IF NOT EXISTS` commands inside `this.db.serialize()`.
   - Ad-hoc table alterations are handled using runtime `PRAGMA table_info(...)` callbacks (e.g. `db.js` lines 229–247 adding missing snapshot columns).
   - `PRAGMA user_version` is never set or checked (default value is `0`).

2. **Constitutional Ledger Persistence & Edge Riding Counter Reset**:
   - `packages/lyzer-constitution/src/eca/ledger.js` lines 8–47: `ConstitutionalLedger` initializes database asynchronously via `_initDatabase()` pointing to `causal_memory.db` in `process.cwd()` (isolated from `lyzer edge/backend/db.js`).
   - `packages/lyzer-constitution/src/eca/ledger.js` lines 9–13: Constructor sets `this.entries = []` and `this.edgeRidingCounters = { drawdownNearMisses: 0, slippageNearMisses: 0 }`.
   - On application startup/restart, `ConstitutionalLedger` does NOT execute any query to read existing rows from `court_ledger` or recalculate `edgeRidingCounters`.
   - `packages/lyzer-constitution/src/eca/constraintEngine.js` lines 38–41: Edge Riding constraint check reads `ledger.getNearMissCount('drawdown')`. On every server restart, this counter resets to `0`, permitting continuous Edge Riding across restarts.

3. **High-Churn Tables Without Retention/TTL Limits**:
   - `candles` table (`db.js` lines 44–57): Receives continuous 1-minute OHLCV candles across assets (6 symbols * 1440 candles/day = 8,640 rows/day).
   - `causal_events_log` table (`db.js` lines 63–81): Log of all causal events with JSON payloads, hash chains, and correlation IDs.
   - `cer_evidence` table (`packages/lyzer-constitution/src/cer/SQLiteSchema.ts` lines 2–11): Logs raw evidence stream events.
   - No routine currently executes `DELETE` or pruning commands on any of these high-churn tables.

4. **Zero Entropy Requirement**:
   - `lyzer edge/backend/server.js` lines 305–310 & `migrateLegacy.js` lines 1–6: Deletion/wiping of trades is strictly forbidden by system governance; all trade history must be preserved for research under `CHAMPION` or `ARCHIVED` status.

---

## 2. Logic Chain

- **Step 1 (From Observation 1)**: Because table creation and schema migration are managed via inline `CREATE TABLE IF NOT EXISTS` and runtime `PRAGMA table_info` inspect queries without checking `PRAGMA user_version` or logging applied version numbers in a `_migrations` tracking table, system schema upgrades cannot be transactional, audited, or reliably ordered across deployments.
  - *Conclusion for Component 1*: A zero-dependency `runMigrations(db)` module is required. It will use `PRAGMA user_version` and a `_migrations` tracking table to execute versioned, transactional SQL migration files sequentially.

- **Step 2 (From Observation 3 & 4)**: High-frequency operational tables (`candles`, `causal_events_log`, `cer_evidence`, scratch `experiment_trades`) accumulate thousands of rows daily without deletion triggers or pruning timers. While Zero Entropy rules require preserving `CHAMPION` and `ARCHIVED` experiment trades, operational telemetry and price history beyond active retention windows (90 days for candles, 30 days for causal events, 14 days for raw CER evidence) degrade SQLite WAL write latency and query performance if left un-pruned.
  - *Conclusion for Component 2*: An automated, batch-pruning TTL cleanup service (`runTTLCleanup(db)`) must be established to execute `DELETE ... LIMIT 5000` on indexed timestamp columns during low-traffic cycles, while explicitly exempting `CHAMPION` and `ARCHIVED` experiment trades.

- **Step 3 (From Observation 2)**: The `ConstitutionalLedger` logs permission tokens to `court_ledger`, but because `_initDatabase()` creates an isolated `causal_memory.db` connection and lacks a startup hydration routine, `this.entries` and `this.edgeRidingCounters` reset to empty/zero on process startup. Consequently, `ConstraintEngine` cannot enforce the hard limit `MAX_EDGE_RIDING_HITS` across process restarts.
  - *Conclusion for Component 3*: `ConstitutionalLedger` must be integrated with the main `db.js` instance (or shared `CausalMemoryDB`) and execute `loadFromDb()` during server initialization to rebuild `this.entries` and restore `edgeRidingCounters` from the `court_ledger` table.

---

## 3. Caveats

- **External SQLite Drivers**: Node environment uses `sqlite3` driver. In browser context (or pure frontend bundles), SQLite module falls back to in-memory mode. The proposed designs preserve this fallback safety check.
- **SQLite Batch Limit Syntax**: SQLite supports `DELETE FROM table WHERE ... LIMIT N` only when built with `SQLITE_ENABLE_UPDATE_DELETE_LIMIT`. The proposed TTL implementation includes subquery filtering (`WHERE id IN (SELECT id FROM ... LIMIT N)`) for universal SQLite compatibility across Node.js binary builds.

---

## 4. Conclusion

The SQLite modernization plan is fully designed and ready for implementation by the Worker agent. The deliverables consist of:
1. `runMigrations(db)`: Zero-dependency migration engine utilizing `PRAGMA user_version` and `_migrations` table to apply versioned migrations `v1` through `v4`.
2. `runTTLCleanup(db)`: Non-blocking batch TTL pruning service for `candles` (90d), `causal_events_log` (30d), `cer_evidence` (14d), and scratch `experiment_trades` (60d).
3. Durable `court_ledger`: Schema enhancement for `court_ledger` table and `loadFromDb()` startup hydration routine in `ConstitutionalLedger` to ensure Edge Riding counters survive server restarts.

Detailed design specs, schemas, and code implementations are documented in `E:\projcts\lyzer\.agents\explorer_m3_1\analysis.md`.

---

## 5. Verification Method

To verify the proposed designs upon implementation:
1. **Migration Verification**:
   - Run Node REPL or migration test script: Check that `PRAGMA user_version` returns `4` after boot and `SELECT * FROM _migrations` displays 4 applied rows.
   - Inspect table schemas using `PRAGMA table_info(court_ledger)` and `PRAGMA table_info(cer_evidence)`.
2. **TTL Verification**:
   - Insert dummy records into `candles` with `close_time` older than 90 days. Run `runTTLCleanup(db)` and verify the dummy records are deleted while recent candles and `CHAMPION` experiment trades remain untouched.
3. **Court Ledger Persistence Verification**:
   - Instantiate `ledger`, append 3 near-miss records so `drawdownNearMisses` equals 3.
   - Restart process / instantiate new `ConstitutionalLedger` and run `await ledger.loadFromDb()`.
   - Assert `ledger.getNearMissCount('drawdown') === 3` and `ledger.entries.length === 3`.

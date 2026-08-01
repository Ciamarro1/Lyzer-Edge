# Milestone 3 Exploration Synthesis — Database Schema Migrations & DB Lifecycle

## Overview
Explorer 7 completed a thorough investigation of `lyzer edge/backend/db.js`, `packages/lyzer-constitution/src/eca/ledger.js`, and surrounding SQLite data infrastructure across `E:\projcts\lyzer`.

## Core Findings & Architecture Design

1. **Zero-Dependency Schema Migration Engine (`runMigrations(db)`)**:
   - Uses `PRAGMA user_version` to track schema version.
   - Maintains a `_migrations` table logging `(version, name, executed_at)`.
   - Transactional execution of migration steps `v1` to `v4`:
     - `v1`: Baseline table creation (`candles`, `experiment_trades`, `causal_events_log`, etc.).
     - `v2`: Add missing snapshot columns (`equity_curve_json`, `drawdown_curve_json`, `monthly_returns_json`) and indices.
     - `v3`: Add `court_ledger` table for Constitutional Court ledger persistence.
     - `v4`: Add `cer_evidence` table for raw CER evidence streams.

2. **Automated Batch TTL Cleanup (`runTTLCleanup(db)`)**:
   - Periodic non-blocking background cleanup service running every 6 hours.
   - Batch deletion limit (`LIMIT 5000` via subquery `WHERE id IN (...)`) to avoid SQLite WAL lock escalation.
   - Retention Policies:
     - `candles`: 90-day retention (`close_time < datetime('now', '-90 days')`).
     - `causal_events_log`: 30-day retention (`created_at < datetime('now', '-30 days')`).
     - `cer_evidence`: 14-day retention (`timestamp < datetime('now', '-14 days')`).
     - `experiment_trades`: Scratch trades older than 60 days (`status NOT IN ('CHAMPION', 'ARCHIVED')`).
   - **Zero Entropy Compliance**: Strictly preserves all `CHAMPION` and `ARCHIVED` experiment trades.

3. **Constitutional Court Ledger Persistence**:
   - `court_ledger` SQLite schema: `(id, timestamp, action, payload_json, granted, reason, near_miss_type, created_at)`.
   - Updated `ConstitutionalLedger` in `packages/lyzer-constitution/src/eca/ledger.js`:
     - Connects directly to main DB connection or shared sqlite database.
     - Implements `loadFromDb()` startup hydration routine that populates `this.entries` and restores `edgeRidingCounters` (`drawdownNearMisses`, `slippageNearMisses`).
     - Prevents counter reset on server restart, ensuring `ConstraintEngine` enforces hard limits across restarts.

## Work Assignment for Worker 3
- Create `lyzer edge/backend/migrations.js` containing `runMigrations(db)` and `runTTLCleanup(db)`.
- Update `lyzer edge/backend/db.js` to execute `runMigrations(db)` on startup and export TTL cleanup trigger.
- Update `packages/lyzer-constitution/src/eca/ledger.js` to persist ledger entries to `court_ledger` and execute `loadFromDb()` on boot.
- Create unit tests in `lyzer edge/tests/unit/dbLifecycle.test.js`.

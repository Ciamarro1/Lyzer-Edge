/**
 * @fileoverview Database Schema Migrations & DB Lifecycle (Milestone 3)
 * Provides zero-dependency schema migration runner (v1-v4) using PRAGMA user_version
 * and automated batch TTL cleanup for high-volume SQLite tables.
 */

/**
 * Gets raw sqlite3 Database handle from passed CausalMemoryDB instance or raw sqlite3 Database.
 * @param {Object} db - CausalMemoryDB or sqlite3.Database
 * @returns {Object} raw sqlite3.Database handle
 */
function getRawDb(db) {
    if (!db) return null;
    return db.db ? db.db : db;
}

/**
 * Helper to run a SQL command returning a Promise.
 */
function runAsync(sqliteDb, sql, params = []) {
    return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

/**
 * Helper to fetch a single row returning a Promise.
 */
function getAsync(sqliteDb, sql, params = []) {
    return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Helper to fetch all rows returning a Promise.
 */
function allAsync(sqliteDb, sql, params = []) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Migration definitions v1 to v4.
 */
const MIGRATIONS = [
    {
        version: 1,
        name: 'v1_baseline_schema',
        up: async (sqliteDb) => {
            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    // candles table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS candles (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            symbol TEXT NOT NULL,
                            timeframe TEXT NOT NULL,
                            timestamp INTEGER NOT NULL,
                            open REAL NOT NULL,
                            high REAL NOT NULL,
                            low REAL NOT NULL,
                            close REAL NOT NULL,
                            volume REAL NOT NULL,
                            close_time INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_symbol_tf_ts ON candles (symbol, timeframe, timestamp)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_symbol_tf_close ON candles (symbol, timeframe, close_time)`);

                    // causal_events_log table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS causal_events_log (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            event_id TEXT NOT NULL UNIQUE,
                            timestamp INTEGER NOT NULL,
                            event_type TEXT NOT NULL,
                            source TEXT NOT NULL,
                            causation_id TEXT,
                            correlation_id TEXT NOT NULL,
                            intent_id TEXT,
                            parent_event TEXT,
                            version TEXT NOT NULL DEFAULT '1.0.0',
                            hash_prev TEXT NOT NULL,
                            epistemic_regime TEXT NOT NULL,
                            payload TEXT NOT NULL,
                            context TEXT NOT NULL,
                            hash TEXT NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_causal_ts ON causal_events_log (timestamp)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_causal_correlation ON causal_events_log (correlation_id)`);

                    // semantic_memory table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS semantic_memory (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            pattern_id TEXT NOT NULL UNIQUE,
                            pattern_type TEXT NOT NULL,
                            conditions_json TEXT NOT NULL,
                            observations_count INTEGER NOT NULL,
                            success_rate REAL NOT NULL,
                            avg_pnl REAL NOT NULL,
                            confidence_score REAL NOT NULL,
                            graph_edges_json TEXT NOT NULL,
                            version TEXT NOT NULL DEFAULT '1.0.0',
                            created_at INTEGER NOT NULL,
                            updated_at INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_semantic_pattern ON semantic_memory (pattern_id)`);

                    // parameter_versions table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS parameter_versions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            module TEXT NOT NULL,
                            parameter TEXT NOT NULL,
                            version TEXT NOT NULL UNIQUE,
                            value_json TEXT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'ACTIVE',
                            proposal_id TEXT NOT NULL,
                            approved_by TEXT NOT NULL DEFAULT 'ECA_COURT',
                            created_at INTEGER NOT NULL,
                            rollback_reason TEXT
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_param_ver ON parameter_versions (module, parameter, status)`);

                    // evolution_ledger table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS evolution_ledger (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            ledger_id TEXT NOT NULL UNIQUE,
                            event_type TEXT NOT NULL,
                            module TEXT NOT NULL,
                            parameter TEXT NOT NULL,
                            from_version TEXT,
                            to_version TEXT,
                            from_value_json TEXT,
                            to_value_json TEXT,
                            acs_score REAL,
                            ars_score REAL,
                            regime_stability_json TEXT,
                            impact_analysis_json TEXT,
                            reason TEXT NOT NULL,
                            proposal_id TEXT,
                            decided_by TEXT NOT NULL DEFAULT 'ECA_COURT',
                            observed_result_json TEXT,
                            created_at INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evo_module ON evolution_ledger (module, parameter)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_evo_type ON evolution_ledger (event_type)`);

                    // experiments table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS experiments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            experiment_id TEXT NOT NULL UNIQUE,
                            display_name TEXT,
                            status TEXT NOT NULL DEFAULT 'ACTIVE',
                            strategy_hash TEXT NOT NULL,
                            config_snapshot_json TEXT NOT NULL,
                            model_snapshot_json TEXT,
                            champion_flag INTEGER NOT NULL DEFAULT 0,
                            created_at INTEGER NOT NULL,
                            frozen_at INTEGER,
                            frozen_by TEXT,
                            notes TEXT,
                            parent_experiment_id TEXT
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_status ON experiments (status)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_champion ON experiments (champion_flag)`);

                    // experiment_trades table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS experiment_trades (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            trade_id TEXT NOT NULL,
                            experiment_id TEXT NOT NULL,
                            symbol TEXT NOT NULL,
                            direction TEXT NOT NULL,
                            entry_price REAL NOT NULL,
                            exit_price REAL,
                            stop_loss REAL,
                            take_profit REAL,
                            quantity REAL,
                            pnl REAL,
                            pnl_pct REAL,
                            status TEXT NOT NULL DEFAULT 'open',
                            signal_json TEXT,
                            regime TEXT,
                            governance_decision TEXT,
                            reason_codes_json TEXT,
                            ev_json TEXT,
                            entry_timestamp INTEGER NOT NULL,
                            exit_timestamp INTEGER,
                            created_at INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_exp ON experiment_trades (experiment_id)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_symbol ON experiment_trades (experiment_id, symbol)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_status ON experiment_trades (experiment_id, status)`);

                    // experiment_snapshots table
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS experiment_snapshots (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            experiment_id TEXT NOT NULL UNIQUE,
                            total_trades INTEGER NOT NULL DEFAULT 0,
                            winning_trades INTEGER NOT NULL DEFAULT 0,
                            losing_trades INTEGER NOT NULL DEFAULT 0,
                            win_rate REAL NOT NULL DEFAULT 0,
                            profit_factor REAL NOT NULL DEFAULT 0,
                            total_pnl REAL NOT NULL DEFAULT 0,
                            total_pnl_pct REAL NOT NULL DEFAULT 0,
                            max_drawdown REAL NOT NULL DEFAULT 0,
                            max_drawdown_pct REAL NOT NULL DEFAULT 0,
                            sharpe_ratio REAL NOT NULL DEFAULT 0,
                            avg_trade_pnl REAL NOT NULL DEFAULT 0,
                            best_trade_pnl REAL NOT NULL DEFAULT 0,
                            worst_trade_pnl REAL NOT NULL DEFAULT 0,
                            avg_holding_time_ms INTEGER NOT NULL DEFAULT 0,
                            equity_curve_json TEXT,
                            drawdown_curve_json TEXT,
                            monthly_returns_json TEXT,
                            snapshot_timestamp INTEGER NOT NULL
                        )
                    `, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    },
    {
        version: 2,
        name: 'v2_snapshot_meta_columns',
        up: async (sqliteDb) => {
            const columns = await allAsync(sqliteDb, `PRAGMA table_info(experiment_snapshots)`);
            const existingColumns = new Set((columns || []).map(c => c.name));
            const snapshotMetaColumns = {
                metrics_json: 'TEXT',
                market_snapshot_json: 'TEXT',
                alpha_score: 'REAL NOT NULL DEFAULT 0',
                reason_for_snapshot: 'TEXT',
                equity_curve_json: 'TEXT',
                drawdown_curve_json: 'TEXT',
                monthly_returns_json: 'TEXT'
            };

            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    for (const [colName, colDef] of Object.entries(snapshotMetaColumns)) {
                        if (!existingColumns.has(colName)) {
                            sqliteDb.run(`ALTER TABLE experiment_snapshots ADD COLUMN ${colName} ${colDef}`);
                        }
                    }
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_snap_alpha ON experiment_snapshots (alpha_score)`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    },
    {
        version: 3,
        name: 'v3_court_ledger_table',
        up: async (sqliteDb) => {
            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS court_ledger (
                            id TEXT PRIMARY KEY,
                            timestamp INTEGER NOT NULL,
                            action TEXT,
                            verdict TEXT,
                            reason TEXT,
                            token_id TEXT,
                            request_json TEXT,
                            payload_json TEXT,
                            state_json TEXT,
                            granted INTEGER,
                            near_miss_type TEXT,
                            created_at INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_court_ts ON court_ledger (timestamp)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_court_granted ON court_ledger (granted)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_court_near_miss ON court_ledger (near_miss_type)`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    },
    {
        version: 4,
        name: 'v4_cer_evidence_table',
        up: async (sqliteDb) => {
            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS cer_evidence (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            evidence_id TEXT UNIQUE,
                            timestamp INTEGER NOT NULL,
                            source TEXT NOT NULL,
                            evidence_type TEXT NOT NULL,
                            data_json TEXT NOT NULL,
                            hash TEXT,
                            created_at INTEGER NOT NULL
                        )
                    `);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_cer_ts ON cer_evidence (timestamp)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_cer_source ON cer_evidence (source)`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    },
    {
        version: 5,
        name: 'v5_experiment_trades_primary_key_uuid',
        up: async (sqliteDb) => {
            return new Promise((resolve, reject) => {
                sqliteDb.serialize(() => {
                    // 1. Create target table with trade_id as PRIMARY KEY NOT NULL
                    sqliteDb.run(`
                        CREATE TABLE IF NOT EXISTS experiment_trades_v5 (
                            trade_id TEXT PRIMARY KEY NOT NULL,
                            experiment_id TEXT NOT NULL DEFAULT 'EXP-001',
                            symbol TEXT,
                            direction TEXT,
                            entry_price REAL,
                            exit_price REAL,
                            stop_loss REAL,
                            take_profit REAL,
                            quantity REAL,
                            pnl REAL,
                            pnl_pct REAL,
                            status TEXT NOT NULL DEFAULT 'open',
                            signal_json TEXT,
                            regime TEXT,
                            governance_decision TEXT,
                            reason_codes_json TEXT,
                            ev_json TEXT,
                            entry_timestamp INTEGER,
                            exit_timestamp INTEGER,
                            created_at INTEGER
                        )
                    `);

                    // 2. Migrate existing records with deduplication (latest record wins via ORDER BY id ASC + INSERT OR REPLACE)
                    sqliteDb.run(`
                        INSERT OR REPLACE INTO experiment_trades_v5 (
                            trade_id, experiment_id, symbol, direction, entry_price, exit_price,
                            stop_loss, take_profit, quantity, pnl, pnl_pct, status, signal_json,
                            regime, governance_decision, reason_codes_json, ev_json, entry_timestamp,
                            exit_timestamp, created_at
                        )
                        SELECT
                            COALESCE(NULLIF(trade_id, ''), 'LEGACY_' || id),
                            COALESCE(experiment_id, 'EXP-001'),
                            COALESCE(symbol, 'UNKNOWN'),
                            COALESCE(direction, 'LONG'),
                            COALESCE(entry_price, 0.0),
                            exit_price,
                            stop_loss,
                            take_profit,
                            quantity,
                            pnl,
                            pnl_pct,
                            COALESCE(status, 'open'),
                            signal_json,
                            regime,
                            governance_decision,
                            reason_codes_json,
                            ev_json,
                            COALESCE(entry_timestamp, created_at, 0),
                            exit_timestamp,
                            COALESCE(created_at, entry_timestamp, 0)
                        FROM experiment_trades
                        ORDER BY id ASC
                    `, (err) => {
                        if (err && !err.message.includes('no such table')) {
                            console.error('[Migrations] v5 copy error:', err);
                        }
                    });

                    // 3. Drop legacy table and rename experiment_trades_v5 to experiment_trades
                    sqliteDb.run(`DROP TABLE IF EXISTS experiment_trades`);
                    sqliteDb.run(`ALTER TABLE experiment_trades_v5 RENAME TO experiment_trades`);

                    // 4. Recreate indices
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_exp ON experiment_trades (experiment_id)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_symbol ON experiment_trades (experiment_id, symbol)`);
                    sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_status ON experiment_trades (experiment_id, status)`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        }
    }
];

/**
 * Runs zero-dependency transactional migration runner checking PRAGMA user_version.
 * @param {Object} db - CausalMemoryDB or sqlite3.Database handle
 * @returns {Promise<{currentVersion: number, appliedCount: number}>}
 */
export async function runMigrations(db) {
    const sqliteDb = getRawDb(db);
    if (!sqliteDb) {
        throw new Error('[Migrations] Invalid database instance provided.');
    }

    // Ensure _migrations table exists
    await runAsync(sqliteDb, `
        CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            executed_at INTEGER NOT NULL
        )
    `);

    // Get current PRAGMA user_version
    const versionRow = await getAsync(sqliteDb, `PRAGMA user_version;`);
    let currentVersion = versionRow ? (versionRow.user_version || 0) : 0;
    let appliedCount = 0;

    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            await runAsync(sqliteDb, `BEGIN TRANSACTION;`);
            try {
                await migration.up(sqliteDb);
                const now = Date.now();
                await runAsync(sqliteDb, `
                    INSERT OR REPLACE INTO _migrations (version, name, executed_at) VALUES (?, ?, ?)
                `, [migration.version, migration.name, now]);
                await runAsync(sqliteDb, `PRAGMA user_version = ${migration.version};`);
                await runAsync(sqliteDb, `COMMIT;`);
                currentVersion = migration.version;
                appliedCount++;
            } catch (err) {
                console.error(`[Migrations] Error executing migration v${migration.version}:`, err);
                try {
                    await runAsync(sqliteDb, `ROLLBACK;`);
                } catch (rollbackErr) {
                    console.error('[Migrations] Rollback error:', rollbackErr);
                }
                throw err;
            }
        }
    }

    return { currentVersion, appliedCount };
}

/**
 * Batch pruning TTL cleanup function (LIMIT 5000 per batch)
 * @param {Object} db - CausalMemoryDB or sqlite3.Database handle
 * @param {Object} options - Custom cutoff options if needed
 * @returns {Promise<{deleted: {candles: number, causal_events_log: number, cer_evidence: number, experiment_trades: number}}>}
 */
export async function runTTLCleanup(db, options = {}) {
    const sqliteDb = getRawDb(db);
    if (!sqliteDb) {
        throw new Error('[TTLCleanup] Invalid database instance provided.');
    }

    const now = options.now || Date.now();
    const batchLimit = options.batchLimit || 5000;

    const stats = {
        deleted: {
            candles: 0,
            causal_events_log: 0,
            cer_evidence: 0,
            experiment_trades: 0
        }
    };

    // 1. candles: 90-day retention
    const cutoff90d = now - (90 * 24 * 60 * 60 * 1000);
    while (true) {
        const res = await runAsync(sqliteDb, `
            DELETE FROM candles WHERE id IN (
                SELECT id FROM candles WHERE close_time < ? OR timestamp < ? LIMIT ${batchLimit}
            )
        `, [cutoff90d, cutoff90d]);
        const count = res.changes || 0;
        stats.deleted.candles += count;
        if (count < batchLimit) break;
    }

    // 2. causal_events_log: 30-day retention
    const cutoff30d = now - (30 * 24 * 60 * 60 * 1000);
    while (true) {
        const res = await runAsync(sqliteDb, `
            DELETE FROM causal_events_log WHERE id IN (
                SELECT id FROM causal_events_log WHERE timestamp < ? LIMIT ${batchLimit}
            )
        `, [cutoff30d]);
        const count = res.changes || 0;
        stats.deleted.causal_events_log += count;
        if (count < batchLimit) break;
    }

    // 3. cer_evidence: 14-day retention
    const cutoff14d = now - (14 * 24 * 60 * 60 * 1000);
    while (true) {
        const res = await runAsync(sqliteDb, `
            DELETE FROM cer_evidence WHERE id IN (
                SELECT id FROM cer_evidence WHERE timestamp < ? OR created_at < ? LIMIT ${batchLimit}
            )
        `, [cutoff14d, cutoff14d]);
        const count = res.changes || 0;
        stats.deleted.cer_evidence += count;
        if (count < batchLimit) break;
    }

    // 4. scratch experiment_trades: 60-day retention (preserving CHAMPION & ARCHIVED)
    const cutoff60d = now - (60 * 24 * 60 * 60 * 1000);
    while (true) {
        const res = await runAsync(sqliteDb, `
            DELETE FROM experiment_trades WHERE trade_id IN (
                SELECT trade_id FROM experiment_trades
                WHERE (created_at < ? OR entry_timestamp < ?)
                  AND status NOT IN ('CHAMPION', 'ARCHIVED')
                  AND experiment_id NOT IN (
                      SELECT experiment_id FROM experiments WHERE champion_flag = 1 OR status = 'ARCHIVED'
                  )
                LIMIT ${batchLimit}
            )
        `, [cutoff60d, cutoff60d]);
        const count = res.changes || 0;
        stats.deleted.experiment_trades += count;
        if (count < batchLimit) break;
    }

    return stats;
}

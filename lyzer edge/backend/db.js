import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { recordSqliteWrite } from '../src/observability/index.js';

// Use /tmp/data which is always writable in containerized environments
const DATA_DIR = process.env.DATA_DIR || '/tmp/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'historical_causal_memory.db');

let sharedInstance = null;

export class CausalMemoryDB {
    constructor(customDbPath = null) {
        if (!customDbPath && sharedInstance) {
            return sharedInstance;
        }
        const targetPath = customDbPath || DEFAULT_DB_PATH;
        this.db = new sqlite3.Database(targetPath, (err) => {
            if (err) {
                console.error('[DB] Error opening database:', err);
            } else {
                console.log(`[DB] Connected to SQLite Causal Memory Database (${targetPath}).`);
            }
        });
        this.init();
        if (!customDbPath) {
            sharedInstance = this;
        }
    }

    init() {
        this.db.serialize(() => {
            // Institutional WAL Mode Pragmas Tuning
            this.db.run(`PRAGMA journal_mode = WAL;`);
            this.db.run(`PRAGMA synchronous = NORMAL;`);
            this.db.run(`PRAGMA busy_timeout = 5000;`);
            this.db.run(`PRAGMA temp_store = MEMORY;`);
            this.db.run(`PRAGMA cache_size = -64000;`); // 64MB Page Cache
            this.db.run(`PRAGMA mmap_size = 30000000000;`); // Memory Mapped I/O
            this.db.run(`PRAGMA wal_autocheckpoint = 1000;`);

            // Create the candles table with indexed symbol, timeframe, and timestamp for fast lookups
            this.db.run(`
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

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_symbol_tf_ts ON candles (symbol, timeframe, timestamp)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_symbol_tf_close ON candles (symbol, timeframe, close_time)`);

            // Create causal_events_log table (ADR-007 / ADR-008)
            this.db.run(`
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

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_causal_ts ON causal_events_log (timestamp)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_causal_correlation ON causal_events_log (correlation_id)`);

            // Create semantic_memory table (ADR-012)
            this.db.run(`
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

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_semantic_pattern ON semantic_memory (pattern_id)`);

            // Create parameter_versions table (ADR-016)
            this.db.run(`
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

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_param_ver ON parameter_versions (module, parameter, status)`);

            // Create evolution_ledger table (ADR-019)
            this.db.run(`
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

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_evo_module ON evolution_ledger (module, parameter)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_evo_type ON evolution_ledger (event_type)`);
        });
    }

    insertParameterVersion(paramVersion) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO parameter_versions
                (module, parameter, version, value_json, status, proposal_id, approved_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const now = Date.now();
            const params = [
                paramVersion.module,
                paramVersion.parameter,
                paramVersion.version,
                JSON.stringify(paramVersion.value),
                paramVersion.status || 'ACTIVE',
                paramVersion.proposal_id || 'manual',
                paramVersion.approved_by || 'ECA_COURT',
                now
            ];

            this.db.serialize(() => {
                this.db.run(sql, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    getActiveParameterVersion(moduleName, parameterName) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM parameter_versions WHERE module = ? AND parameter = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [moduleName, parameterName], (err, row) => {
                if (err) reject(err);
                else resolve(row ? { ...row, value: JSON.parse(row.value_json) } : null);
            });
        });
    }

    rollbackParameterVersion(version, reason) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const sql1 = `UPDATE parameter_versions SET status = 'ROLLED_BACK', rollback_reason = ? WHERE version = ?`;
                this.db.run(sql1, [reason || 'MANUAL_ROLLBACK', version], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    insertEvolutionLedgerEntry(entry) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO evolution_ledger
                (ledger_id, event_type, module, parameter, from_version, to_version, from_value_json, to_value_json,
                 acs_score, ars_score, regime_stability_json, impact_analysis_json, reason, proposal_id, decided_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                entry.ledger_id,
                entry.event_type,
                entry.module,
                entry.parameter,
                entry.from_version || null,
                entry.to_version || null,
                entry.from_value !== null && entry.from_value !== undefined ? JSON.stringify(entry.from_value) : null,
                entry.to_value !== null && entry.to_value !== undefined ? JSON.stringify(entry.to_value) : null,
                entry.acs_score || null,
                entry.ars_score || null,
                entry.regime_stability ? JSON.stringify(entry.regime_stability) : null,
                entry.impact_analysis ? JSON.stringify(entry.impact_analysis) : null,
                entry.reason,
                entry.proposal_id || null,
                entry.decided_by || 'ECA_COURT',
                entry.created_at || Date.now()
            ];

            this.db.serialize(() => {
                this.db.run(sql, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    updateEvolutionLedgerResult(ledgerId, observedResult) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE evolution_ledger SET observed_result_json = ? WHERE ledger_id = ?`;
            this.db.run(sql, [JSON.stringify(observedResult), ledgerId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getEvolutionLedgerEntries(module, parameter) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM evolution_ledger WHERE module = ? AND parameter = ? ORDER BY created_at ASC`;
            this.db.all(sql, [module, parameter], (err, rows) => {
                if (err) reject(err);
                else resolve((rows || []).map(this._parseEvolutionRow));
            });
        });
    }

    getAllEvolutionLedgerEntries() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM evolution_ledger ORDER BY created_at ASC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve((rows || []).map(this._parseEvolutionRow));
            });
        });
    }

    _parseEvolutionRow(row) {
        return {
            ...row,
            from_value: row.from_value_json ? JSON.parse(row.from_value_json) : null,
            to_value: row.to_value_json ? JSON.parse(row.to_value_json) : null,
            regime_stability: row.regime_stability_json ? JSON.parse(row.regime_stability_json) : null,
            impact_analysis: row.impact_analysis_json ? JSON.parse(row.impact_analysis_json) : null,
            observed_result: row.observed_result_json ? JSON.parse(row.observed_result_json) : null
        };
    }

    insertSemanticPattern(pattern) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO semantic_memory
                (pattern_id, pattern_type, conditions_json, observations_count, success_rate, avg_pnl, confidence_score, graph_edges_json, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(pattern_id) DO UPDATE SET
                    observations_count = excluded.observations_count,
                    success_rate = excluded.success_rate,
                    avg_pnl = excluded.avg_pnl,
                    confidence_score = excluded.confidence_score,
                    graph_edges_json = excluded.graph_edges_json,
                    version = excluded.version,
                    updated_at = excluded.updated_at
            `;
            const now = Date.now();
            const params = [
                pattern.pattern_id,
                pattern.pattern_type || 'SEMANTIC_PATTERN',
                JSON.stringify(pattern.conditions || {}),
                pattern.observations_count || 0,
                pattern.success_rate || 0.0,
                pattern.avg_pnl || 0.0,
                pattern.confidence_score || 0.0,
                JSON.stringify(pattern.graph_edges || []),
                pattern.version || '1.0.0',
                now,
                now
            ];

            this.db.serialize(() => {
                this.db.run(sql, params, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    getSemanticPatterns() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM semantic_memory ORDER BY confidence_score DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    conditions: JSON.parse(r.conditions_json),
                    graph_edges: JSON.parse(r.graph_edges_json)
                })));
            });
        });
    }

    walCheckpoint(mode = 'PASSIVE') {
        return new Promise((resolve, reject) => {
            this.db.run(`PRAGMA wal_checkpoint(${mode});`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    insertCausalEvent(event) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            const sql = `
                INSERT INTO causal_events_log 
                (event_id, timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, version, hash_prev, epistemic_regime, payload, context, hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                event.event_id,
                event.timestamp,
                event.event_type,
                event.source,
                event.causation_id || null,
                event.correlation_id,
                event.intent_id || null,
                event.parent_event || null,
                event.version || '1.0.0',
                event.hash_prev,
                event.epistemic_regime || 'REGIME_A_CONSENSUS',
                JSON.stringify(event.payload || {}),
                JSON.stringify(event.context || {}),
                event.hash
            ];

            this.db.serialize(() => {
                this.db.run(sql, params, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        recordSqliteWrite('insert_causal_event', (performance.now() - startTime) / 1000);
                        resolve();
                    }
                });
            });
        });
    }

    getLastCausalEventHash() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT hash FROM causal_events_log ORDER BY id DESC LIMIT 1`;
            this.db.serialize(() => {
                this.db.get(sql, [], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.hash : '0'.repeat(64));
                });
            });
        });
    }

    getCausalEventsUntil(timestampMs) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM causal_events_log WHERE timestamp <= ? ORDER BY id ASC`;
            this.db.all(sql, [timestampMs], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    payload: JSON.parse(r.payload),
                    context: JSON.parse(r.context)
                })));
            });
        });
    }

    getCausalEventsByCorrelation(correlationId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM causal_events_log WHERE correlation_id = ? ORDER BY id ASC`;
            this.db.all(sql, [correlationId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    payload: JSON.parse(r.payload),
                    context: JSON.parse(r.context)
                })));
            });
        });
    }

    // Insert multiple candles inside a transaction for massive performance gain
    insertBatch(symbol, timeframe, candles) {
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                const stmt = this.db.prepare(`INSERT INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume, close_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                
                for (let i = 0; i < candles.length; i++) {
                    const c = candles[i];
                    stmt.run(symbol, timeframe, c.t, c.o, c.h, c.l, c.c, c.v, c.T);
                }
                
                stmt.finalize();
                this.db.run("COMMIT", (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        recordSqliteWrite('insert_batch', (performance.now() - startTime) / 1000);
                        resolve();
                    }
                });
            });
        });
    }

    // Get the most recent N candles that are strictly closed before or exactly at currentMs
    getVisibleHistory(symbol, timeframe, currentMs, limit) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT timestamp as t, open as o, high as h, low as l, close as c, volume as v, close_time as T
                FROM candles 
                WHERE symbol = ? AND timeframe = ? AND close_time <= ?
                ORDER BY close_time DESC 
                LIMIT ?
            `;
            this.db.all(query, [symbol, timeframe, currentMs, limit], (err, rows) => {
                if (err) reject(err);
                // Return in chronological order
                else resolve(rows.reverse()); 
            });
        });
    }
    
    close() {
        this.db.close();
    }
}

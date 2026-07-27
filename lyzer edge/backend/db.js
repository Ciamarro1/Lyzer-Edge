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

            // ── Quant Research Lab: Experiment Registry (Zero Entropy) ──
            this.db.run(`
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
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_exp_status ON experiments (status)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_exp_champion ON experiments (champion_flag)`);

            // ── Quant Research Lab: Experiment Trades (immutable, append-only) ──
            this.db.run(`
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
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_exp ON experiment_trades (experiment_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_symbol ON experiment_trades (experiment_id, symbol)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_exp_trades_status ON experiment_trades (experiment_id, status)`);

            // ── Quant Research Lab: Experiment Snapshots (frozen metrics) ──
            this.db.run(`
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
            `);
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
    
    // ── Quant Research Lab: Experiment Lifecycle Methods ──────────────

    getNextExperimentId() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT experiment_id FROM experiments WHERE experiment_id LIKE 'EXP-%' ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve('EXP-001');
                const match = row.experiment_id.match(/EXP-(\d+)/);
                if (!match) return resolve('EXP-001');
                const next = parseInt(match[1], 10) + 1;
                resolve(`EXP-${String(next).padStart(3, '0')}`);
                });
        });
    }

    createExperiment({ experiment_id, display_name, status, strategy_hash, config_snapshot_json, model_snapshot_json, champion_flag, created_at, parent_experiment_id }) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO experiments
                (experiment_id, display_name, status, strategy_hash, config_snapshot_json, model_snapshot_json, champion_flag, created_at, parent_experiment_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [
                experiment_id,
                display_name || null,
                status || 'ACTIVE',
                strategy_hash,
                config_snapshot_json,
                model_snapshot_json || null,
                champion_flag || 0,
                created_at || Date.now(),
                parent_experiment_id || null
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getActiveExperiment() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    getExperiment(experimentId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE experiment_id = ?`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    getAllExperiments() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments ORDER BY id DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    freezeExperiment(experimentId, frozenAt, frozenBy = 'USER') {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE experiments SET status = 'LEGACY', frozen_at = ?, frozen_by = ? WHERE experiment_id = ? AND status = 'ACTIVE'`;
            this.db.run(sql, [frozenAt || Date.now(), frozenBy, experimentId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    insertExperimentTrade(experimentId, trade) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO experiment_trades
                (trade_id, experiment_id, symbol, direction, entry_price, exit_price, stop_loss, take_profit,
                 quantity, pnl, pnl_pct, status, signal_json, regime, governance_decision,
                 reason_codes_json, ev_json, entry_timestamp, exit_timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [
                trade.trade_id || trade.id,
                experimentId,
                trade.symbol,
                trade.direction,
                trade.entryPrice || trade.entry_price,
                trade.exitPrice || trade.exit_price || null,
                trade.stopLoss || trade.stop_loss || null,
                trade.takeProfit || trade.take_profit || null,
                trade.quantity || null,
                trade.pnl || null,
                trade.pnl != null ? trade.pnl * 100 : null,
                trade.status || 'open',
                trade.signal ? JSON.stringify(trade.signal) : null,
                trade.regime || null,
                trade.governanceDecision || trade.governance_decision || null,
                trade.reasonCodes ? JSON.stringify(trade.reasonCodes) : (trade.reason_codes_json || null),
                trade.ev ? JSON.stringify(trade.ev) : (trade.ev_json || null),
                trade.timestamp || trade.entry_timestamp || Date.now(),
                trade.exit_timestamp || null,
                Date.now()
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    updateExperimentTrade(tradeId, experimentId, updateData) {
        return new Promise((resolve, reject) => {
            const sets = [];
            const params = [];
            if (updateData.exit_price !== undefined) { sets.push('exit_price = ?'); params.push(updateData.exit_price); }
            if (updateData.pnl !== undefined) { sets.push('pnl = ?'); params.push(updateData.pnl); sets.push('pnl_pct = ?'); params.push(updateData.pnl * 100); }
            if (updateData.status !== undefined) { sets.push('status = ?'); params.push(updateData.status); }
            if (updateData.exit_timestamp !== undefined) { sets.push('exit_timestamp = ?'); params.push(updateData.exit_timestamp); }
            if (updateData.reason_codes_json !== undefined) { sets.push('reason_codes_json = ?'); params.push(updateData.reason_codes_json); }
            if (updateData.ev_json !== undefined) { sets.push('ev_json = ?'); params.push(updateData.ev_json); }

            if (sets.length === 0) return resolve();

            params.push(tradeId, experimentId);
            const sql = `UPDATE experiment_trades SET ${sets.join(', ')} WHERE trade_id = ? AND experiment_id = ?`;
            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getExperimentTrades(experimentId, opts = {}) {
        return new Promise((resolve, reject) => {
            const limit = opts.limit || 10000;
            const offset = opts.offset || 0;
            const sql = `SELECT * FROM experiment_trades WHERE experiment_id = ? ORDER BY entry_timestamp ASC LIMIT ? OFFSET ?`;
            this.db.all(sql, [experimentId, limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    getExperimentTradeCount(experimentId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) as count FROM experiment_trades WHERE experiment_id = ? AND status = 'closed'`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    }

    insertExperimentSnapshot(snapshot) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO experiment_snapshots
                (experiment_id, total_trades, winning_trades, losing_trades, win_rate, profit_factor,
                 total_pnl, total_pnl_pct, max_drawdown, max_drawdown_pct, sharpe_ratio,
                 avg_trade_pnl, best_trade_pnl, worst_trade_pnl, avg_holding_time_ms,
                 equity_curve_json, drawdown_curve_json, monthly_returns_json, snapshot_timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            this.db.run(sql, [
                snapshot.experiment_id,
                snapshot.totalTrades || 0,
                snapshot.winningTrades || 0,
                snapshot.losingTrades || 0,
                snapshot.winRate || 0,
                snapshot.profitFactor || 0,
                snapshot.totalPnl || 0,
                snapshot.totalPnlPct || 0,
                snapshot.maxDrawdown || 0,
                snapshot.maxDrawdownPct || 0,
                snapshot.sharpeRatio || 0,
                snapshot.avgTradePnl || 0,
                snapshot.bestTradePnl || 0,
                snapshot.worstTradePnl || 0,
                snapshot.avgHoldingTimeMs || 0,
                snapshot.equityCurve ? JSON.stringify(snapshot.equityCurve) : null,
                snapshot.drawdownCurve ? JSON.stringify(snapshot.drawdownCurve) : null,
                snapshot.monthlyReturns ? JSON.stringify(snapshot.monthlyReturns) : null,
                snapshot.snapshot_timestamp || Date.now()
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    getExperimentSnapshot(experimentId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiment_snapshots WHERE experiment_id = ?`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? {
                    ...row,
                    equityCurve: row.equity_curve_json ? JSON.parse(row.equity_curve_json) : null,
                    drawdownCurve: row.drawdown_curve_json ? JSON.parse(row.drawdown_curve_json) : null,
                    monthlyReturns: row.monthly_returns_json ? JSON.parse(row.monthly_returns_json) : null
                } : null);
            });
        });
    }

    setChampion(experimentId) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`UPDATE experiments SET champion_flag = 0 WHERE champion_flag = 1`, (err) => {
                    if (err) return reject(err);
                });
                this.db.run(`UPDATE experiments SET champion_flag = 1 WHERE experiment_id = ?`, [experimentId], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    getChampion() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE champion_flag = 1 LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    getExperimentRanking(sortBy = 'profit_factor', limit = 20) {
        return new Promise((resolve, reject) => {
            const validColumns = ['profit_factor', 'sharpe_ratio', 'win_rate', 'total_pnl_pct', 'total_trades'];
            const col = validColumns.includes(sortBy) ? sortBy : 'profit_factor';
            const sql = `
                SELECT e.*, s.*
                FROM experiments e
                JOIN experiment_snapshots s ON e.experiment_id = s.experiment_id
                WHERE e.status != 'ACTIVE'
                ORDER BY s.${col} DESC
                LIMIT ?
            `;
            this.db.all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

}

export const db = new CausalMemoryDB();
export default db;


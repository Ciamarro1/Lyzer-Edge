import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { recordSqliteWrite } from '../src/observability/index.js';

// Use /tmp/data which is always writable in containerized environments
const DATA_DIR = process.env.DATA_DIR || '/tmp/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'historical_causal_memory.db');

export class CausalMemoryDB {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('[DB] Error opening database:', err);
            } else {
                console.log('[DB] Connected to SQLite Causal Memory Database (WAL Mode).');
            }
        });
        this.init();
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

            this.db.run(sql, params, (err) => {
                if (err) {
                    reject(err);
                } else {
                    recordSqliteWrite('insert_causal_event', (performance.now() - startTime) / 1000);
                    resolve();
                }
            });
        });
    }

    getLastCausalEventHash() {
        return new Promise((resolve, reject) => {
            const sql = `SELECT hash FROM causal_events_log ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.hash : '0'.repeat(64));
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

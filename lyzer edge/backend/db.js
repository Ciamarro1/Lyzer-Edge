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

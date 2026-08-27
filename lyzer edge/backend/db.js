import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { recordSqliteWrite, recordSqliteLockWait, recordSystemError } from '../src/observability/index.js';
import { safeJsonParse, safeJsonStringify } from './utils/safeJson.js';
import { runMigrations, runTTLCleanup } from './migrations.js';
import { generateUUIDv7 } from '../src/causal-memory/EventFactory.js';
import { computeCausalHash, GENESIS_PREV_HASH } from '../src/causal-memory/causalCrypto.js';

// Use /tmp/data which is always writable in containerized environments
const DATA_DIR = process.env.DATA_DIR || '/tmp/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DEFAULT_DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'historical_causal_memory.db');

let sharedInstance = null;

export class CausalMemoryDB {
    constructor(customDbPath = null, options = {}) {
        if (!customDbPath && sharedInstance) {
            return sharedInstance;
        }
        this.targetPath = customDbPath || DEFAULT_DB_PATH;
        this.options = options;

        // In-memory buffer for async causal batching (R2)
        this._causalBuffer = [];
        this._causalBatchSize = options.batchSize || parseInt(process.env.CAUSAL_BATCH_SIZE, 10) || 50;
        this._causalFlushIntervalMs = options.flushIntervalMs || parseInt(process.env.CAUSAL_FLUSH_INTERVAL_MS, 10) || 100;
        this._causalFlushTimer = null;
        this._isFlushing = false;
        this._flushPromise = null;

        // Atomic in-memory causal hash pointer for zero WAL contention
        this._lastInMemoryHash = null;
        this._lastHashInitPromise = null;

        this.init();
        this.startCausalFlushTimer();
        if (!customDbPath) {
            sharedInstance = this;
        }
    }

    _initConnection() {
        this.db = new sqlite3.Database(this.targetPath, (err) => {
            if (err) {
                console.error(`[DB] Error opening database at ${this.targetPath}:`, err.message);
            } else {
                console.log(`[DB] Connected to SQLite Causal Memory Database (${this.targetPath}).`);
            }
        });

        // Prevent unhandled error events from crashing Node.js process
        this.db.on('error', (err) => {
            recordSystemError('CausalMemoryDB', 'SQLITE_EMITTED_ERROR');
            console.error('[DB] SQLite event error captured:', err.message);
        });

        // Instrument queries for Lock Wait Latency Tracking & Safe Error Handling
        const wrapMethod = (methodName) => {
            const orig = this.db[methodName];
            this.db[methodName] = (...args) => {
                const startTime = performance.now();
                const lastArg = args[args.length - 1];
                if (typeof lastArg === 'function') {
                    args[args.length - 1] = function(...cbArgs) {
                        const durationSec = (performance.now() - startTime) / 1000;
                        recordSqliteLockWait('causal_memory', durationSec);
                        const cbErr = cbArgs[0];
                        if (cbErr && (cbErr.message?.includes('SQLITE_CORRUPT') || cbErr.code === 'SQLITE_CORRUPT')) {
                            recordSystemError('CausalMemoryDB', 'SQLITE_CORRUPT_DETECTED');
                            console.error('[DB] CRITICAL: SQLite disk image malformed during query:', cbErr.message);
                        }
                        return lastArg.apply(this, cbArgs);
                    };
                }
                return orig.apply(this.db, args);
            };
        };
        wrapMethod('run');
        wrapMethod('get');
        wrapMethod('all');
    }

    async _quarantineAndRecreate(reason = 'CORRUPTION_DETECTED') {
        console.warn(`🛡️ [DB RESILIENCE] Initiating quarantine & self-healing for ${this.targetPath} (Reason: ${reason})...`);
        await new Promise((resolve) => {
            if (this.db) {
                this.db.close(() => resolve());
            } else {
                resolve();
            }
        });

        const timestamp = Date.now();
        const quarantinePrefix = `${this.targetPath}.corrupted.${timestamp}`;

        for (const ext of ['', '-wal', '-shm']) {
            const src = `${this.targetPath}${ext}`;
            if (fs.existsSync(src)) {
                try {
                    fs.renameSync(src, `${quarantinePrefix}${ext}`);
                    console.log(`🛡️ [DB RESILIENCE] Quarantined ${src} -> ${quarantinePrefix}${ext}`);
                } catch (e) {
                    console.warn(`⚠️ [DB RESILIENCE] Could not rename ${src}, unlinking:`, e.message);
                    try { fs.unlinkSync(src); } catch (_) {}
                }
            }
        }

        // Look for bundled clean seed if available
        const seedCandidates = [
            path.join(process.cwd(), 'historical_causal_memory.db'),
            path.join(process.cwd(), 'lyzer edge', 'historical_causal_memory.db'),
            path.join(DATA_DIR, 'historical_causal_memory.db.seed')
        ];

        let restoredFromSeed = false;
        for (const seedPath of seedCandidates) {
            if (fs.existsSync(seedPath) && seedPath !== this.targetPath) {
                try {
                    const stats = fs.statSync(seedPath);
                    if (stats.size > 0) {
                        fs.copyFileSync(seedPath, this.targetPath);
                        console.log(`🌱 [DB RESILIENCE] Restored clean Causal Memory seed from ${seedPath}`);
                        restoredFromSeed = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`⚠️ [DB RESILIENCE] Failed to copy seed from ${seedPath}:`, err.message);
                }
            }
        }

        if (!restoredFromSeed) {
            console.log(`✨ [DB RESILIENCE] Creating fresh Causal Memory database at ${this.targetPath}`);
        }

        this._initConnection();
    }

    async _checkIntegrity() {
        return new Promise((resolve) => {
            this.db.get("PRAGMA quick_check(1);", [], async (err, row) => {
                const isCorrupt = err || !row || (row.quick_check && row.quick_check !== 'ok');
                if (isCorrupt) {
                    const errMsg = err ? err.message : (row ? row.quick_check : 'Corrupted header/file');
                    await this._quarantineAndRecreate(errMsg);
                }
                resolve();
            });
        });
    }

    init() {
        this._initConnection();

        this.migrationsPromise = this._checkIntegrity().then(() => {
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    // Institutional WAL Mode Pragmas Tuning with safe callbacks
                    this.db.run(`PRAGMA journal_mode = WAL;`, (err) => {
                        if (err) console.warn('[DB] Journal mode pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA synchronous = NORMAL;`, (err) => {
                        if (err) console.warn('[DB] Synchronous pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA busy_timeout = 5000;`, (err) => {
                        if (err) console.warn('[DB] Busy timeout pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA temp_store = MEMORY;`, (err) => {
                        if (err) console.warn('[DB] Temp store pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA cache_size = -64000;`, (err) => {
                        if (err) console.warn('[DB] Cache size pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA mmap_size = 30000000000;`, (err) => {
                        if (err) console.warn('[DB] MMAP pragma notice:', err.message);
                    });
                    this.db.run(`PRAGMA wal_autocheckpoint = 1000;`, (err) => {
                        if (err) {
                            console.error('[DB] Autocheckpoint pragma error:', err.message);
                            return reject(err);
                        }
                        resolve();
                    });
                });
            });
        }).then(() => {
            return runMigrations(this);
        }).then(async () => {
            await this._initLastInMemoryHash();
        }).catch(async (err) => {
            recordSystemError('CausalMemoryDB', 'MIGRATION_ERROR');
            console.error('[DB] Schema migration failed:', err);
            // If error is corruption-related, attempt emergency quarantine and second recovery pass
            if (err && (err.message?.includes('SQLITE_CORRUPT') || err.code === 'SQLITE_CORRUPT')) {
                console.warn('⚠️ [DB RESILIENCE] Migration caught SQLITE_CORRUPT. Executing emergency self-healing...');
                await this._quarantineAndRecreate('MIGRATION_SQLITE_CORRUPT');
                await runMigrations(this);
                await this._initLastInMemoryHash();
            } else {
                throw err;
            }
        });
    }

    async _initLastInMemoryHash() {
        if (this._lastHashInitPromise) return this._lastHashInitPromise;
        this._lastHashInitPromise = new Promise((resolve) => {
            const sql = `SELECT hash FROM causal_events_log ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err || !row || !row.hash) {
                    this._lastInMemoryHash = this._lastInMemoryHash || GENESIS_PREV_HASH;
                } else {
                    this._lastInMemoryHash = row.hash;
                }
                resolve(this._lastInMemoryHash);
            });
        });
        return this._lastHashInitPromise;
    }

    async _ensureLastHashLoaded() {
        if (this._lastInMemoryHash !== null) {
            return this._lastInMemoryHash;
        }
        await this.ensureReady();
        if (this._lastInMemoryHash !== null) {
            return this._lastInMemoryHash;
        }
        return await this._initLastInMemoryHash();
    }

    async ensureReady() {
        if (this.migrationsPromise) {
            await this.migrationsPromise;
        }
    }

    async runTTLCleanup(options = {}) {
        await this.flushCausalEvents();
        return runTTLCleanup(this, options);
    }

    startPeriodicTTLCleanup(intervalMs = 6 * 60 * 60 * 1000) {
        if (this._ttlTimer) clearInterval(this._ttlTimer);
        this._ttlTimer = setInterval(() => {
            this.runTTLCleanup().catch(err => {
                recordSystemError('CausalMemoryDB', 'TTL_CLEANUP_ERROR');
                console.error('[DB] Periodic TTL Cleanup error:', err);
            });
        }, intervalMs);
        if (typeof this._ttlTimer.unref === 'function') {
            this._ttlTimer.unref();
        }
        return this._ttlTimer;
    }

    async insertCourtLedgerEntry(entry) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO court_ledger
                (id, timestamp, action, verdict, reason, token_id, request_json, payload_json, state_json, granted, near_miss_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const now = Date.now();
            const id = entry.id || entry.tokenId || entry.token_id || `CL-${now}-${Math.random().toString(36).substring(2, 7)}`;
            const timestamp = entry.timestamp || now;
            const action = entry.action || entry.verdict || null;
            const verdict = entry.verdict || (entry.granted ? 'GRANT' : 'VETO');
            const reason = entry.reason || null;
            const tokenId = entry.tokenId || entry.token_id || id;
            const requestJson = entry.request ? JSON.stringify(entry.request) : (entry.request_json || null);
            const payloadJson = entry.payload ? JSON.stringify(entry.payload) : (entry.payload_json || null);
            const stateJson = entry.state ? JSON.stringify(entry.state) : (entry.state_json || null);
            const granted = entry.granted !== undefined ? (entry.granted ? 1 : 0) : (verdict === 'GRANT' ? 1 : 0);
            const nearMissType = entry.near_miss_type || entry.nearMissType || null;
            const createdAt = entry.created_at || now;

            const params = [
                id, timestamp, action, verdict, reason, tokenId, requestJson, payloadJson, stateJson, granted, nearMissType, createdAt
            ];

            this.db.serialize(() => {
                this.db.run(sql, params, (err) => {
                    if (err) {
                        recordSystemError('CausalMemoryDB', 'INSERT_COURT_LEDGER_ERROR');
                        reject(err);
                    }
                    else resolve();
                });
            });
        });
    }

    async getCourtLedgerEntries(limit = 1000) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM court_ledger ORDER BY timestamp ASC LIMIT ?`;
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    recordSystemError('CausalMemoryDB', 'GET_COURT_LEDGER_ERROR');
                    reject(err);
                }
                else resolve((rows || []).map(r => ({
                    ...r,
                    request: r.request_json ? safeJsonParse(r.request_json) : (r.payload_json ? safeJsonParse(r.payload_json) : null),
                    payload: r.payload_json ? safeJsonParse(r.payload_json) : null,
                    state: r.state_json ? safeJsonParse(r.state_json) : null,
                    granted: Boolean(r.granted)
                })));
            });
        });
    }

    async close() {
        if (this._causalFlushTimer) {
            clearInterval(this._causalFlushTimer);
            this._causalFlushTimer = null;
        }
        try {
            await this.flushCausalEvents();
        } catch (e) {
            recordSystemError('CausalMemoryDB', 'FLUSH_ON_CLOSE_ERROR');
            console.error('[DB] Failed to flush causal events during close:', e);
        }
        if (this._ttlTimer) {
            clearInterval(this._ttlTimer);
            this._ttlTimer = null;
        }
        if (this.migrationsPromise) {
            try {
                await this.migrationsPromise;
            } catch (e) {
                recordSystemError('CausalMemoryDB', 'MIGRATION_ERROR');
                // Ignore migration errors during database close
            }
        }
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        recordSystemError('CausalMemoryDB', 'CLOSE_ERROR');
                        reject(err);
                    }
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async insertParameterVersion(paramVersion) {
        await this.ensureReady();
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

    async getActiveParameterVersion(moduleName, parameterName) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM parameter_versions WHERE module = ? AND parameter = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [moduleName, parameterName], (err, row) => {
                if (err) reject(err);
                else resolve(row ? { ...row, value: safeJsonParse(row.value_json) } : null);
            });
        });
    }

    async rollbackParameterVersion(version, reason) {
        await this.ensureReady();
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

    async insertEvolutionLedgerEntry(entry) {
        await this.ensureReady();
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

    async updateEvolutionLedgerResult(ledgerId, observedResult) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `UPDATE evolution_ledger SET observed_result_json = ? WHERE ledger_id = ?`;
            this.db.run(sql, [JSON.stringify(observedResult), ledgerId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getEvolutionLedgerEntries(module, parameter) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM evolution_ledger WHERE module = ? AND parameter = ? ORDER BY created_at ASC`;
            this.db.all(sql, [module, parameter], (err, rows) => {
                if (err) reject(err);
                else resolve((rows || []).map(this._parseEvolutionRow));
            });
        });
    }

    async getAllEvolutionLedgerEntries() {
        await this.ensureReady();
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
            from_value: row.from_value_json ? safeJsonParse(row.from_value_json) : null,
            to_value: row.to_value_json ? safeJsonParse(row.to_value_json) : null,
            regime_stability: row.regime_stability_json ? safeJsonParse(row.regime_stability_json) : null,
            impact_analysis: row.impact_analysis_json ? safeJsonParse(row.impact_analysis_json) : null,
            observed_result: row.observed_result_json ? safeJsonParse(row.observed_result_json) : null
        };
    }

    async insertSemanticPattern(pattern) {
        await this.ensureReady();
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

    async getSemanticPatterns() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM semantic_memory ORDER BY confidence_score DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    conditions: safeJsonParse(r.conditions_json),
                    graph_edges: safeJsonParse(r.graph_edges_json)
                })));
            });
        });
    }

    async walCheckpoint(mode = 'PASSIVE') {
        await this.ensureReady();
        await this.flushCausalEvents();
        return new Promise((resolve, reject) => {
            const validModes = ['PASSIVE', 'FULL', 'RESTART', 'TRUNCATE'];
            const safeMode = validModes.includes(mode?.toUpperCase()) ? mode.toUpperCase() : 'PASSIVE';
            this.db.run(`PRAGMA wal_checkpoint(${safeMode});`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    startCausalFlushTimer(intervalMs = this._causalFlushIntervalMs) {
        if (this._causalFlushTimer) {
            clearInterval(this._causalFlushTimer);
        }
        this._causalFlushTimer = setInterval(() => {
            if (this._causalBuffer && this._causalBuffer.length > 0) {
                this.flushCausalEvents().catch(err => {
                    recordSystemError('CausalMemoryDB', 'PERIODIC_CAUSAL_FLUSH_ERROR');
                    console.error('[DB] Periodic causal flush error:', err);
                });
            }
        }, intervalMs);
        if (typeof this._causalFlushTimer.unref === 'function') {
            this._causalFlushTimer.unref();
        }
        return this._causalFlushTimer;
    }

    async flushCausalEvents() {
        while (this._isFlushing) {
            await this._flushPromise;
        }

        if (!this._causalBuffer || this._causalBuffer.length === 0) {
            return;
        }

        this._isFlushing = true;
        let resolveFlush, rejectFlush;
        this._flushPromise = new Promise((resolve, reject) => {
            resolveFlush = resolve;
            rejectFlush = reject;
        });
        this._flushPromise.catch(() => {});

        try {
            await this.ensureReady();

            const batch = this._causalBuffer;
            this._causalBuffer = [];

            if (batch.length === 0) {
                resolveFlush();
                return;
            }

            await new Promise((resolve, reject) => {
                const startTime = performance.now();
                this.db.serialize(() => {
                    this.db.run("BEGIN TRANSACTION", (beginErr) => {
                        if (beginErr) {
                            recordSystemError('CausalMemoryDB', 'FLUSH_CAUSAL_BEGIN_ERROR');
                            console.error('[DB] Failed to BEGIN TRANSACTION for causal batch:', beginErr);
                            this._causalBuffer = [...batch, ...this._causalBuffer];
                            return reject(beginErr);
                        }

                        const sql = `
                            INSERT INTO causal_events_log 
                            (event_id, timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, version, hash_prev, epistemic_regime, payload, context, hash)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        const stmt = this.db.prepare(sql);
                        let stmtError = null;

                        for (let i = 0; i < batch.length; i++) {
                            const event = batch[i];
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
                                event.hash_prev || '0'.repeat(64),
                                event.epistemic_regime || 'REGIME_A_CONSENSUS',
                                typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload || {}),
                                typeof event.context === 'string' ? event.context : JSON.stringify(event.context || {}),
                                event.hash || '0'.repeat(64)
                            ];

                            stmt.run(params, (err) => {
                                if (err && !stmtError) {
                                    stmtError = err;
                                    recordSystemError('CausalMemoryDB', 'INSERT_CAUSAL_EVENT_ERROR');
                                    console.error('[DB] Failed to insert buffered causal event:', err);
                                }
                            });
                        }

                        stmt.finalize((finalizeErr) => {
                            if (stmtError || finalizeErr) {
                                const err = stmtError || finalizeErr;
                                this.db.run("ROLLBACK", () => {
                                    this._causalBuffer = [...batch, ...this._causalBuffer];
                                    reject(err);
                                });
                            } else {
                                this.db.run("COMMIT", (commitErr) => {
                                    if (commitErr) {
                                        recordSystemError('CausalMemoryDB', 'FLUSH_CAUSAL_COMMIT_ERROR');
                                        console.error('[DB] Failed to COMMIT causal batch:', commitErr);
                                        this._causalBuffer = [...batch, ...this._causalBuffer];
                                        reject(commitErr);
                                    } else {
                                        recordSqliteWrite('insert_causal_batch', (performance.now() - startTime) / 1000);
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                });
            });

            resolveFlush();
        } catch (err) {
            rejectFlush(err);
            throw err;
        } finally {
            this._isFlushing = false;
            this._flushPromise = null;
        }
    }

    async insertCausalEvent(event) {
        if (!event) return;

        if (this._lastInMemoryHash === null) {
            await this._ensureLastHashLoaded();
        }

        // Automatically assign hash_prev and real SHA-256 hash if not present
        if (!event.hash_prev) {
            event.hash_prev = this._lastInMemoryHash || GENESIS_PREV_HASH;
        }
        if (!event.hash) {
            event.hash = computeCausalHash(event, event.hash_prev);
        }

        // Atomic in-memory pointer update for zero-contention
        this._lastInMemoryHash = event.hash;
        this._causalBuffer.push(event);

        if (this._causalBuffer.length >= this._causalBatchSize) {
            return this.flushCausalEvents();
        }
        return Promise.resolve();
    }

    async getLastCausalEventHash() {
        await this.ensureReady();
        await this.flushCausalEvents();
        if (this._lastInMemoryHash !== null) {
            return this._lastInMemoryHash;
        }
        return await this._ensureLastHashLoaded();
    }

    async getCausalEventsUntil(timestampMs) {
        await this.ensureReady();
        await this.flushCausalEvents();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM causal_events_log WHERE timestamp <= ? ORDER BY id ASC`;
            this.db.all(sql, [timestampMs], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    payload: safeJsonParse(r.payload),
                    context: safeJsonParse(r.context)
                })));
            });
        });
    }

    async getCausalEventsByCorrelation(correlationId) {
        await this.ensureReady();
        await this.flushCausalEvents();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM causal_events_log WHERE correlation_id = ? ORDER BY id ASC`;
            this.db.all(sql, [correlationId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(r => ({
                    ...r,
                    payload: safeJsonParse(r.payload),
                    context: safeJsonParse(r.context)
                })));
            });
        });
    }

    async getRecentCausalEvents(limit = 50, symbol = null) {
        await this.ensureReady();
        await this.flushCausalEvents();
        return new Promise((resolve, reject) => {
            let sql = `SELECT * FROM causal_events_log ORDER BY id DESC LIMIT ?`;
            let params = [limit];
            if (symbol) {
                sql = `SELECT * FROM causal_events_log WHERE event_id LIKE ? ORDER BY id DESC LIMIT ?`;
                params = [`%_${symbol}%`, limit];
            }
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve((rows || []).reverse().map(r => ({
                    ...r,
                    payload: safeJsonParse(r.payload),
                    context: safeJsonParse(r.context)
                })));
            });
        });
    }

    // Insert multiple candles inside a transaction for massive performance gain
    async insertBatch(symbol, timeframe, candles) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const startTime = performance.now();
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                const stmt = this.db.prepare(`INSERT INTO candles (symbol, timeframe, timestamp, open, high, low, close, volume, close_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                
                let stmtError = null;
                for (let i = 0; i < candles.length; i++) {
                    const c = candles[i];
                    stmt.run(symbol, timeframe, c.t, c.o, c.h, c.l, c.c, c.v, c.T, (err) => {
                        if (err && !stmtError) {
                            stmtError = err;
                            console.error(`[DB] insertBatch Statement Error (SQLITE_BUSY?):`, err);
                        }
                    });
                }
                
                stmt.finalize();
                this.db.run("COMMIT", (err) => {
                    if (err || stmtError) {
                        reject(err || stmtError);
                    } else {
                        recordSqliteWrite('insert_batch', (performance.now() - startTime) / 1000);
                        resolve();
                    }
                });
            });
        });
    }

    // Get the most recent N candles that are strictly closed before or exactly at currentMs
    async getVisibleHistory(symbol, timeframe, currentMs, limit) {
        await this.ensureReady();
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

    async getNextExperimentId() {
        await this.ensureReady();
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

    async createExperiment({ experiment_id, display_name, status, strategy_hash, config_snapshot_json, model_snapshot_json, champion_flag, created_at, parent_experiment_id }) {
        await this.ensureReady();
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
                safeJsonStringify(config_snapshot_json),
                safeJsonStringify(model_snapshot_json),
                champion_flag || 0,
                created_at || Date.now(),
                parent_experiment_id || null
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getActiveExperiment() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE status = 'ACTIVE' ORDER BY id DESC LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    async getExperiment(experimentId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE experiment_id = ?`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    async getAllExperiments() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments ORDER BY id DESC`;
            this.db.all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    async freezeExperiment(experimentId, frozenAt, frozenBy = 'USER') {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `UPDATE experiments SET status = 'LEGACY', frozen_at = ?, frozen_by = ? WHERE experiment_id = ? AND status = 'ACTIVE'`;
            this.db.run(sql, [frozenAt || Date.now(), frozenBy, experimentId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }


    async insertExperimentTrade(experimentId, trade) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const tradeId = trade.trade_id || trade.id || generateUUIDv7();
            const expId = experimentId || trade.experiment_id || trade.experimentId || 'EXP-001';
            const symbol = trade.symbol || null;
            const direction = trade.direction || null;
            const entryPrice = trade.entryPrice ?? trade.entry_price ?? null;
            const exitPrice = trade.exitPrice ?? trade.exit_price ?? null;
            const stopLoss = trade.stopLoss ?? trade.stop_loss ?? null;
            const takeProfit = trade.takeProfit ?? trade.take_profit ?? null;
            const quantity = trade.quantity ?? null;
            const pnl = trade.pnl ?? null;
            const pnlPct = trade.pnl_pct ?? trade.pnlPct ?? (trade.pnl != null ? trade.pnl * 100 : null);
            const status = trade.status || 'open';
            const signalJson = trade.signal ? safeJsonStringify(trade.signal) : (trade.signal_json ? (typeof trade.signal_json === 'string' ? trade.signal_json : safeJsonStringify(trade.signal_json)) : null);
            const regime = trade.regime || null;
            const govDecision = trade.governanceDecision ?? trade.governance_decision ?? null;
            const reasonCodesJson = trade.reasonCodes ? safeJsonStringify(trade.reasonCodes) : (trade.reason_codes_json ? (typeof trade.reason_codes_json === 'string' ? trade.reason_codes_json : safeJsonStringify(trade.reason_codes_json)) : null);
            const evJson = trade.ev ? safeJsonStringify(trade.ev) : (trade.ev_json ? (typeof trade.ev_json === 'string' ? trade.ev_json : safeJsonStringify(trade.ev_json)) : null);
            const entryTimestamp = trade.timestamp || trade.entry_timestamp || trade.entryTimestamp || Date.now();
            const exitTimestamp = trade.exit_timestamp || trade.exitTimestamp || null;
            const createdAt = trade.created_at || trade.createdAt || Date.now();

            const sql = `
                INSERT INTO experiment_trades
                (trade_id, experiment_id, symbol, direction, entry_price, exit_price, stop_loss, take_profit,
                 quantity, pnl, pnl_pct, status, signal_json, regime, governance_decision,
                 reason_codes_json, ev_json, entry_timestamp, exit_timestamp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(trade_id) DO UPDATE SET
                    experiment_id = COALESCE(excluded.experiment_id, experiment_trades.experiment_id),
                    symbol = COALESCE(excluded.symbol, experiment_trades.symbol),
                    direction = COALESCE(excluded.direction, experiment_trades.direction),
                    entry_price = COALESCE(excluded.entry_price, experiment_trades.entry_price),
                    exit_price = COALESCE(excluded.exit_price, experiment_trades.exit_price),
                    stop_loss = COALESCE(excluded.stop_loss, experiment_trades.stop_loss),
                    take_profit = COALESCE(excluded.take_profit, experiment_trades.take_profit),
                    quantity = COALESCE(excluded.quantity, experiment_trades.quantity),
                    pnl = COALESCE(excluded.pnl, experiment_trades.pnl),
                    pnl_pct = COALESCE(excluded.pnl_pct, experiment_trades.pnl_pct),
                    status = COALESCE(excluded.status, experiment_trades.status),
                    signal_json = COALESCE(excluded.signal_json, experiment_trades.signal_json),
                    regime = COALESCE(excluded.regime, experiment_trades.regime),
                    governance_decision = COALESCE(excluded.governance_decision, experiment_trades.governance_decision),
                    reason_codes_json = COALESCE(excluded.reason_codes_json, experiment_trades.reason_codes_json),
                    ev_json = COALESCE(excluded.ev_json, experiment_trades.ev_json),
                    entry_timestamp = COALESCE(excluded.entry_timestamp, experiment_trades.entry_timestamp),
                    exit_timestamp = COALESCE(excluded.exit_timestamp, experiment_trades.exit_timestamp),
                    created_at = COALESCE(experiment_trades.created_at, excluded.created_at)
            `;

            this.db.run(sql, [
                tradeId, expId, symbol, direction, entryPrice, exitPrice, stopLoss, takeProfit,
                quantity, pnl, pnlPct, status, signalJson, regime, govDecision,
                reasonCodesJson, evJson, entryTimestamp, exitTimestamp, createdAt
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async updateExperimentTrade(tradeId, experimentId, updateData = {}) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const id = tradeId || updateData.trade_id || updateData.id;
            if (!id) {
                return reject(new Error('[DB] updateExperimentTrade requires a valid tradeId'));
            }

            const sets = [];
            const params = [];

            if (experimentId || updateData.experiment_id || updateData.experimentId) {
                sets.push('experiment_id = ?');
                params.push(experimentId || updateData.experiment_id || updateData.experimentId);
            }
            if (updateData.symbol !== undefined) {
                sets.push('symbol = ?');
                params.push(updateData.symbol);
            }
            if (updateData.direction !== undefined) {
                sets.push('direction = ?');
                params.push(updateData.direction);
            }
            if (updateData.entry_price !== undefined || updateData.entryPrice !== undefined) {
                sets.push('entry_price = ?');
                params.push(updateData.entry_price ?? updateData.entryPrice);
            }
            if (updateData.exit_price !== undefined || updateData.exitPrice !== undefined) {
                sets.push('exit_price = ?');
                params.push(updateData.exit_price ?? updateData.exitPrice);
            }
            if (updateData.stop_loss !== undefined || updateData.stopLoss !== undefined) {
                sets.push('stop_loss = ?');
                params.push(updateData.stop_loss ?? updateData.stopLoss);
            }
            if (updateData.take_profit !== undefined || updateData.takeProfit !== undefined) {
                sets.push('take_profit = ?');
                params.push(updateData.take_profit ?? updateData.takeProfit);
            }
            if (updateData.quantity !== undefined) {
                sets.push('quantity = ?');
                params.push(updateData.quantity);
            }
            if (updateData.pnl !== undefined) {
                sets.push('pnl = ?');
                params.push(updateData.pnl);
            }
            if (updateData.pnl_pct !== undefined || updateData.pnlPct !== undefined) {
                sets.push('pnl_pct = ?');
                params.push(updateData.pnl_pct ?? updateData.pnlPct);
            }
            if (updateData.status !== undefined) {
                sets.push('status = ?');
                params.push(updateData.status);
            }
            if (updateData.signal !== undefined || updateData.signal_json !== undefined) {
                sets.push('signal_json = ?');
                params.push(updateData.signal ? safeJsonStringify(updateData.signal) : (typeof updateData.signal_json === 'string' ? updateData.signal_json : safeJsonStringify(updateData.signal_json)));
            }
            if (updateData.regime !== undefined) {
                sets.push('regime = ?');
                params.push(updateData.regime);
            }
            if (updateData.governance_decision !== undefined || updateData.governanceDecision !== undefined) {
                sets.push('governance_decision = ?');
                params.push(updateData.governance_decision ?? updateData.governanceDecision);
            }
            if (updateData.reasonCodes !== undefined || updateData.reason_codes_json !== undefined) {
                sets.push('reason_codes_json = ?');
                params.push(updateData.reasonCodes ? safeJsonStringify(updateData.reasonCodes) : (typeof updateData.reason_codes_json === 'string' ? updateData.reason_codes_json : safeJsonStringify(updateData.reason_codes_json)));
            }
            if (updateData.ev !== undefined || updateData.ev_json !== undefined) {
                sets.push('ev_json = ?');
                params.push(updateData.ev ? safeJsonStringify(updateData.ev) : (typeof updateData.ev_json === 'string' ? updateData.ev_json : safeJsonStringify(updateData.ev_json)));
            }
            if (updateData.exit_timestamp !== undefined || updateData.exitTimestamp !== undefined) {
                sets.push('exit_timestamp = ?');
                params.push(updateData.exit_timestamp ?? updateData.exitTimestamp);
            }

            if (sets.length === 0) {
                return resolve();
            }

            params.push(id);
            const sql = `UPDATE experiment_trades SET ${sets.join(', ')} WHERE trade_id = ?`;
            this.db.run(sql, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getExperimentTrades(experimentId, opts = {}) {
        await this.ensureReady();
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

    async getExperimentTradeCount(experimentId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) as count FROM experiment_trades WHERE experiment_id = ? AND status = 'closed'`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row?.count || 0);
            });
        });
    }

    async insertExperimentSnapshot(snapshot) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR REPLACE INTO experiment_snapshots
                (experiment_id, total_trades, winning_trades, losing_trades, win_rate, profit_factor,
                 total_pnl, total_pnl_pct, max_drawdown, max_drawdown_pct, sharpe_ratio,
                 avg_trade_pnl, best_trade_pnl, worst_trade_pnl, avg_holding_time_ms,
                 equity_curve_json, drawdown_curve_json, monthly_returns_json, snapshot_timestamp,
                 metrics_json, market_snapshot_json, alpha_score, reason_for_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                snapshot.snapshot_timestamp || Date.now(),
                snapshot.metrics_json || null,
                snapshot.market_snapshot_json || null,
                snapshot.alpha_score || 0,
                snapshot.reason_for_snapshot || null
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getExperimentSnapshot(experimentId) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiment_snapshots WHERE experiment_id = ?`;
            this.db.get(sql, [experimentId], (err, row) => {
                if (err) reject(err);
                else resolve(row ? {
                    ...row,
                    equityCurve: row.equity_curve_json ? safeJsonParse(row.equity_curve_json) : null,
                    drawdownCurve: row.drawdown_curve_json ? safeJsonParse(row.drawdown_curve_json) : null,
                    monthlyReturns: row.monthly_returns_json ? safeJsonParse(row.monthly_returns_json) : null
                } : null);
            });
        });
    }

    async setChampion(experimentId) {
        await this.ensureReady();
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

    async getChampion() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM experiments WHERE champion_flag = 1 LIMIT 1`;
            this.db.get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    }

    async getExperimentRanking(sortBy = 'profit_factor', limit = 20) {
        await this.ensureReady();
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
export { runMigrations, runTTLCleanup };
export default db;

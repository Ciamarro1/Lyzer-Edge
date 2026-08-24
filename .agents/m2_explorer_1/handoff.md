# 5-Component Handoff Report: Asynchronous Batching for Causal Memory (R2)

**Agent**: Explorer 1 (Milestone 2)  
**Recipient**: Orchestrator (`e6bd412e-5caf-4269-8b18-0c299d19badb`) / Worker Agent  
**Timestamp**: 2026-08-24T03:12:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

### 1.1 `insertCausalEvent(event)` in `lyzer edge/backend/db.js`
- **Location**: `lyzer edge/backend/db.js:385-424`
- **Observed Code**:
  ```javascript
  async insertCausalEvent(event) {
      await this.ensureReady();
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
              event.hash_prev || '0'.repeat(64),
              event.epistemic_regime || 'REGIME_A_CONSENSUS',
              JSON.stringify(event.payload || {}),
              JSON.stringify(event.context || {}),
              event.hash || '0'.repeat(64)
          ];

          this.db.serialize(() => {
              this.db.run(sql, params, (err) => {
                  if (err) {
                      recordSystemError('CausalMemoryDB', 'INSERT_CAUSAL_EVENT_ERROR');
                      console.error('[DB] Failed to insert causal event (possible SQLITE_BUSY):', err);
                      reject(err);
                  } else {
                      recordSqliteWrite('insert_causal_event', (performance.now() - startTime) / 1000);
                      resolve();
                  }
              });
          });
      });
  }
  ```

### 1.2 Call Sites in `lyzer edge/backend/streamEngine.js`
- **Location**: `lyzer edge/backend/streamEngine.js:802-829`
- **Observed Code**:
  ```javascript
  // C5 fix: Dispatch async writes to Causal Memory DB for snapshots and verdicts
  if (db && typeof db.insertCausalEvent === 'function') {
    const ts = currentCandleTime || Date.now();
    const corrId = `tick_${this.symbol}_${ts}`;
    const snapEventId = `SNAP_${this.symbol}_${ts}_${generateUUIDv7()}`;
    const verdictEventId = `VERDICT_${this.symbol}_${ts}_${generateUUIDv7()}`;

    db.insertCausalEvent({
      event_id: snapEventId,
      timestamp: ts,
      event_type: 'REALITY_SNAPSHOT_CREATED',
      source: 'StreamEngine',
      correlation_id: corrId,
      payload: { sds, lhds, liquidityDivergence, oppScore, imbalance, currentPrice },
      context: { symbol: this.symbol, interval: this.interval }
    }).catch(err => console.error('[CAUSAL_MEMORY] SNAPSHOT failed:', err.message));

    db.insertCausalEvent({
      event_id: verdictEventId,
      timestamp: ts,
      event_type: 'KERNEL_VERDICT',
      source: 'TruthKernel',
      correlation_id: corrId,
      parent_event: snapEventId,
      payload: kernelResult,
      context: { symbol: this.symbol }
    }).catch(err => console.error('[CAUSAL_MEMORY] VERDICT failed:', err.message));
  }
  ```

### 1.3 Reference Transactional Batching in `db.js`
- **Location**: `lyzer edge/backend/db.js:490-520` (`insertBatch` for candles):
  Uses `this.db.run("BEGIN TRANSACTION")`, prepared statement execution in a loop, `stmt.finalize()`, and `this.db.run("COMMIT")`.

### 1.4 Existing Tests
- Current causal memory test suite passes 8 test files (12 tests) via `npx vitest run tests/causal-memory/`.
- Current DB lifecycle test suite passes 3 tests via `npx vitest run tests/unit/dbLifecycle.test.js`.
- Verification suite passes 6 test files (38 tests) via `npm run test:verify`.

---

## 2. Logic Chain

1. **Root Cause**: `insertCausalEvent` performs individual disk writes with individual write lock acquisitions on SQLite for every event, invoked 2x per tick per symbol (12+ calls/sec across 6 StreamEngine instances), creating event loop delays and risk of `SQLITE_BUSY`. (Observation 1.1 & 1.2)
2. **Batching Solution**: Introducing an in-memory queue (`_causalBuffer`) allows `insertCausalEvent(event)` to push immediately without blocking the tick loop. (Observation 1.1 & 1.3)
3. **Trigger Mechanisms**: Flushes occur when `_causalBuffer.length >= _causalBatchSize` (default 50) OR periodically via `setInterval` (default 100ms with `.unref()`). (Observation 1.3)
4. **Transaction Atomicity**: `flushCausalEvents()` executes `BEGIN TRANSACTION`, a prepared statement across all buffered events, `stmt.finalize()`, and `COMMIT`. If any statement errors out, `ROLLBACK` is called, and unwritten items are restored back to the front of `_causalBuffer`. (Observation 1.3)
5. **Consistency Guarantee**: To avoid race conditions where tests or recovery processes read immediately after writing (e.g. `getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `close()`), these methods await `this.flushCausalEvents()` before issuing queries. (Observation 1.4)

---

## 3. Caveats

- **Payload Serialization**: In `insertCausalEvent`, events may pass already-stringified JSON or JavaScript objects in `payload` and `context`. `typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload || {})` handles both cases safely.
- **Node.js Process Teardown**: The flush timer must call `.unref()` so it does not keep Node.js process alive indefinitely if all tasks complete. In addition, `close()` explicitly clears `this._causalFlushTimer` and flushes any pending buffer.
- **Error Restoration Ordering**: If a flush fails, restoring the batch prepends it (`this._causalBuffer = [...batch, ...this._causalBuffer]`) so temporal order is strictly maintained.

---

## 4. Conclusion & Concrete Code Snippets for Worker

The Worker can implement Requirement R2 in `lyzer edge/backend/db.js` and add a new test in `lyzer edge/tests/causal-memory/causalBatching.test.js`.

### 4.1 Modifications to `lyzer edge/backend/db.js`

#### Step 1: Update Constructor (lines 15–54)
```javascript
export class CausalMemoryDB {
    constructor(customDbPath = null, options = {}) {
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

        // In-memory buffer for async causal batching (R2)
        this._causalBuffer = [];
        this._causalBatchSize = options.batchSize || parseInt(process.env.CAUSAL_BATCH_SIZE, 10) || 50;
        this._causalFlushIntervalMs = options.flushIntervalMs || parseInt(process.env.CAUSAL_FLUSH_INTERVAL_MS, 10) || 100;
        this._causalFlushTimer = null;
        this._isFlushing = false;
        this._flushPromise = null;

        // Instrument queries for Lock Wait Latency Tracking
        const wrapMethod = (methodName) => {
            const orig = this.db[methodName];
            this.db[methodName] = (...args) => {
                const startTime = performance.now();
                const lastArg = args[args.length - 1];
                if (typeof lastArg === 'function') {
                    args[args.length - 1] = function(...cbArgs) {
                        const durationSec = (performance.now() - startTime) / 1000;
                        recordSqliteLockWait('causal_memory', durationSec);
                        return lastArg.apply(this, cbArgs);
                    };
                }
                return orig.apply(this.db, args);
            };
        };
        wrapMethod('run');
        wrapMethod('get');
        wrapMethod('all');

        this.init();
        this.startCausalFlushTimer();
        if (!customDbPath) {
            sharedInstance = this;
        }
    }
```

#### Step 2: Add `startCausalFlushTimer` and `flushCausalEvents` methods
```javascript
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

        await this.ensureReady();

        const batch = this._causalBuffer;
        this._causalBuffer = [];
        this._isFlushing = true;

        this._flushPromise = new Promise((resolve, reject) => {
            const startTime = performance.now();
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION", (beginErr) => {
                    if (beginErr) {
                        recordSystemError('CausalMemoryDB', 'FLUSH_CAUSAL_BEGIN_ERROR');
                        console.error('[DB] Failed to BEGIN TRANSACTION for causal batch:', beginErr);
                        this._causalBuffer = [...batch, ...this._causalBuffer];
                        this._isFlushing = false;
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
                                this._isFlushing = false;
                                reject(err);
                            });
                        } else {
                            this.db.run("COMMIT", (commitErr) => {
                                this._isFlushing = false;
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

        try {
            await this._flushPromise;
        } finally {
            this._isFlushing = false;
            this._flushPromise = null;
        }
    }
```

#### Step 3: Refactor `insertCausalEvent(event)`
```javascript
    async insertCausalEvent(event) {
        if (!event) return;
        this._causalBuffer.push(event);

        if (this._causalBuffer.length >= this._causalBatchSize) {
            return this.flushCausalEvents();
        }
        return Promise.resolve();
    }
```

#### Step 4: Add `await this.flushCausalEvents()` to read/maintenance methods
```javascript
    async getLastCausalEventHash() {
        await this.ensureReady();
        await this.flushCausalEvents();
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

    async runTTLCleanup(options = {}) {
        await this.flushCausalEvents();
        return runTTLCleanup(this, options);
    }
```

#### Step 5: Update `close()` method
```javascript
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
```

### 4.2 New Test Suite: `lyzer edge/tests/causal-memory/causalBatching.test.js`
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { CausalMemoryDB } from '../../backend/db.js';

const TEST_DB_PATH = path.join(process.cwd(), 'test_causal_batching.db');

function cleanupDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch (e) {}
  }
  const wal = `${TEST_DB_PATH}-wal`;
  const shm = `${TEST_DB_PATH}-shm`;
  if (fs.existsSync(wal)) { try { fs.unlinkSync(wal); } catch (e) {} }
  if (fs.existsSync(shm)) { try { fs.unlinkSync(shm); } catch (e) {} }
}

describe('Asynchronous Causal Batching Suite (Milestone 2 - R2)', () => {
  beforeEach(() => cleanupDb());
  afterEach(() => cleanupDb());

  it('buffers events and auto-flushes when batch size threshold is reached', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH, { batchSize: 5, flushIntervalMs: 5000 });
    await db.ensureReady();

    // Insert 4 events (< batchSize 5)
    for (let i = 1; i <= 4; i++) {
      await db.insertCausalEvent({
        event_id: `EVT-${i}`,
        timestamp: 1000 + i,
        event_type: 'TEST_EVENT',
        source: 'TEST',
        correlation_id: 'CORR-1',
        hash: `HASH-${i}`
      });
    }
    expect(db._causalBuffer.length).toBe(4);

    // 5th event triggers batch flush
    await db.insertCausalEvent({
      event_id: `EVT-5`,
      timestamp: 1005,
      event_type: 'TEST_EVENT',
      source: 'TEST',
      correlation_id: 'CORR-1',
      hash: `HASH-5`
    });

    expect(db._causalBuffer.length).toBe(0);

    const rows = await db.getCausalEventsByCorrelation('CORR-1');
    expect(rows).toHaveLength(5);
    expect(rows[4].event_id).toBe('EVT-5');

    await db.close();
  });

  it('periodically flushes events based on interval timer', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH, { batchSize: 50, flushIntervalMs: 50 });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: 'EVT-TIMER-1',
      timestamp: 2000,
      event_type: 'TEST_TIMER',
      source: 'TEST',
      correlation_id: 'CORR-TIMER',
      hash: 'HASH-TIMER-1'
    });

    expect(db._causalBuffer.length).toBe(1);

    // Wait for timer flush
    await new Promise(r => setTimeout(r, 120));
    expect(db._causalBuffer.length).toBe(0);

    const rows = await db.getCausalEventsByCorrelation('CORR-TIMER');
    expect(rows).toHaveLength(1);

    await db.close();
  });

  it('guarantees query flush consistency before read operations', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH, { batchSize: 100, flushIntervalMs: 10000 });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: 'EVT-QUERY-1',
      timestamp: 3000,
      event_type: 'TEST_READ',
      source: 'TEST',
      correlation_id: 'CORR-QUERY',
      hash: 'HASH-QUERY-1'
    });

    // Buffer has 1 item, not yet flushed by size or timer
    expect(db._causalBuffer.length).toBe(1);

    // getLastCausalEventHash automatically flushes buffer before query
    const lastHash = await db.getLastCausalEventHash();
    expect(lastHash).toBe('HASH-QUERY-1');
    expect(db._causalBuffer.length).toBe(0);

    await db.close();
  });

  it('flushes in-flight events cleanly during db.close()', async () => {
    const db = new CausalMemoryDB(TEST_DB_PATH, { batchSize: 100, flushIntervalMs: 10000 });
    await db.ensureReady();

    await db.insertCausalEvent({
      event_id: 'EVT-CLOSE-1',
      timestamp: 4000,
      event_type: 'TEST_CLOSE',
      source: 'TEST',
      correlation_id: 'CORR-CLOSE',
      hash: 'HASH-CLOSE-1'
    });

    expect(db._causalBuffer.length).toBe(1);

    await db.close();
    expect(db._causalBuffer.length).toBe(0);

    // Reopen and check persistence
    const db2 = new CausalMemoryDB(TEST_DB_PATH);
    await db2.ensureReady();
    const rows = await db2.getCausalEventsByCorrelation('CORR-CLOSE');
    expect(rows).toHaveLength(1);
    expect(rows[0].event_id).toBe('EVT-CLOSE-1');

    await db2.close();
  });
});
```

---

## 5. Verification Method

1. **Run Causal Memory Suite with New Batching Test**:
   ```bash
   npx.cmd vitest run tests/causal-memory/
   ```
2. **Run DB Lifecycle Suite**:
   ```bash
   npx.cmd vitest run tests/unit/dbLifecycle.test.js
   ```
3. **Run Verification Smoke Suite**:
   ```bash
   npm.cmd run test:verify
   ```
4. **Run Full Test Suite**:
   ```bash
   npm.cmd test
   ```
5. **Inspect Files**:
   - `lyzer edge/backend/db.js`
   - `lyzer edge/tests/causal-memory/causalBatching.test.js`

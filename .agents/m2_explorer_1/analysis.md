# Technical Analysis: Asynchronous Batching for Causal Memory (Requirement R2)

**Author**: Explorer 1 (Milestone 2)  
**Target File**: `lyzer edge/backend/db.js`  
**Related Files**: `lyzer edge/backend/streamEngine.js`, `lyzer edge/tests/causal-memory/*`, `lyzer edge/tests/unit/dbLifecycle.test.js`  
**Timestamp**: 2026-08-24T03:10:00Z  

---

## 1. Problem Statement & Baseline Analysis

### 1.1 The Bottleneck in `insertCausalEvent(event)`
In the current implementation of `lyzer edge/backend/db.js` (lines 385–424), `insertCausalEvent(event)` performs an individual `INSERT INTO causal_events_log ...` operation wrapped in `this.db.serialize(() => this.db.run(sql, params, ...))` for every single event:

```javascript
// Baseline implementation in db.js (lines 385-424)
async insertCausalEvent(event) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        const sql = `
            INSERT INTO causal_events_log 
            (event_id, timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, version, hash_prev, epistemic_regime, payload, context, hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [...];

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

### 1.2 Multi-Engine High-Frequency Emission
In `lyzer edge/backend/streamEngine.js` (lines 803–829), on every tick across 6 active StreamEngine instances (e.g. BTC, ETH, SOL, XRP, BNB, DOGE), two causal events are dispatched:
1. `REALITY_SNAPSHOT_CREATED` (via `StreamEngine`)
2. `KERNEL_VERDICT` (via `TruthKernel`)

At 1-second candle intervals or rapid WebSocket tick streams, this generates 12–30+ isolated database writes per second. Even with SQLite in WAL mode (`PRAGMA journal_mode = WAL;`), individual autocommit writes cause:
- Repeated acquisition and release of SQLite write locks (`SQLITE_BUSY` contention).
- Unnecessary event loop thread blocking while serializing write promises.
- Fragmented WAL frame allocations.

### 1.3 Reference Architecture: `insertBatch(symbol, timeframe, candles)`
In contrast, `db.js` lines 490–520 demonstrates the speedup of transactional batching for candle data:
```javascript
// Reference batching in db.js:490-520
async insertBatch(symbol, timeframe, candles) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        this.db.serialize(() => {
            this.db.run("BEGIN TRANSACTION");
            const stmt = this.db.prepare(`INSERT INTO candles (...) VALUES (...)`);
            for (let i = 0; i < candles.length; i++) {
                stmt.run(...);
            }
            stmt.finalize();
            this.db.run("COMMIT", ...);
        });
    });
}
```
Applying this pattern to `insertCausalEvent` via an in-memory queue (`_causalBuffer`) with periodic time-based and size-based transactional flushing satisfies Requirement R2 completely.

---

## 2. Design Specification for Asynchronous Causal Batching

### 2.1 State Properties in `CausalMemoryDB`
Add the following member fields to `CausalMemoryDB` constructor:
- `this._causalBuffer = []`: In-memory array queue holding buffered events.
- `this._causalBatchSize = options.batchSize || parseInt(process.env.CAUSAL_BATCH_SIZE, 10) || 50`: Maximum buffer capacity before immediate flush is triggered.
- `this._causalFlushIntervalMs = options.flushIntervalMs || parseInt(process.env.CAUSAL_FLUSH_INTERVAL_MS, 10) || 100`: Periodic flush interval (default 100ms).
- `this._causalFlushTimer = null`: Recurring timer handle (unref'd to allow clean Node.js exit).
- `this._isFlushing = false`: Boolean mutex flag indicating a batch transaction is actively in flight.
- `this._flushPromise = null`: Active flush Promise to allow concurrent callers/readers to await completion.

### 2.2 Periodic Timer Lifecycle (`startCausalFlushTimer`)
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
```

### 2.3 `insertCausalEvent(event)` Implementation
Decouples disk I/O from the caller:
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

### 2.4 `flushCausalEvents()` Implementation
Transactional, atomic, and resilient against re-entrancy and failures:
```javascript
async flushCausalEvents() {
    // 1. Wait if another flush is currently executing
    while (this._isFlushing) {
        await this._flushPromise;
    }

    // 2. Return if buffer is empty
    if (!this._causalBuffer || this._causalBuffer.length === 0) {
        return;
    }

    await this.ensureReady();

    // 3. Atomically extract current batch and reset buffer
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
                    // Re-insert unwritten items back to buffer at head
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

---

## 3. Concurrency, Race Condition & Consistency Analysis

### 3.1 Read-Your-Own-Writes Consistency (Query-Flushing)
In unit tests (e.g. `eventStore.test.js`, `rewindEngine.test.js`, `causalPipeline.test.js`) and production recovery flows, callers insert an event and immediately query:
- `getLastCausalEventHash()`
- `getCausalEventsUntil(timestampMs)`
- `getCausalEventsByCorrelation(correlationId)`
- `getRecentCausalEvents(limit, symbol)`
- `walCheckpoint(mode)`
- `runTTLCleanup(options)`

**Solution**: Each of these methods MUST invoke `await this.flushCausalEvents()` before executing the SQL SELECT/PRAGMA query.
This guarantees that all in-memory events are committed to SQLite before the read executes, eliminating any stale-read or race condition.

### 3.2 Database Teardown & Lifecycle (`close()`)
When `close()` is called:
1. Clear the timer: `clearInterval(this._causalFlushTimer)`.
2. Flush remaining buffered events: `await this.flushCausalEvents()`.
3. Clear TTL timer.
4. Await migrations promise.
5. Close SQLite connection handle (`this.db.close(...)`).

This prevents data loss during server shutdown or test teardown.

---

## 4. Verification Plan

| Test Scope | Target File / Command | Purpose |
|------------|-----------------------|---------|
| **Causal Memory Unit Tests** | `npx.cmd vitest run tests/causal-memory/` | Verify full 8 test suites pass without regression |
| **New Batching Tests** | `tests/causal-memory/causalBatching.test.js` | Test batch threshold (50), interval flush (100ms), query flush, close flush, and error rollback |
| **DB Lifecycle Tests** | `npx.cmd vitest run tests/unit/dbLifecycle.test.js` | Verify migrations, TTL cleanup, and court ledger persistence |
| **Verification Smoke Tests** | `npm.cmd run test:verify` | Run all 6 verification test suites |
| **Full Vitest Suite** | `npm.cmd test` | Full project test pass |

# Comprehensive Survey & Architectural Analysis: R1 & R2

**Investigator**: Explorer 1 (Survey Phase)  
**Date**: 2026-08-24  
**Target Codebase**: `Lyzer-Edge`  
**Scope**: Requirements R1 (Zero-Allocation in `v8_openmobius.js`) and R2 (Asynchronous Batching for Causal Memory in `db.js`)  
**Status**: COMPLETE  

---

## 1. Executive Summary

This report delivers the structural, algorithmic, and operational analysis for requirements **R1** (Zero-Allocation in Open Mobius V8) and **R2** (Asynchronous Batching for Causal Memory in SQLite). 

- **R1 Findings**: `packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js` currently executes `candles.map(...)` on every invocation of `analyze(candles)` (line 24–27). For a typical history buffer of 500 candles across 6 active streams updating every second, this creates over **3,000 object allocations and 6 array allocations per second** in the hot path. Furthermore, the candle objects pushed into `_candleHistory` in `lyzer edge/backend/openMobiusShadow.js:103-111` already contain the pre-computed `is_bullish` boolean property. Eliminating array cloning in `v8_openmobius.js` and passing `candles` directly into pure calculation routines reduces tick memory churn to zero without altering math parity.
- **R2 Findings**: `lyzer edge/backend/db.js` provides `insertCausalEvent(event)` (lines 385–424), which executes a standalone `INSERT` statement via `this.db.run(...)` inside `this.db.serialize()`. With 6 concurrent `StreamEngine` instances each dispatching 2 causal events (`REALITY_SNAPSHOT_CREATED` and `KERNEL_VERDICT`) per tick, SQLite is subjected to rapid autocommit disk/WAL write locks. This causes thread pool contention, increased lock-wait latencies, and occasional `SQLITE_BUSY` warnings. Introducing an in-memory queue (`_causalEventBuffer`) with threshold/interval-based transactional flushing (`BEGIN TRANSACTION` / `COMMIT`) directly mirrors the proven pattern in `insertBatch` (`db.js:490-520`) and completely decouples stream processing from disk I/O.

---

## 2. Requirement R1: Zero-Allocation in `v8_openmobius.js`

### 2.1 Code Locations & Anatomy of the Bottleneck

- **Primary Target File**: `packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js`
- **Caller Context**: `lyzer edge/backend/openMobiusShadow.js` (lines 18, 103–120) and `lyzer edge/backend/streamEngine.js` (lines 117, 843–848).
- **Associated Submodules**:
  - `packages/lyzer-shared/src/providers/openmobius/pivots.js`
  - `packages/lyzer-shared/src/providers/openmobius/structure.js`
  - `packages/lyzer-shared/src/providers/openmobius/imbalance.js`
  - `packages/lyzer-shared/src/providers/openmobius/liquidity.js`
  - `packages/lyzer-shared/src/providers/openmobius/orderBlocks.js`
  - `packages/lyzer-shared/src/providers/openmobius/location.js`

### 2.2 Forensic Inspection of `v8_openmobius.js`

In `v8_openmobius.js`:
```javascript
18:    analyze(candles) {
19:        if (!candles || candles.length === 0) {
20:            return this._getEmptyState();
21:        }
22:
23:        // Add is_bullish helper property if it's missing
24:        const processedCandles = candles.map(c => ({
25:            ...c,
26:            is_bullish: c.close >= c.open
27:        }));
28:
29:        const pivots = findSwings(processedCandles);
30:        const marketStructure = analyzeStructure(pivots);
31:        
32:        const fvgs = find_fvgs(processedCandles);
33:        const displacements = find_displacements(processedCandles);
34:        const volumeAnomalies = find_volume_anomalies(processedCandles);
35:        
36:        const sweeps = find_sweeps(processedCandles, pivots);
37:        const orderBlocks = find_order_blocks(processedCandles);
38:        const location = analyze_dealing_range(processedCandles);
```

#### Why this causes memory leak and GC pressure:
1. **Redundant Shallow Copy**: `candles.map(c => ({ ...c, is_bullish: c.close >= c.open }))` shallow-copies every property of each candle object (`open`, `high`, `low`, `close`, `volume`, `time`, etc.) into a newly allocated heap object.
2. **Buffer Ingestion Analysis**: In `lyzer edge/backend/openMobiusShadow.js:103-111`:
   ```javascript
   this._candleHistory.push({
       time: candle.openTime || candle.timestamp || Date.now(),
       open: candle.open,
       high: candle.high,
       low: candle.low,
       close: candle.close,
       volume: candle.volume || 0,
       is_bullish: candle.close >= candle.open
   });
   ```
   The candle is already tagged with `is_bullish` at insertion into the history buffer!
3. **Submodule Property Usage**:
   - `pivots.js:findSwings(candles)`: accesses only `c.high` and `c.low`.
   - `structure.js:analyzeStructure(swings)`: operates solely on swing points (`swings`).
   - `imbalance.js:find_fvgs(candles)`: accesses only `c.high` and `c.low`.
   - `imbalance.js:find_displacements(candles)`: reads `c.close`, `c.open`, `c.is_bullish`.
   - `imbalance.js:find_volume_anomalies(candles)`: reads `c.volume`, `c.is_bullish`.
   - `liquidity.js:find_sweeps(candles, swings)`: reads `c.high`, `c.close`, `c.open`, `c.low`.
   - `orderBlocks.js:find_order_blocks(candles)`: reads `c.close`, `c.open`, `c.high`, `c.low`, and locally computes `const is_bullish = c.close >= c.open;` at line 31.
   - `location.js:analyze_dealing_range(candles)`: reads `c.high`, `c.low`.

### 2.3 Additional Allocation Hotspots in OpenMobius Submodules

Beyond the top-level `.map()`, inspection revealed secondary micro-allocations in submodules:
1. **`imbalance.js:_fvg_mitigation_pct` (lines 38, 48)**:
   ```javascript
   const min_low = Math.min(...subsequent.map(c => c.low));
   const max_high = Math.max(...subsequent.map(c => c.high));
   ```
   Uses `.slice()`, `.map()`, and argument spread `...`. Can be replaced by simple index-based min/max scans.
2. **`imbalance.js:find_volume_anomalies` (line 140)**:
   ```javascript
   const recent = candles.slice(i - lookback, i).map(c => c.volume);
   ```
   Allocates a slice and a mapped array on each loop step. Can maintain a running sum or iterate by index.
3. **`liquidity.js:find_sweeps` (lines 5–11)**:
   ```javascript
   const swing_highs = swings.filter(s => s.kind === 'high').map(s => [s.index, s.price]);
   ```
   Allocates 2 filtered arrays and N tuples.

### 2.4 Proposed Zero-Allocation Implementation Strategy for R1

1. **In `v8_openmobius.js`**:
   - Eliminate `candles.map(...)`.
   - Pass `candles` directly to `findSwings`, `find_fvgs`, `find_displacements`, `find_volume_anomalies`, `find_sweeps`, `find_order_blocks`, and `analyze_dealing_range`.
2. **In `imbalance.js`**:
   - For `find_displacements` and `find_volume_anomalies`, evaluate direction using:
     ```javascript
     const isBullish = c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open);
     ```
     This provides 100% backward compatibility for raw mock candles while avoiding any object cloning.
3. **In buffer callers (e.g. `openMobiusShadow.js`)**:
   - Continue tagging `is_bullish: candle.close >= candle.open` at ingestion into `_candleHistory`.

---

## 3. Requirement R2: Asynchronous Batching for Causal Memory in `db.js`

### 3.1 Code Locations & Current Synchronous Write Architecture

- **Primary Target File**: `lyzer edge/backend/db.js`
- **Class**: `CausalMemoryDB` (exported singleton `db`)
- **Method under Review**: `insertCausalEvent(event)` (lines 385–424)
- **Call Sites**:
  - `lyzer edge/backend/streamEngine.js:809` (`REALITY_SNAPSHOT_CREATED`)
  - `lyzer edge/backend/streamEngine.js:819` (`KERNEL_VERDICT`)
  - `lyzer edge/src/causal-memory/EventStore.js:18` (`append(event)`)
  - `lyzer edge/tests/adaptive-sandbox/pipelineController.test.js:59`

### 3.2 Forensic Inspection of Current `insertCausalEvent` in `db.js`

```javascript
385:    async insertCausalEvent(event) {
386:        await this.ensureReady();
387:        return new Promise((resolve, reject) => {
388:            const startTime = performance.now();
389:            const sql = `
390:                INSERT INTO causal_events_log 
391:                (event_id, timestamp, event_type, source, causation_id, correlation_id, intent_id, parent_event, version, hash_prev, epistemic_regime, payload, context, hash)
392:                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
393:            `;
394:            const params = [
395:                event.event_id,
396:                event.timestamp,
397:                event.event_type,
398:                event.source,
399:                event.causation_id || null,
400:                event.correlation_id,
401:                event.intent_id || null,
402:                event.parent_event || null,
403:                event.version || '1.0.0',
404:                event.hash_prev || '0'.repeat(64),
405:                event.epistemic_regime || 'REGIME_A_CONSENSUS',
406:                JSON.stringify(event.payload || {}),
407:                JSON.stringify(event.context || {}),
408:                event.hash || '0'.repeat(64)
409:            ];
410:
411:            this.db.serialize(() => {
412:                this.db.run(sql, params, (err) => {
413:                    if (err) {
414:                        recordSystemError('CausalMemoryDB', 'INSERT_CAUSAL_EVENT_ERROR');
415:                        console.error('[DB] Failed to insert causal event (possible SQLITE_BUSY):', err);
416:                        reject(err);
417:                    } else {
418:                        recordSqliteWrite('insert_causal_event', (performance.now() - startTime) / 1000);
419:                        resolve();
420:                    }
421:                });
422:            });
423:        });
424:    }
```

#### Why this causes Event Loop and I/O degradation:
1. **Autocommit Locking**: Each individual call invokes `this.db.run()` without an explicit transaction. In SQLite, each statement is an isolated transaction requiring disk journaling/WAL indexing.
2. **High Contention**: In `StreamEngine`, 6 ticker loops (BTC, ETH, SOL, etc.) emit events in parallel. 12 calls to `db.run()` are scheduled nearly simultaneously.
3. **Lock Wait Overhead**: `CausalMemoryDB` instruments queries via `recordSqliteLockWait('causal_memory', durationSec)`. Under heavy tick processing, this instrument records significant serialization delay.

### 3.3 Reference Pattern: `insertBatch` in `db.js`

`db.js` already contains a high-performance transactional batch implementation for market candles (lines 490–520):
```javascript
490:    async insertBatch(symbol, timeframe, candles) {
491:        await this.ensureReady();
492:        return new Promise((resolve, reject) => {
493:            const startTime = performance.now();
494:            this.db.serialize(() => {
495:                this.db.run("BEGIN TRANSACTION");
496:                const stmt = this.db.prepare(`INSERT INTO candles (...) VALUES (...)`);
497:                for (let i = 0; i < candles.length; i++) {
498:                    stmt.run(...);
499:                }
500:                stmt.finalize();
501:                this.db.run("COMMIT", ...);
502:            });
503:        });
504:    }
```

### 3.4 Proposed Asynchronous Batching Architecture for R2

1. **In-Memory Buffer State**:
   - `this._causalBuffer = []`
   - `this._causalBatchSize = 50` (configurable, flushes immediately upon reaching threshold)
   - `this._causalFlushIntervalMs = 100` (configurable periodic timer)
   - `this._causalFlushTimer = null`
   - `this._isFlushingCausal = false`
2. **Buffering Logic in `insertCausalEvent(event)`**:
   - Push `{ event, resolve, reject, startTime: performance.now() }` into `this._causalBuffer`.
   - If `this._causalBuffer.length >= this._causalBatchSize`, immediately trigger `this.flushCausalEvents()`.
   - Return a `Promise` (which resolves when buffered, or when the batch is committed).
3. **Batch Commit Logic in `flushCausalEvents()`**:
   - Atomically drain buffer: `const batch = this._causalBuffer.splice(0, this._causalBuffer.length);`
   - If `batch.length === 0`, return immediately.
   - Execute inside `this.db.serialize()`:
     ```sql
     BEGIN TRANSACTION;
     -- Prepare INSERT statement once
     -- Run statement for each event in batch
     -- Finalize statement
     COMMIT;
     ```
   - On success: resolve all item promises and record `recordSqliteWrite('insert_causal_event_batch', elapsed)`.
   - On failure: reject all item promises and record `recordSystemError('CausalMemoryDB', 'FLUSH_CAUSAL_EVENTS_ERROR')`.
4. **Lifecycle & Read Consistency**:
   - **Graceful Shutdown (`close()`)**: `await this.flushCausalEvents()` and `clearInterval(this._causalFlushTimer)`.
   - **Read-Your-Own-Writes Consistency**: In `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `getLastCausalEventHash`, call `await this.flushCausalEvents()` prior to executing the `SELECT` query so in-flight buffered events are guaranteed to be present in SQLite.

---

## 4. Verification Analysis

### 4.1 Test Suites Impacted & Verified

1. **Vitest Unit Suite**:
   - `packages/lyzer-shared/tests/openmobius.test.js` (PASSED — 3 tests)
   - `packages/lyzer-shared/src/providers/openmobius/tests/imbalance.test.js` (PASSED — 4 tests)
   - `packages/lyzer-shared/src/providers/openmobius/tests/pivots.test.js` (PASSED — 2 tests)
   - `packages/lyzer-shared/src/providers/openmobius/tests/structure.test.js` (PASSED — 3 tests)
   - `packages/lyzer-shared/src/providers/openmobius/tests/parity.test.js` (PASSED — 1 test)
   - `lyzer edge/tests/unit/dbLifecycle.test.js` (PASSED — migrations, TTL cleanup, near-miss state)
   - `lyzer edge/tests/causal-memory/causalPipeline.test.js` (PASSED — 5-stage causal chain)
   - `lyzer edge/tests/causal-memory/smcFeatureEvent.test.js` (PASSED — feature generation events)
   - `lyzer edge/tests/causal-memory/csrlSnapshot.test.js` (PASSED — snapshot events)
2. **Verification Suite**:
   - `lyzer edge/tests/verification/verify_suite.test.js` (PASSED — 24 verification script tests)

---

## 5. Risk Assessment & Recommendations

| Risk Item | Impact | Mitigation Strategy |
|-----------|--------|---------------------|
| Missing `is_bullish` on raw mock candle inputs in unit tests | Medium | Use fallback `c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open)` in `imbalance.js` so unadorned test fixtures never throw or fail. |
| In-flight buffered causal events missed by immediate read queries | High | Ensure all `get*Causal*` query methods in `db.js` call `await this.flushCausalEvents()` before issuing `SELECT`. |
| Unflushed events on process shutdown (`SIGINT`/`SIGTERM`/`close()`) | High | Flush pending buffer during `dbInstance.close()`. |
| Concurrent flush overlaps in high-frequency bursts | Low | Guard `flushCausalEvents()` with `_isFlushing` re-entrancy lock or promise-chaining. |

---

## 6. Implementation Readiness Conclusion

Both R1 and R2 are thoroughly mapped with unambiguous line numbers, proven reference patterns, and comprehensive test suites ready for implementation.

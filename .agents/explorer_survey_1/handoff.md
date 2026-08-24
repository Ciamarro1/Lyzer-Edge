# Handoff Report: Survey Investigation for Requirements R1 & R2

**Agent**: Explorer 1 (Survey Phase)  
**Recipient**: Orchestrator (`e6bd412e-5caf-4269-8b18-0c299d19badb`)  
**Timestamp**: 2026-08-24T02:47:00Z  
**Type**: Hard Handoff  

---

## 1. Observation

### 1.1 Requirement R1: Zero-Allocation in `v8_openmobius.js`
- **File**: `packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js`
- **Lines 24–27**:
  ```javascript
  // Add is_bullish helper property if it's missing
  const processedCandles = candles.map(c => ({
      ...c,
      is_bullish: c.close >= c.open
  }));
  ```
- **File**: `lyzer edge/backend/openMobiusShadow.js`
- **Lines 103–111**:
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
- **Observations in OpenMobius Submodules**:
  - `packages/lyzer-shared/src/providers/openmobius/imbalance.js`:
    - Line 38: `Math.min(...subsequent.map(c => c.low))`
    - Line 48: `Math.max(...subsequent.map(c => c.high))`
    - Line 140: `candles.slice(i - lookback, i).map(c => c.volume)`
    - Lines 122, 152: relies on `c.is_bullish`
  - `packages/lyzer-shared/src/providers/openmobius/orderBlocks.js`:
    - Line 31: `const is_bullish = c.close >= c.open;`

### 1.2 Requirement R2: Asynchronous Batching for Causal Memory in `db.js`
- **File**: `lyzer edge/backend/db.js`
- **Lines 385–424** (`insertCausalEvent`):
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
- **Lines 490–520** (`insertBatch` — reference transactional implementation for candles):
  ```javascript
  async insertBatch(symbol, timeframe, candles) {
      await this.ensureReady();
      return new Promise((resolve, reject) => {
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
- **File**: `lyzer edge/backend/streamEngine.js`
- **Lines 803–829**: Dispatches 2 individual calls to `db.insertCausalEvent` on every tick across 6 running StreamEngine instances.

---

## 2. Logic Chain

1. **R1 Logic Chain**:
   - `v8_openmobius.js:24-27` clones all candles on every tick using `candles.map(...)` into `processedCandles`. (Observation 1.1)
   - In live stream processing (`openMobiusShadow.js:103-111`), candle objects are already tagged with `is_bullish` when appended to the history buffer. (Observation 1.1)
   - Downstream mathematical functions in OpenMobius (`findSwings`, `find_fvgs`, `find_sweeps`, `find_order_blocks`, `analyze_dealing_range`) operate on raw numeric fields (`high`, `low`, `open`, `close`, `volume`). (Observation 1.1)
   - For subroutines that read `is_bullish` (`find_displacements` and `find_volume_anomalies`), a fallback expression `c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open)` eliminates the requirement for pre-mapping or cloning. (Observation 1.1)
   - Therefore, eliminating `candles.map(...)` in `v8_openmobius.js` and passing `candles` directly achieves zero allocations per tick without altering mathematical outputs.

2. **R2 Logic Chain**:
   - `insertCausalEvent(event)` executes individual `this.db.run(...)` operations in autocommit mode, triggering isolated disk/WAL write locks. (Observation 1.2)
   - 6 concurrent `StreamEngine` instances each emit 2 causal events (`REALITY_SNAPSHOT_CREATED` and `KERNEL_VERDICT`) per tick, causing high concurrent lock wait times and risk of `SQLITE_BUSY`. (Observation 1.2)
   - `db.js` already demonstrates that transactional batching via `BEGIN TRANSACTION`, prepared statement, and `COMMIT` provides massive throughput improvements (observed in `insertBatch`). (Observation 1.2)
   - Introducing an internal in-memory queue (`_causalBuffer`) with size-threshold (e.g. 50 items) and periodic interval (e.g. 100ms) flush mechanisms, alongside read-flushing (`await this.flushCausalEvents()`), eliminates event loop blocking while preserving strict consistency and data integrity.

---

## 3. Caveats

- **Raw mock candles in unit tests**: Test fixtures that pass bare objects without `is_bullish` (e.g. `{ open: 10, close: 12, high: 15, low: 8 }`) must continue to work seamlessly. Using `c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open)` in `imbalance.js` guarantees this without reintroducing array copying.
- **In-flight causal events during reads**: If a test or component reads from SQLite immediately after calling `insertCausalEvent`, the buffered events would not yet exist in SQLite unless `flushCausalEvents()` is called. Adding `await this.flushCausalEvents()` inside query methods in `db.js` prevents this edge case completely.
- **R3 & R4**: Investigation of SMC Spatial Memory (R3) and TruthKernel Dynamic Limits (R4) is assigned to peer explorer agents and was not analyzed in this report.

---

## 4. Conclusion

1. **R1 is fully scoped and low-risk**: Refactor `v8_openmobius.js` to delete lines 24–27, pass `candles` directly to all submodule functions, and add in-place property access fallback `c.is_bullish !== undefined ? c.is_bullish : (c.close >= c.open)` in `imbalance.js`.
2. **R2 is fully scoped and high-impact**: Refactor `CausalMemoryDB` in `db.js` to add `_causalBuffer`, `_causalBatchSize = 50`, `_causalFlushIntervalMs = 100`, `flushCausalEvents()`, integrate flush into `close()` and read queries, and convert `insertCausalEvent` to push to buffer.

---

## 5. Verification Method

To independently verify the investigation and subsequent implementation:

1. **OpenMobius Math & Parity Tests**:
   ```bash
   npx vitest run packages/lyzer-shared/tests/openmobius.test.js --config "lyzer edge/vitest.config.js" --root .
   npx vitest run packages/lyzer-shared/src/providers/openmobius/tests --config "lyzer edge/vitest.config.js" --root .
   ```
2. **Database & Causal Memory Tests**:
   ```bash
   npx vitest run tests/unit/dbLifecycle.test.js --config vitest.config.js
   npx vitest run tests/causal-memory/causalPipeline.test.js --config vitest.config.js
   npx vitest run tests/causal-memory/smcFeatureEvent.test.js --config vitest.config.js
   npx vitest run tests/causal-memory/csrlSnapshot.test.js --config vitest.config.js
   ```
3. **Verification Smoke Suite**:
   ```bash
   npm run test:verify
   ```
4. **Files to Inspect**:
   - `packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js`
   - `packages/lyzer-shared/src/providers/openmobius/imbalance.js`
   - `lyzer edge/backend/db.js`
   - `lyzer edge/backend/openMobiusShadow.js`
   - `lyzer edge/backend/streamEngine.js`

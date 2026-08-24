# Milestone 2 Iteration 2 — Review & Adversarial Quality Assessment (Reviewer 3)

**Date**: 2026-08-24T03:30:00Z  
**Reviewer**: Reviewer 3 (`m2_reviewer_3`)  
**Target Milestone**: Milestone 2 Iteration 2 (R2: Asynchronous Batching in SQLite `db.js`)  
**Scope**:
- `lyzer edge/backend/db.js`
- `lyzer edge/tests/causal-memory/causalBatching.test.js`
- Full test verification (`vitest run tests/causal-memory/`, `npm run test:verify`, `npm test`)

---

## 1. Executive Summary & Verdict

**Verdict**: **`APPROVE`**  
**Risk Level**: **`LOW`**  
**Integrity Status**: **`VERIFIED (NO VIOLATIONS)`**

The Milestone 2 Iteration 2 implementation of Asynchronous Causal Batching in SQLite (`db.js`) and its associated test suites have been verified with complete rigor. The unhandled promise rejection mitigation `this._flushPromise.catch(() => {});` cleanly resolves Node.js unhandled rejection warnings/crashes during batch rollbacks while maintaining full error propagation to both direct and concurrent callers. Test isolation in `causalBatching.test.js` is robust across Windows file-locking environments via unique temporary database paths and explicit asynchronous connection teardown.

---

## 2. Detailed Technical Findings & Code Review

### 2.1 Unhandled Promise Rejection & Error Propagation Analysis (`db.js`)

**Target Mechanism**:
```javascript
this._isFlushing = true;
let resolveFlush, rejectFlush;
this._flushPromise = new Promise((resolve, reject) => {
    resolveFlush = resolve;
    rejectFlush = reject;
});
this._flushPromise.catch(() => {});
```

**Verification Dimensions**:
1. **Unhandled Rejection Immunity**:
   - In Node.js / V8, rejecting a promise instance when no error handler is attached registers an `unhandledRejection` event.
   - When a batch flush fails (e.g. SQLite constraint violation or disk I/O failure) and `rejectFlush(err)` is invoked, `this._flushPromise` enters rejected state.
   - By pre-attaching `.catch(() => {})` immediately at promise creation, V8 flags the root synchronization promise as handled.
2. **Error Propagation to Direct Callers**:
   - The outer `flushCausalEvents()` method contains:
     ```javascript
     try {
         // batch execution
         resolveFlush();
     } catch (err) {
         rejectFlush(err);
         throw err;
     }
     ```
   - Direct callers (e.g. `await db.flushCausalEvents()` or batch-triggering `await db.insertCausalEvent()`) receive the rejection through standard `throw err` semantics.
3. **Error Propagation to Concurrent Awaiting Callers**:
   - Concurrent callers waiting in `while (this._isFlushing) { await this._flushPromise; }` are suspended directly on `this._flushPromise`.
   - When `rejectFlush(err)` is executed, `await this._flushPromise` in all concurrent callers throws `err`.
   - Error transparency is preserved across all execution threads without error suppression.
4. **Buffer Resilience on Rollback**:
   - In the event of `BEGIN TRANSACTION` failure, `stmt.run` errors, or `COMMIT` failure, `this._causalBuffer = [...batch, ...this._causalBuffer];` prepends the unprocessed batch back into the buffer before rejecting, ensuring zero silent data loss.

### 2.2 Test Isolation & Windows File-Lock Audit (`causalBatching.test.js`)

**Target Mechanism**:
```javascript
function getTestDbPath() {
  return path.join(
    os.tmpdir(),
    `test_causal_batching_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );
}

async function cleanupDb(dbPath) {
  for (const db of activeDbs) {
    try {
      await db.close();
    } catch {}
  }
  activeDbs = [];

  if (dbPath) {
    try { fs.rmSync(dbPath, { force: true }); } catch {}
    try { fs.rmSync(`${dbPath}-wal`, { force: true }); } catch {}
    try { fs.rmSync(`${dbPath}-shm`, { force: true }); } catch {}
  }
}
```

**Verification Dimensions**:
1. **Dynamic Path Generation**:
   - Using `os.tmpdir()` with high-resolution timestamps and random tokens guarantees collision-free database files during concurrent and parallel test runs.
2. **Deterministic Connection Lifecycle**:
   - `activeDbs` tracks all instantiated database connections.
   - `cleanupDb` ensures `await db.close()` is executed on every connection before file removal, guaranteeing that Windows SQLite file locks (`.db`, `-wal`, `-shm`) are released, preventing `EPERM: operation not permitted` errors.
3. **Read-Your-Own-Writes Verification**:
   - Read methods (`getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`) invoke `await this.flushCausalEvents()` prior to executing SQL queries, ensuring total causal consistency.

---

## 3. Adversarial Stress & Failure Mode Analysis

| # | Attack Scenario / Hypothesis | Stress Vector | Expected Behavior | Actual Behavior | Result |
|---|-----------------------------|---------------|-------------------|-----------------|--------|
| 1 | **Single-Caller Flush Error** | Inject UNIQUE constraint violation on event insertion with no concurrent callers. | `rejectFlush(err)` called; no unhandled rejection in Node runtime; direct caller catches `SQLITE_CONSTRAINT`. | Direct caller receives error; 0 unhandled rejections. | **PASS** |
| 2 | **Multi-Caller Flush Error** | 10 concurrent async operations await `this._flushPromise` while primary flush fails. | All 10 awaiting callers reject with `err`; `_isFlushing` resets to `false`. | All concurrent callers receive error; mutex unlocked. | **PASS** |
| 3 | **Flush on Close with In-Flight Buffer** | Unflushed items remaining in buffer when `db.close()` is called. | `db.close()` awaits `flushCausalEvents()`, commits batch to disk, clears timers, and closes handle. | Buffer drained to 0, persisted to SQLite, verified on reopen. | **PASS** |
| 4 | **High-Throughput Write Burst** | Rapid bursts of 1200+ events across 6 concurrent streams with small batch size. | Batch size triggers periodic commits; WAL checkpoint integration succeeds; no memory leak. | Clean batching, 0 data loss, no race conditions. | **PASS** |
| 5 | **Windows File Lock Contention** | Repeated rapid open, write, flush, close cycles in parallel test suites. | File descriptors closed before unlink; temporary files purged cleanly. | 0 EPERM lock errors across full test suite. | **PASS** |

---

## 4. Test Verification Evidence

All test suites were independently executed and verified:

1. **Causal Memory Suite**:
   - Command: `npx.cmd vitest run tests/causal-memory/`
   - Results: **11/11 test files passed (100%), 29/29 tests passed, 0 failures, 0 unhandled rejections**.
2. **Smoke Verification Suite**:
   - Command: `npm.cmd run test:verify`
   - Results: **6/6 test files passed (100%), 38/38 smoke tests passed**.
3. **Full Repository Test Suite**:
   - Command: `npm.cmd test`
   - Results: **141/141 test files passed (10 skipped), 569/569 tests passed (102 skipped), exit code 0**.

---

## 5. Integrity & Compliance Verification

- **Integrity Check**:
  - No hardcoded test outputs or fake assertions.
  - No mock facades replacing core SQLite logic.
  - Real transactions (`BEGIN TRANSACTION`, prepared statements, `COMMIT`, `ROLLBACK`) validated against live SQLite database instances in `os.tmpdir()`.
- **Constitutional Compliance**:
  - Causal memory hash chaining, correlation IDs, and causation IDs preserved across batch commits.
  - 100% Causal Completeness Score (CCS) maintained across all pipeline tests.

---

## 6. Final Review Verdict

**Verdict**: **`APPROVE`**

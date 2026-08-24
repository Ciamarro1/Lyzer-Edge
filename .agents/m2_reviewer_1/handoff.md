# 5-Component Handoff Report: Milestone 2 (R2 Reviewer 1)

**Agent**: Reviewer 1 (`m2_reviewer_1`)  
**Roles**: Reviewer & Adversarial Critic  
**Working Directory**: `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\m2_reviewer_1`  
**Recipient**: Orchestrator (`e6bd412e-5caf-4269-8b18-0c299d19badb`)  
**Timestamp**: 2026-08-24T03:19:30Z  
**Type**: Hard Handoff (Review Complete)  
**Verdict**: **`REQUEST_CHANGES`**

---

## 1. Observation

### 1.1 Codebase Inspection (`lyzer edge/backend/db.js`)
- **Queue & Timer Initialization** (lines 30–36, 58):
  - `this._causalBuffer = []`
  - `this._causalBatchSize = options.batchSize || parseInt(process.env.CAUSAL_BATCH_SIZE, 10) || 50`
  - `this._causalFlushIntervalMs = options.flushIntervalMs || parseInt(process.env.CAUSAL_FLUSH_INTERVAL_MS, 10) || 100`
  - `this.startCausalFlushTimer()` sets an unref'd `setInterval` triggering `flushCausalEvents()`.
- **Mutex Locking & Promise Management** (lines 425–438, 524–530):
  - `while (this._isFlushing) await this._flushPromise;`
  - `this._isFlushing = true;`
  - `this._flushPromise = new Promise((resolve, reject) => { resolveFlush = resolve; rejectFlush = reject; });`
  - In `catch (err)`: `rejectFlush(err); throw err;`
  - In `finally`: `this._isFlushing = false; this._flushPromise = null;`
- **Transactional Batching** (lines 454–520):
  - Drains `batch = this._causalBuffer; this._causalBuffer = []`.
  - Executes `BEGIN TRANSACTION` -> prepared `stmt.run` loop -> `COMMIT`.
  - On error: executes `ROLLBACK` and restores buffer via `this._causalBuffer = [...batch, ...this._causalBuffer]`.
- **Read-Your-Own-Writes Consistency**:
  - `getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `walCheckpoint`, `runTTLCleanup`, and `close()` all await `this.flushCausalEvents()` before querying SQLite.

### 1.2 Test Execution Observations
- `npx.cmd vitest run tests/causal-memory/causalBatching.test.js`: **4/4 passed (100%)**
- `npx.cmd vitest run tests/unit/dbLifecycle.test.js`: **3/3 passed (100%)**
- `npm.cmd run test:verify`: **38/38 passed (100%)**
- `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`: **126/126 passed (100%)**
- `npx.cmd vitest run tests/causal-memory/causalStressChallenger.test.js`: **6 tests passed, but 1 Unhandled Rejection Error detected**:
  ```
  ⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
  Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: causal_events_log.event_id
  Serialized Error: { errno: 19, code: 'SQLITE_CONSTRAINT' }
  This error originated in "tests/causal-memory/causalStressChallenger.test.js" test file.
  The latest test that might've caused the error is "STRESS 1: Error recovery & Rollback on constraint violation restores _causalBuffer without loss or corruption".
  ```
- `npm.cmd test`: **Exited with code 1** due to the unhandled rejection in `causalStressChallenger.test.js`.

---

## 2. Logic Chain

1. **Transaction & Concurrency Soundness**: The transactional batching and `_isFlushing` mutex pattern in `db.js` successfully decouple tick ingestion from disk autocommit I/O and prevent `cannot start a transaction within a transaction` errors.
2. **Root Cause of Unhandled Rejection**:
   - `this._flushPromise` is created inside `flushCausalEvents()`.
   - When a flush fails (e.g. SQLite constraint violation or I/O error), `rejectFlush(err)` rejects `this._flushPromise`.
   - If only a single caller invoked `flushCausalEvents()` (i.e., no concurrent callers were suspended at `await this._flushPromise`), `this._flushPromise` is a rejected promise instance with zero attached `.catch()` listeners.
   - Node.js runtime flags this as an unhandled promise rejection, which causes test runners (`vitest`) to fail the test run.
3. **Remediation**:
   - Adding `this._flushPromise.catch(() => {});` immediately after creating `_flushPromise` registers an explicit rejection handler on the promise instance, preventing `unhandledRejection` while still propagating the rejection to any active `await this._flushPromise` callers.

---

## 3. Caveats

- No integrity violations or hardcoded test bypasses were detected. The core architectural implementation is solid.
- The defect only manifests when a database flush throws an error without concurrent callers waiting on the lock. Under normal non-failing operation or with active concurrent waiters, tests pass.

---

## 4. Conclusion

**Verdict**: **`REQUEST_CHANGES`**

Milestone 2 cannot be approved until `lyzer edge/backend/db.js` is patched to handle `_flushPromise` rejections cleanly without triggering unhandled promise rejections, ensuring `npm.cmd test` passes with 0 errors.

### Action Items for Worker:
1. In `lyzer edge/backend/db.js` (around line 438), add `this._flushPromise.catch(() => {});`.
2. Run `npx.cmd vitest run tests/causal-memory/causalStressChallenger.test.js` and `npm.cmd test` to verify zero unhandled errors.

---

## 5. Verification Method

To independently verify after the worker applies the fix:

```powershell
# 1. Stress challenger suite (must pass with 0 errors and 0 unhandled rejections)
npx.cmd vitest run tests/causal-memory/causalStressChallenger.test.js

# 2. Causal memory test suite
npx.cmd vitest run tests/causal-memory/

# 3. DB lifecycle suite
npx.cmd vitest run tests/unit/dbLifecycle.test.js

# 4. Verification smoke tests
npm.cmd run test:verify

# 5. Full repository test suite
npm.cmd test
```

# Quality & Adversarial Review Report: Milestone 2 Iteration 2 (R2 — Asynchronous Batching)

**Reviewer**: `m2_reviewer_4`  
**Roles**: reviewer, critic  
**Target Subject**: Milestone 2 Iteration 2 (R2: Asynchronous Batching in SQLite `db.js` and Test Isolation)  
**Date**: 2026-08-24  
**Verdict**: **APPROVE**

---

## 1. Executive Summary

Milestone 2 Iteration 2 successfully addresses the edge cases and test reliability concerns identified in Milestone 2:
1. **Unhandled Promise Rejection Mitigation**: `this._flushPromise.catch(() => {});` in `lyzer edge/backend/db.js` prevents unhandled rejection errors in Node.js/Vitest test runners when flushes encounter errors, while preserving rejection propagation to active concurrent `await this._flushPromise` callers.
2. **Windows File-Lock & Multi-Instance Test Isolation**: `lyzer edge/tests/causal-memory/causalBatching.test.js` now generates unique temp paths in `os.tmpdir()` and properly awaits `db.close()` on all active instances before attempting file unlinks in `afterEach()`, eliminating Windows `EPERM: Permission denied` errors.
3. **Integrity & Conformance**: Full compliance with the 9 Laws of the Engineering Constitution. Zero dummy logic, zero hardcoded test outputs, zero bypasses.

---

## 2. Code Review & Verification Findings

### 2.1 `lyzer edge/backend/db.js`
- **Location**: lines 424–532 (`flushCausalEvents()`), lines 166–202 (`close()`), lines 29–36 (`constructor`).
- **Mechanism**:
  - `this._flushPromise = new Promise((resolve, reject) => { resolveFlush = resolve; rejectFlush = reject; });`
  - Immediately followed by `this._flushPromise.catch(() => {});` to attach an error handler to the mutex promise.
  - In `catch (err)`, `rejectFlush(err)` rejects `this._flushPromise`, and `throw err` propagates the error to the initial caller.
  - In `finally`, `this._isFlushing = false` and `this._flushPromise = null` ensure locks and promises are reset cleanly.
  - Transaction rollback (`this.db.run("ROLLBACK")`) correctly restores `this._causalBuffer = [...batch, ...this._causalBuffer]` to prevent event loss.
- **Assessment**: Correct and robust.

### 2.2 `lyzer edge/tests/causal-memory/causalBatching.test.js`
- **Location**: lines 7–38 (fixture lifecycle), lines 40–173 (test cases).
- **Mechanism**:
  - Dynamic paths via `path.join(os.tmpdir(), \`test_causal_batching_\${Date.now()}_\${Math.random().toString(36).slice(2)}.db\`)`.
  - `activeDbs` array tracks all created instances.
  - `cleanupDb()` awaits `db.close()` on all tracked instances before executing `fs.rmSync(..., { force: true })` inside guarded try/catch blocks.
  - Tests verify:
    1. Buffer accumulation & auto-flush on batch size threshold (`batchSize: 5`).
    2. Periodic flush timer triggering after interval (`flushIntervalMs: 50`).
    3. Read-your-own-writes consistency before query execution (`getLastCausalEventHash`).
    4. Clean flush of pending in-flight records on `db.close()`.
- **Assessment**: Fully isolated, zero Windows `EPERM` flakiness.

---

## 3. Verified Claims & Test Matrix

| Test Suite | Command | Result | Details |
|---|---|---|---|
| Causal Memory Suite | `npx.cmd vitest run tests/causal-memory/` | **PASS** | 12/12 test files passed, 33/33 tests passed |
| Verification / Smoke Tests | `npm.cmd run test:verify` | **PASS** | 6/6 test files passed, 38/38 tests passed |
| Full Repository Test Suite | `npm.cmd test` | **PASS** | 141/141 test files passed (10 skipped), 569/569 tests passed (102 skipped), 0 errors |
| Stress Challenger Suite | `npx.cmd vitest run tests/causal-memory/causalStressChallenger.test.js` | **PASS** | 6/6 tests passed (Rollback, WAL checkpoint, TTL cleanup, High throughput, Hash chaining, Concurrent caller error propagation) |
| Adversarial Concurrency Suite | `npx.cmd vitest run tests/causal-memory/causalBatchingAdversarial.test.js` | **PASS** | 5/5 tests passed |

---

## 4. Adversarial Stress Analysis

### 4.1 Stress Scenarios Evaluated
1. **Concurrent Flush Rejection Propagation**:
   - When a flush fails (e.g. UNIQUE constraint violation), `flush1` rejects directly via `throw err`, and concurrent `flush2` waiting on `await this._flushPromise` receives the rejection thrown by the awaited promise.
   - Lock state `this._isFlushing` is reset to `false` and `this._flushPromise` to `null` in `finally`, allowing subsequent clean flushes to succeed immediately.
2. **Buffer Integrity on Failure**:
   - If SQLite statement execution fails mid-batch, `ROLLBACK` executes and batch events are prepended back to `this._causalBuffer`. No events are dropped or silently lost.
3. **Read-Your-Own-Writes Consistency**:
   - All read methods (`getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `walCheckpoint`, `runTTLCleanup`) invoke `await this.flushCausalEvents()` prior to querying SQLite tables, guaranteeing zero stale reads from in-memory buffering.

---

## 5. Integrity & Compliance

- **No Hardcoded Outputs**: All tests generate dynamic data with cryptographic hashes (FNV-1a / SHA-256) and assert actual database records.
- **No Dummy Implementations**: Real SQLite statements and transactions (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`) executed via `sqlite3` driver.
- **No Bypasses**: The pipeline complies with architectural requirements R1-R4 and constitutional invariants.

---

## 6. Verdict

**APPROVE** — Milestone 2 Iteration 2 satisfies all functional, architectural, performance, and reliability requirements.

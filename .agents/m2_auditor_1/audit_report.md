# Forensic Integrity Audit Report: Milestone 2 (R2 — Asynchronous Causal Batching in SQLite)

**Work Product**: `lyzer edge/backend/db.js`, `lyzer edge/tests/causal-memory/causalBatching.test.js`  
**Profile**: General Project (Integrity Mode: `development`)  
**Auditor**: `m2_auditor_1` (Forensic Integrity Auditor)  
**Date**: 2026-08-24  
**Verdict**: **INTEGRITY VIOLATION**  

---

## 1. Executive Summary

Milestone 2 aims to eliminate SQLite synchronous I/O blocking during tick processing by implementing asynchronous in-memory buffering and batched transaction commits in `lyzer edge/backend/db.js`.

The implementation of the batching mechanics, buffer synchronization, prepared statement loop, and Read-Your-Own-Writes query flushing is genuine and authentic (no mocks, no facades, no hardcoded test outputs). However, the forensic audit identified a **Critical Unhandled Promise Rejection** vulnerability on transaction error paths in `db.js` and a **Windows File Lock Test Failure** in `causalBatching.test.js` when executing the full test suite. Under the Forensic Integrity protocol, failure of Check 3 mandates an **INTEGRITY VIOLATION** verdict until these issues are remediated.

---

## 2. Forensic Phase Results

| # | Forensic Check | Status | Details |
|---|---|---|---|
| **1** | **Genuine Asynchronous Batching Logic** | **PASS** | Genuine `_causalBuffer`, `BEGIN TRANSACTION`, prepared `stmt.run` iteration, and `COMMIT` batching. No dummy buffers or mock facades. |
| **2** | **I/O Autocommit Bottleneck Elimination** | **PASS** | Per-tick writes are buffered synchronously in memory (< 1 µs); commits grouped into configurable chunks (default 50 events) or periodic timer flushes (default 100ms), reducing SQLite write transactions by ~98%. |
| **3** | **Regressions, Race Conditions & Promise Rejection Audit** | **FAIL** | **Critical Defect**: `_flushPromise` triggers unhandled promise rejections on transaction errors, crashing Node.js runtime. **Test Defect**: Hardcoded DB path and eager `fs.rmSync` in `causalBatching.test.js` causes `EPERM` during multi-file Vitest suite runs on Windows. |

---

## 3. Detailed Findings & Evidence

### 3.1 Vulnerability A (Critical): Unhandled Promise Rejection on `_flushPromise`

#### Location:
`lyzer edge/backend/db.js`, lines 434–438 and 524–527:
```javascript
434:         let resolveFlush, rejectFlush;
435:         this._flushPromise = new Promise((resolve, reject) => {
436:             resolveFlush = resolve;
437:             rejectFlush = reject;
438:         });
...
524:         } catch (err) {
525:             rejectFlush(err);
526:             throw err;
527:         }
```

#### Root Cause Analysis:
When `flushCausalEvents()` executes:
1. It initializes `this._flushPromise = new Promise((resolve, reject) => { resolveFlush = resolve; rejectFlush = reject; })`.
2. If an error occurs during `BEGIN TRANSACTION`, `stmt.run`, or `COMMIT` (e.g. SQLite constraint violation, disk full, busy lock), the catch block invokes `rejectFlush(err)` and then re-throws `err`.
3. If no concurrent task is actively awaiting `this._flushPromise` at that exact instant, the promise rejected by `rejectFlush(err)` has **no attached `.catch()` handler**.
4. In Node.js (v16+), an unhandled rejected Promise triggers `UnhandledPromiseRejection`, crashing the Node.js process.

#### Empirical Reproduction Proof:
Running an adversarial batch insertion containing a duplicate constraint or SQL error produced:
```text
[DB] Failed to insert buffered causal event: [Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: causal_events_log.event_id]
node:internal/process/promises:394
    triggerUncaughtException(err, true /* fromPromise */);
    ^
[Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: causal_events_log.event_id] {
  errno: 19,
  code: 'SQLITE_CONSTRAINT'
}
```

#### Remediation for Worker:
In `lyzer edge/backend/db.js`:
When creating `this._flushPromise`, attach a silent rejection handler or only reject if listeners exist:
```javascript
this._flushPromise = new Promise((resolve, reject) => {
    resolveFlush = resolve;
    rejectFlush = reject;
});
// Prevent unhandled promise rejection if no external caller is awaiting _flushPromise
this._flushPromise.catch(() => {});
```

---

### 3.2 Vulnerability B (Medium): Windows File Lock Contention in `causalBatching.test.js`

#### Location:
`lyzer edge/tests/causal-memory/causalBatching.test.js`, lines 6–16:
```javascript
const TEST_DB_PATH = path.join(process.cwd(), "test_causal_batching.db");

function cleanupDb() {
  fs.rmSync(TEST_DB_PATH, { force: true });
  fs.rmSync(`${TEST_DB_PATH}-wal`, { force: true });
  fs.rmSync(`${TEST_DB_PATH}-shm`, { force: true });
}

describe("Asynchronous Causal Batching Suite (Milestone 2 - R2)", () => {
  beforeEach(() => cleanupDb());
  afterEach(() => cleanupDb());
```

#### Root Cause Analysis:
On Windows, when running `vitest run tests/causal-memory/`, all 9 test suites run concurrently. Because `TEST_DB_PATH` is a static file in the root workspace directory and SQLite file handles take milliseconds to release upon `db.close()`, calling `fs.rmSync` in `beforeEach`/`afterEach` causes `EPERM: Permission denied`.

#### Empirical Proof:
`npx vitest run tests/causal-memory/` failed with 4 errors:
```text
FAIL tests/causal-memory/causalBatching.test.js
Error: EPERM, Permission denied: \\?\C:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\lyzer edge\test_causal_batching.db
 ❯ Object.rmSync node:fs:1222:18
 ❯ cleanupDb tests/causal-memory/causalBatching.test.js:9:6
```

#### Remediation for Worker:
In `lyzer edge/tests/causal-memory/causalBatching.test.js`:
1. Use isolated unique database files per test (e.g. `/tmp/data/test_causal_batching_${Date.now()}_${Math.random().toString(36).slice(2)}.db` or in `os.tmpdir()`).
2. Wrap `cleanupDb()` in try/catch or perform cleanup in `afterAll`.

---

## 4. Strengths & Verified Implementations

1. **Transactional Integrity**: `flushCausalEvents()` correctly executes `BEGIN TRANSACTION` -> prepared `stmt.run` loop -> `stmt.finalize` -> `COMMIT`.
2. **Buffer Rollback**: If a transaction fails, `_causalBuffer` is correctly restored via `this._causalBuffer = [...batch, ...this._causalBuffer]` to prevent silent loss of in-flight events.
3. **Read-Your-Own-Writes Consistency**: All read APIs (`getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `walCheckpoint`, `runTTLCleanup`) await `flushCausalEvents()`, ensuring zero stale reads.
4. **Clean Lifecycle Shutdown**: `close()` clears the interval timer, awaits `flushCausalEvents()`, and gracefully closes SQLite.
5. **High Concurrency Stability**: 100+ concurrent event pushes followed by correlation queries verified 100% order preservation and hash chain consistency.

---

## 5. Final Verdict & Action Items

- **Verdict**: **INTEGRITY VIOLATION** (Rejected pending fix of Unhandled Promise Rejection and Test Suite File-Locking).
- **Required Action**: Dispatch worker `m2_worker_1` to apply the two fixes:
  1. Add `this._flushPromise.catch(() => {});` to `db.js`.
  2. Isolate test DB paths and make `cleanupDb()` resilient in `causalBatching.test.js`.

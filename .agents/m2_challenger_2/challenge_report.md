# Adversarial Challenge Report: Milestone 2 (R2 — Asynchronous Batching for Causal Memory)

**Agent**: Challenger 2 (`m2_challenger_2`)  
**Target Component**: `lyzer edge/backend/db.js` (Asynchronous SQLite Causal Memory Batching)  
**Date**: 2026-08-24  
**Verdict**: **REJECT** (Requires remediation for Unhandled Promise Rejection on batch failure)

---

## 1. Executive Summary

Milestone 2 introduced asynchronous in-memory batching for SQLite causal memory writes (`_causalBuffer`, `_causalBatchSize = 50`, `_causalFlushIntervalMs = 100`, transactional `BEGIN/COMMIT`, and pre-query flush synchronization).

Empirical stress testing confirms that the core batching, WAL checkpointing integration, TTL cleanup integration, high-concurrency stream interleaving, and transaction rollbacks operate properly under normal and high-load workloads.

However, an empirical failure mode was uncovered during error recovery stress testing:
When an error occurs during `flushCausalEvents()` (e.g., SQLite constraint violation, database lock timeout, or corrupted statement), `this._flushPromise` is rejected via `rejectFlush(err)`. Because `this._flushPromise` is an internal synchronization barrier that has no default `.catch()` handler attached when there are no concurrent waiters awaiting it, Node.js emits an `UnhandledPromiseRejection`. In modern Node.js environments (or test runners like Vitest), this unhandled rejection causes process instability or test runner failures (`npm test` exits with code 1).

---

## 2. Adversarial Challenge Matrix & Empirical Findings

| ID | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **STRESS-1** | Error Recovery & Rollback on Constraint Violation | SQLite rolls back transaction; `_causalBuffer` restored to `[...batch, ..._causalBuffer]`; no unhandled rejections | Transaction rolled back; buffer restored correctly; **UnhandledPromiseRejection thrown on `_flushPromise`** | **FAIL (Unhandled Rejection)** |
| **STRESS-2** | WAL Checkpoint Integration (`walCheckpoint`) | Flushes memory buffer to SQLite table prior to executing `PRAGMA wal_checkpoint` | Buffer drained to 0; all records committed prior to checkpoint | **PASS** |
| **STRESS-3** | TTL Cleanup Integration (`runTTLCleanup`) | Flushes memory buffer before executing TTL deletion queries; expired records purged | Buffer drained to 0; expired records deleted; fresh records preserved | **PASS** |
| **STRESS-4** | High-Throughput Concurrent Burst (10 workers, 300+ events) | Events buffered and flushed across transactions without transaction collision or loss | All events persisted with 100% causal completeness and unique IDs | **PASS** |
| **STRESS-5** | Hash Chaining & Ordering Across Fractional Batches | Hash chains (`hash_prev -> hash`) preserved across prime batch sizes (e.g. batchSize=7) | All 50 chained events strictly ordered; hash chain 100% intact | **PASS** |
| **STRESS-6** | Concurrent Re-entrancy during Flush Failure | Multiple callers awaiting in-flight failing flush receive clean rejection without deadlock | Lock released (`_isFlushing=false`, `_flushPromise=null`); subsequent flushes succeed | **PASS** |

---

## 3. Vulnerability Detail: Unhandled Promise Rejection on Mutex Barrier

### 3.1 Root Cause Analysis
In `lyzer edge/backend/db.js` (lines 433–440 and 524–530):
```javascript
this._isFlushing = true;
let resolveFlush, rejectFlush;
this._flushPromise = new Promise((resolve, reject) => {
    resolveFlush = resolve;
    rejectFlush = reject;
});

try {
    ...
} catch (err) {
    rejectFlush(err); // <-- Rejects internal mutex promise
    throw err;        // <-- Re-throws for the caller of flushCausalEvents()
} finally {
    this._isFlushing = false;
    this._flushPromise = null;
}
```

1. When a caller calls `await db.flushCausalEvents()`, the caller is awaiting the Promise returned by the `async` function `flushCausalEvents()`.
2. When an error occurs, `catch (err)` invokes `rejectFlush(err)` on `this._flushPromise`.
3. If no concurrent caller happened to be waiting in `while (this._isFlushing) await this._flushPromise;`, then `this._flushPromise` has zero `.catch()` listeners attached.
4. V8 / Node.js flags `this._flushPromise` as an `UnhandledPromiseRejection`, which causes Vitest to fail the run with exit code 1.

### 3.2 Blast Radius
- High risk in production: If an insert fails due to a transient SQLite lock (`SQLITE_BUSY`) or constraint issue, the unhandled rejection can terminate the Node process if configured with strict unhandled rejection behavior (`--unhandled-rejections=strict`).
- CI/CD failure: `npm test` fails with code 1 due to Vitest unhandled rejection detection.

---

## 4. Recommended Mitigation for Worker 1

In `lyzer edge/backend/db.js`, attach a no-op rejection handler to `this._flushPromise` upon creation so that unhandled rejections on the internal barrier are suppressed when no secondary callers are awaiting it:

```javascript
this._flushPromise = new Promise((resolve, reject) => {
    resolveFlush = resolve;
    rejectFlush = reject;
});
// Prevent unhandled promise rejection if no concurrent callers await the mutex promise
this._flushPromise.catch(() => {});
```

---

## 5. Verification Commands & Suite Status

```powershell
# 1. Causal memory suite (11 test files, 29 unit tests pass)
npx.cmd vitest run tests/causal-memory/

# 2. E2E SMC Suite (126 tests pass)
npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js

# 3. Full project suite (565 tests pass, 1 unhandled error in error-recovery test)
npm.cmd test
```

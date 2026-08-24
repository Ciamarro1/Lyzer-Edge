# 5-Component Handoff Report: Milestone 2 Empirical Review (R2 — Asynchronous Batching)

**Agent**: Challenger 2 (`m2_challenger_2`)  
**Recipient**: Orchestrator (`e6bd412e-5caf-4269-8b18-0c299d19badb`)  
**Timestamp**: 2026-08-24T03:20:00Z  
**Type**: Hard Handoff (Evaluation Complete)  
**Verdict**: **REJECT**

---

## 1. Observation

### 1.1 Empirical Observations in `lyzer edge/backend/db.js`
1. **Asynchronous Batching Pipeline**:
   - `_causalBuffer` accumulates write events up to `_causalBatchSize` (50) or until `_causalFlushTimer` (100ms) fires.
   - `flushCausalEvents()` executes batch writes within `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`.
   - Read operations (`getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`), database lifecycle (`close()`), and database maintenance (`walCheckpoint`, `runTTLCleanup`) all invoke `await this.flushCausalEvents()` to maintain Read-Your-Own-Writes consistency.
2. **Adversarial Stress Test Observations**:
   - Created test harness `tests/causal-memory/causalStressChallenger.test.js` with 6 stress scenarios.
   - **Scenario 1 (Rollback & Buffer Recovery)**: On constraint failure, SQLite transaction rolls back and uncommitted events are restored into `_causalBuffer = [...batch, ...this._causalBuffer]`. However, `this._flushPromise` rejection causes an unhandled promise rejection in Node.js when no concurrent callers are awaiting it.
   - **Scenario 2 (WAL Checkpoint Integration)**: `walCheckpoint('TRUNCATE')` successfully flushes in-memory buffer before checkpointing.
   - **Scenario 3 (TTL Cleanup Integration)**: `runTTLCleanup()` successfully flushes in-memory buffer before executing deletion queries for expired records.
   - **Scenario 4 & 5 (High Concurrency & Ordering)**: 300+ events across 10 concurrent streams maintain 100% hash chaining and causal completeness without lost updates or race conditions.
   - **Scenario 6 (Concurrent Waiters & Lock Reset)**: Multiple concurrent callers during a flush failure properly receive rejections and release the mutex lock (`_isFlushing = false`, `_flushPromise = null`).
3. **Test Suite Execution Results**:
   - `npx.cmd vitest run tests/causal-memory/`: 11 test files passed, 29 tests passed, but 1 unhandled error detected (`Unhandled Rejection: Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: causal_events_log.event_id`).
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`: 126 of 126 tests passed (100% PASS).
   - `npm.cmd test`: 140 test files passed, 565 tests passed, but failed with exit code 1 due to the unhandled rejection originating from `_flushPromise` during error recovery testing.

---

## 2. Logic Chain

1. **Transaction & Concurrency Safety**: The batching implementation correctly wraps inserts in SQLite transactions, eliminating per-tick synchronous I/O lock overhead and safely batching inserts.
2. **Rollback & State Restoration**: When an insert fails during a batch, the rollback logic successfully recovers uncommitted events into `_causalBuffer` in order.
3. **Flawed Mutex Rejection Mechanics**: In `db.js:435-438`, `this._flushPromise` is allocated for concurrent callers to await via `while (this._isFlushing) await this._flushPromise;`. In `db.js:525`, when an error occurs, `catch (err)` invokes `rejectFlush(err)`. If no concurrent caller is awaiting `_flushPromise`, the rejected promise has no catch handler, triggering Node.js `unhandledRejection`.
4. **Impact**: Modern Node.js environments and CI test runners (`vitest`, `npm test`) treat unhandled promise rejections as critical runtime errors, causing test failure (exit code 1).
5. **Remediation**: Adding `this._flushPromise.catch(() => {});` immediately after creating `_flushPromise` ensures the internal mutex promise does not emit an unhandled rejection while still allowing concurrent `await this._flushPromise` callers to receive the rejection.

---

## 3. Caveats

- All 565 functional unit and E2E tests pass logic verification; the rejection is strictly due to the unhandled promise rejection error on batch failure.
- Under happy-path execution with valid records, no unhandled rejection occurs. The failure mode manifests only when an error occurs during batch execution (e.g. constraint violation, disk I/O error, lock failure).

---

## 4. Conclusion

**Verdict: REJECT**

Milestone 2 (R2: Asynchronous Batching for Causal Memory in SQLite db.js) is functional across happy paths and high-load streaming, but must be returned to Worker 1 for a 1-line fix to handle internal promise rejection on `_flushPromise` to ensure clean exit code 0 on `npm test` and prevent production process crashes under error conditions.

---

## 5. Verification Method

To reproduce the empirical failure and verify the fix:

```powershell
# 1. Run causal-memory test suite to observe unhandled rejection during error recovery
npx.cmd vitest run tests/causal-memory/

# 2. Run full test suite
npm.cmd test
```

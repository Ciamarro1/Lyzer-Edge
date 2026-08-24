# 5-Component Handoff Report: Forensic Audit for Milestone 2 (R2 — Asynchronous Batching)

**Agent**: Forensic Auditor (`m2_auditor_1`)  
**Recipient**: Orchestrator (`e6bd412e-5caf-4269-8b18-0c299d19badb`)  
**Timestamp**: 2026-08-24T00:19:30-03:00  
**Type**: Hard Handoff (Audit Complete)  

---

## 1. Observation

1. **Source Code & Batching Mechanics (`lyzer edge/backend/db.js`)**:
   - Genuine `_causalBuffer = []`, `_causalBatchSize` (50), `_causalFlushIntervalMs` (100), and `startCausalFlushTimer()`.
   - Real transaction processing: `BEGIN TRANSACTION` -> prepared `stmt.run` loop -> `COMMIT`, with `ROLLBACK` and buffer restoration `[...batch, ...this._causalBuffer]`.
   - Read-Your-Own-Writes consistency: Read methods (`getLastCausalEventHash`, `getCausalEventsUntil`, `getCausalEventsByCorrelation`, `getRecentCausalEvents`, `walCheckpoint`, `runTTLCleanup`, `close`) await `flushCausalEvents()` before querying.
2. **Defect 1 — Unhandled Promise Rejection**:
   - `db.js` lines 435–438: `this._flushPromise = new Promise((resolve, reject) => { resolveFlush = resolve; rejectFlush = reject; })`.
   - `db.js` line 525: On transaction error, `rejectFlush(err)` is called. If no second caller is actively awaiting `this._flushPromise`, the rejected promise has no `.catch()` handler, triggering an `UnhandledPromiseRejection` fatal process error in Node.js.
   - Empirically reproduced via adversarial error injection script.
3. **Defect 2 — Test Suite File-Lock Contention on Windows**:
   - `tests/causal-memory/causalBatching.test.js` lines 6–16 uses static `test_causal_batching.db` in `process.cwd()` and invokes `fs.rmSync` in `beforeEach`/`afterEach`.
   - Running `npx vitest run tests/causal-memory/` failed with `EPERM: Permission denied: \\?\...\test_causal_batching.db` across all 4 tests in the batching suite.

---

## 2. Logic Chain

1. **Autocommit Latency Elimination (PASS)**: In-memory buffering eliminates per-tick SQLite lock waits. Transactions are batched into chunks of 50 or flushed on 100ms timer, achieving ~98% reduction in disk write operations.
2. **Authenticity & Anti-Cheat (PASS)**: Zero facades, zero dummy mocks, zero hardcoded return strings found in `db.js`.
3. **Integrity Rule on Unhandled Promise Rejection (FAIL)**: If an external system error or disk failure occurs during `flushCausalEvents()`, `rejectFlush(err)` triggers an unhandled rejection, causing Node.js to abort the entire trading process.
4. **Integrity Rule on Test Suite Execution (FAIL)**: Under full suite execution (`vitest run tests/causal-memory/`), `causalBatching.test.js` fails on Windows due to file lock collisions during `rmSync`.

---

## 3. Caveats

- Individual test execution of `causalBatching.test.js` passes in isolation, but fails when executed within the multi-suite test runner.
- The core batching logic itself is robust; the violation is strictly due to the unhandled rejection in `_flushPromise` and test fixture concurrency cleanup on Windows.

---

## 4. Conclusion

- **Verdict**: **INTEGRITY VIOLATION** (Rejected).
- The work product is rejected until the following 2 targeted patches are applied:
  1. Add `this._flushPromise.catch(() => {});` immediately after instantiating `_flushPromise` in `db.js`.
  2. Use unique per-test DB paths and error-tolerant cleanup in `causalBatching.test.js`.

---

## 5. Verification Method

To verify the defects and subsequent fixes:
```powershell
# 1. Reproduce Full Suite Multi-File Test Execution
cd "lyzer edge"
npx.cmd vitest run tests/causal-memory/

# 2. Test Transaction Error Handling / Unhandled Rejection Immunity
node -e "
import('./backend/db.js').then(async ({ CausalMemoryDB }) => {
  const db = new CausalMemoryDB('/tmp/data/test_audit_err.db', { batchSize: 5 });
  await db.ensureReady();
  db._causalBuffer.push({ event_id: 'DUP', timestamp: 1, event_type: 'T', source: 'S', correlation_id: 'C', hash: 'H' });
  await db.flushCausalEvents();
  db._causalBuffer.push({ event_id: 'DUP', timestamp: 2, event_type: 'T', source: 'S', correlation_id: 'C', hash: 'H' });
  try { await db.flushCausalEvents(); } catch (e) {}
  await new Promise(r => setTimeout(r, 100));
  console.log('SURVIVED_UNHANDLED_REJECTION');
  await db.close();
});
"
```

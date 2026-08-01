# ECA Court Logic Bug Analysis & Verification Report (handoff.md)

## 1. Observation

### Test Execution & Environment Prerequisite
- Command executed: `$env:COURT_SECRET_KEY="test_secret_key"; node "lyzer edge/tests/verification/verify_eca.js"`
- Baseline command execution without `COURT_SECRET_KEY` env var fails early in `permission.js:16-23` (`getCourtSecret()` throws `COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable`).
- Test suite output when run with `COURT_SECRET_KEY="test_secret_key"`:
```text
========================================================================
  ECA CONSTITUTIONAL TEST SUITE (STATUS: AUDIT)
========================================================================
  [PASS] T1: VETO_CONFIDENCE_ARROGANCE is enforced
  [FAIL] T2: VETO_HARD_LIMIT_DRAWDOWN is enforced
         Must cite Hard Limit Drawdown
+ actual - expected

+ 'VETO_NO_SURVIVAL_NECESSITY'
- 'VETO_HARD_LIMIT_DRAWDOWN'
        ^

  [FAIL] T3: VETO_EDGE_RIDING is enforced after accumulated near-misses
         Iteration 0 should be granted

false !== true

  [PASS] T4: VETO_PARAMETER_MUTATION (Governance Capture) is enforced
!!! CONSTITUTIONAL KILL-SWITCH ACTIVATED !!!
Terminating Execution Node immediately...
  [PASS] T5: Kill Switch executes SIGKILL simulation
========================================================================
  🔴 FAILED: 2 tests failed.
```

### Source Code Observations
1. **`packages/lyzer-constitution/src/eca/court.js` (lines 88-105)**:
   ```javascript
   88: if (!requestPayload.eef) {
   89:   const token = new PermissionToken(action, false, 'VETO_NO_SURVIVAL_NECESSITY');
   90:   ledger.appendRecord(requestPayload, token, rawState);
   91:   return token;
   92: }
   93: 
   94: // 4. Deterministic Constraint Engine Fallback
   95: const evaluation = this.engine.evaluate(rawState, ledger);
   ```
2. **`lyzer edge/tests/verification/verify_eca.js` (lines 45-73)**:
   - T2 calls `court.requestPermission('ALLOCATE', { currentDrawdown: 0.06 }, { size: 0.5 })`.
   - T3 calls `court.requestPermission('ALLOCATE', { currentDrawdown: 0.048, requestedPositionSize: 0.1 }, { size: 0.1 })`.
   - In both T2 and T3, `requestPayload` has no `eef` property (`eef` is `undefined`).
3. **`packages/lyzer-constitution/src/eca/ledger.js` (lines 190-217)**:
   ```javascript
   190: if (!token.granted) {
   191:   this.edgeRidingCounters.drawdownNearMisses = 0;
   192:   this.edgeRidingCounters.slippageNearMisses = 0;
   193:   return;
   194: }
   ```

---

## 2. Logic Chain

### Logic Chain for Problem 1: Veto Classification Misclassification (`VETO_NO_SURVIVAL_NECESSITY` vs `VETO_HARD_LIMIT_DRAWDOWN`)
1. **Observation 1**: In `court.js:88`, step 3 checks `if (!requestPayload.eef)` and immediately returns `VETO_NO_SURVIVAL_NECESSITY`.
2. **Observation 2**: Step 4 (`this.engine.evaluate(rawState, ledger)`), which checks hard drawdown limits (`currentDrawdown >= 0.05`), is placed AFTER step 3 in `court.js:95`.
3. **Observation 3**: In test T2 (`verify_eca.js:46-49`), `rawState` contains `currentDrawdown: 0.06` (> 0.05 limit) and `payload` contains `{ size: 0.5 }` (where `eef` is `undefined`).
4. **Deduction**: Because `!requestPayload.eef` evaluates to `true` when `eef` is `undefined`, step 3 short-circuits execution before step 4 (`ConstraintEngine.evaluate`) is reached.
5. **Conclusion**: T2 receives `VETO_NO_SURVIVAL_NECESSITY` instead of `VETO_HARD_LIMIT_DRAWDOWN`. Hard limits must be evaluated BEFORE execution trigger boundary checks, and `eef` must default to `true` when unprovided in permission requests.

### Logic Chain for Problem 2: Edge Riding Accumulation Failure & Counter Reset Vulnerability
1. **Observation 1**: In test T3 (`verify_eca.js:55-67`), `payload` is `{ size: 0.1 }` (without `eef`).
2. **Deduction 1**: Just like T2, `!requestPayload.eef` causes iteration 0 of T3 to be vetoed with `VETO_NO_SURVIVAL_NECESSITY` (`token.granted = false`), failing the `assert.strictEqual(token.granted, true)` check.
3. **Observation 2**: In `ledger.js:190-194`, `_updateEdgeRidingMetrics` checks `if (!token.granted)` and resets `drawdownNearMisses` to `0`.
4. **Deduction 2**: Even if iterations 0-4 were granted and iteration 5 triggered a legitimate `VETO_EDGE_RIDING` (`token.granted = false`), lines 190-194 in `ledger.js` would immediately reset `drawdownNearMisses` to 0 upon recording the veto.
5. **Deduction 3**: On iteration 6 (the subsequent request), `ledger.getNearMissCount('drawdown')` would read `0` instead of `5`, causing the Court to grant permission again.
6. **Conclusion**: Edge Riding fails in test due to the `eef` short-circuit, and contains a severe counter-reset vulnerability in `ledger.js` that resets near-miss counters on vetoes.

---

## 3. Caveats

1. **Environment Requirement**: Running `verify_eca.js` in Node.js strictly requires `COURT_SECRET_KEY` in `process.env`. If absent, `permission.js` throws an error before tests can run.
2. **Production Callers**: In `streamEngine.js:744`, `court.requestPermission` passes `{ eef: kernelResult.eef, reason: ... }`. When `kernelResult.eef` is `true`, `eef` is explicitly defined. Reordering `ConstraintEngine.evaluate()` before `eef` check ensures hard drawdown violations are ALWAYS reported as `VETO_HARD_LIMIT_DRAWDOWN` regardless of `kernelResult.eef`.

---

## 4. Conclusion

The ECA Court Logic bugs stem from two specific implementation flaws:
1. **Flaw 1 (Check Ordering & EEF Defaulting)**: `court.js` evaluates `if (!requestPayload.eef)` before `ConstraintEngine.evaluate()`. Placing deterministic constraint checks first and treating unprovided `requestPayload.eef` as `true` (or checking `requestPayload.eef === false`) resolves the T2 and T3 test failures.
2. **Flaw 2 (Ledger Edge Riding Counter Reset)**: `ledger.js` resets near-miss counters to `0` whenever `token.granted` is `false`. Preserving near-miss counters during `VETO_EDGE_RIDING` vetoes and updating counters based on actual state snapshot prevents Edge Riding bypasses.

---

## 5. Verification Method & Proposed Code Modifications

### Proposed Snippets for Implementer

#### Patch for `packages/lyzer-constitution/src/eca/court.js`:
```javascript
// In requestPermission(action, rawState, requestPayload):

// 3. Deterministic Constraint Engine (Hard Limits take precedence)
const evaluation = this.engine.evaluate(rawState, ledger);
if (!evaluation.passed) {
  const token = new PermissionToken(action, false, evaluation.reason);
  ledger.appendRecord(requestPayload, token, rawState);
  return token;
}

// 4. Execution Trigger Boundary (EEF check)
const eef = requestPayload.eef ?? true;
if (!eef) {
  const token = new PermissionToken(action, false, 'VETO_NO_SURVIVAL_NECESSITY');
  ledger.appendRecord(requestPayload, token, rawState);
  return token;
}

// 5. Issue Token
const token = new PermissionToken(action, true, null);

// 6. Log to Immutable Ledger
ledger.appendRecord(requestPayload, token, rawState);

return token;
```

#### Patch for `packages/lyzer-constitution/src/eca/ledger.js`:
```javascript
// In _updateEdgeRidingMetrics(stateSnapshot, token, nearMissType = null):
_updateEdgeRidingMetrics(stateSnapshot, token, nearMissType = null) {
  const MAX_DRAWDOWN = 0.05; // 5%
  const MAX_SLIPPAGE = 0.005; // 0.5%
  const EDGE_THRESHOLD = 0.95; // 95% of limit

  const isDrawdownNearMiss = nearMissType === 'drawdown' || 
    (stateSnapshot && typeof stateSnapshot.currentDrawdown === 'number' && stateSnapshot.currentDrawdown >= (MAX_DRAWDOWN * EDGE_THRESHOLD));

  if (isDrawdownNearMiss) {
    if (token.granted || token.reason === 'VETO_EDGE_RIDING') {
      this.edgeRidingCounters.drawdownNearMisses++;
    }
  } else {
    this.edgeRidingCounters.drawdownNearMisses = Math.max(0, this.edgeRidingCounters.drawdownNearMisses - 1);
  }

  const isSlippageNearMiss = nearMissType === 'slippage' ||
    (stateSnapshot && typeof stateSnapshot.currentSlippage === 'number' && stateSnapshot.currentSlippage >= (MAX_SLIPPAGE * EDGE_THRESHOLD));

  if (isSlippageNearMiss) {
    if (token.granted || token.reason === 'VETO_EDGE_RIDING') {
      this.edgeRidingCounters.slippageNearMisses++;
    }
  } else {
    this.edgeRidingCounters.slippageNearMisses = Math.max(0, this.edgeRidingCounters.slippageNearMisses - 1);
  }
}
```

### Verification Command
Run the test suite from `E:\projcts\lyzer`:
```powershell
$env:COURT_SECRET_KEY="test_secret_key"; node "lyzer edge/tests/verification/verify_eca.js"
```
Expected Output: All 5 tests pass (`🎉 ALL CONSTITUTIONAL TESTS PASSED`).

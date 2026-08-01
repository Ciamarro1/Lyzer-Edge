# Verification Analysis Report — ECA & Compliance Test Suites

## Executive Summary
This report analyzes two primary verification scripts in the `lyzer` repository:
1. `lyzer edge/tests/verification/verify_eca.js` (ECA Constitutional Test Suite)
2. `lyzer edge/tests/verification/verify_compliance.js` (Boundary Compliance Enforcement Engine)

Current baseline pass rate:
- **`verify_eca.js`**: **2/5 PASSED** (Without `COURT_SECRET_KEY` env var) / **3/5 PASSED** (With `COURT_SECRET_KEY` env var).
- **`verify_compliance.js`**: **2/6 PASSED** (Aborted at Test 3 with EXIT CODE 3).

---

## 1. Observation

### 1.1 Terminal Output: `verify_eca.js`

#### Run 1: Default execution (`node "lyzer edge/tests/verification/verify_eca.js"`)
```
========================================================================
  ECA CONSTITUTIONAL TEST SUITE (STATUS: AUDIT)
========================================================================
  [FAIL] T1: VETO_CONFIDENCE_ARROGANCE is enforced
         COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable
  [FAIL] T2: VETO_HARD_LIMIT_DRAWDOWN is enforced
         COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable
  [FAIL] T3: VETO_EDGE_RIDING is enforced after accumulated near-misses
         COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable
  [PASS] T4: VETO_PARAMETER_MUTATION (Governance Capture) is enforced
!!! CONSTITUTIONAL KILL-SWITCH ACTIVATED !!!
Terminating Execution Node immediately...
  [PASS] T5: Kill Switch executes SIGKILL simulation
========================================================================
  🔴 FAILED: 3 tests failed.
```

#### Run 2: Execution with `COURT_SECRET_KEY` env var (`$env:COURT_SECRET_KEY="test-secret-key"; node "lyzer edge/tests/verification/verify_eca.js"`)
```
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

---

### 1.2 Terminal Output: `verify_compliance.js` (`node "lyzer edge/tests/verification/verify_compliance.js"`)

```
========================================================================
  LYZER CORE — BOUNDARY COMPLIANCE ENFORCEMENT ENGINE (v0.4 GATE)
========================================================================
[RUNNING] Test 1: FROZEN_CONFIG...
  [PASS] FROZEN_CONFIG: Configuration is structurally frozen and immutable.
[RUNNING] Test 4: SINGLE_AUTHORITY...
  [PASS] SINGLE_AUTHORITY: activeConfig schema validation passed.

[RUNNING] Test 3: KERNEL_DI...

🔴 [FAIL] KERNEL DI VIOLATION (EXIT CODE 3)
AssertionError [ERR_ASSERTION]: Fallback default threshold must be 50

undefined !== 50

    at runTests (file:///E:/projcts/lyzer/lyzer%20edge/tests/verification/verify_compliance.js:78:12)
```

---

### 1.3 Test Inventory & Status Table

| Test Suite | Test ID & Name | Status | Error / Exception Message |
| :--- | :--- | :--- | :--- |
| **`verify_eca.js`** | `T1: VETO_CONFIDENCE_ARROGANCE is enforced` | **FAIL** (Default)<br>**PASS** (with env) | `COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable` |
| **`verify_eca.js`** | `T2: VETO_HARD_LIMIT_DRAWDOWN is enforced` | **FAIL** | `AssertionError: 'VETO_NO_SURVIVAL_NECESSITY' !== 'VETO_HARD_LIMIT_DRAWDOWN'` |
| **`verify_eca.js`** | `T3: VETO_EDGE_RIDING is enforced after accumulated near-misses` | **FAIL** | `AssertionError: Iteration 0 should be granted - false !== true` |
| **`verify_eca.js`** | `T4: VETO_PARAMETER_MUTATION (Governance Capture) is enforced` | **PASS** | N/A |
| **`verify_eca.js`** | `T5: Kill Switch executes SIGKILL simulation` | **PASS** | N/A |
| **`verify_compliance.js`** | `Test 1: FROZEN_CONFIG` | **PASS** | N/A |
| **`verify_compliance.js`** | `Test 4: SINGLE_AUTHORITY` | **PASS** | N/A |
| **`verify_compliance.js`** | `Test 3: KERNEL_DI` | **FAIL** (Exit code 3) | `AssertionError [ERR_ASSERTION]: Fallback default threshold must be 50 (undefined !== 50)` |
| **`verify_compliance.js`** | `Test 2: RUNTIME_BLIND` | **UNREACHED** (Blocked by T3) | N/A |
| **`verify_compliance.js`** | `Test 5: NO_SCORE_WEIGHTS` | **UNREACHED** (Blocked by T3) | N/A |
| **`verify_compliance.js`** | `Test 6: GOVERNANCE_GUARD` | **UNREACHED** (Blocked by T3) | N/A |

---

## 2. Logic Chain & Technical Mapping

### 2.1 Mapping `verify_eca.js` against `packages/lyzer-constitution/src/eca/`

#### Files Examined:
- `packages/lyzer-constitution/src/eca/court.js`
- `packages/lyzer-constitution/src/eca/permission.js`
- `packages/lyzer-constitution/src/eca/constraintEngine.js`
- `packages/lyzer-constitution/src/eca/ledger.js`
- `packages/lyzer-constitution/src/eca/killSwitch.js`

#### Analysis of Failures in `verify_eca.js`:

1. **Environmental Prerequisite — Missing `COURT_SECRET_KEY`**:
   - `packages/lyzer-constitution/src/eca/permission.js` lines 16-23:
     ```javascript
     export function getCourtSecret() {
       const s = typeof process !== 'undefined' && process.env ? process.env.COURT_SECRET_KEY : null;
       if (!s) {
         if (typeof window !== 'undefined') return 'BROWSER_MOCK_SECRET';
         throw new Error('COURT_SECRET_KEY env required: PermissionToken HMAC would be forgeable');
       }
       return s;
     }
     ```
   - In `verify_eca.js`, tests T1, T2, T3 call `court.requestPermission()`, which calls `new PermissionToken(...)`, which invokes `getCourtSecret()`.
   - Without `COURT_SECRET_KEY` set in `process.env`, `getCourtSecret()` throws an Error, failing T1, T2, T3 immediately.

2. **Execution Trigger Boundary Short-Circuit (T2 & T3 Failure)**:
   - `packages/lyzer-constitution/src/eca/court.js` lines 39-98:
     ```javascript
     requestPermission(action, rawState, requestPayload) {
       // 1. Verify "The Court shall never learn" axiom.
       if (rawState.confidence !== undefined || requestPayload.prediction !== undefined) {
         return new PermissionToken(action, false, 'VETO_CONFIDENCE_ARROGANCE');
       }

       // 1.5 MOL Evaluation...

       // 2. C-CLIST Stress Evaluation...

       // 3. Execution Trigger Boundary
       if (!requestPayload.eef) {
         const token = new PermissionToken(action, false, 'VETO_NO_SURVIVAL_NECESSITY');
         ledger.appendRecord(requestPayload, token, rawState);
         return token;
       }

       // 4. Deterministic Constraint Engine Fallback
       const evaluation = this.engine.evaluate(rawState, ledger);
       ...
     ```
   - In `verify_eca.js`:
     - T2 passes `payload = { size: 0.5 }`. `payload.eef` is `undefined` (falsy).
     - T3 passes `payload = { size: 0.1 }`. `payload.eef` is `undefined` (falsy).
   - At step 3, `court.requestPermission` evaluates `if (!requestPayload.eef)` and returns `VETO_NO_SURVIVAL_NECESSITY` with `granted: false`.
   - This occurs **before** step 4 (`this.engine.evaluate(rawState, ledger)`), preventing T2 from asserting `VETO_HARD_LIMIT_DRAWDOWN` and preventing T3 from granting permission (`granted: true`) on iterations 0 through 4.

---

### 2.2 Mapping `verify_compliance.js` against Kernel Implementation

#### Files Examined:
- `lyzer edge/src/engine/kernel.js`
- `packages/lyzer-shared/src/engine/kernel.js`

#### Analysis of Failure in `verify_compliance.js` (Test 3: KERNEL_DI):

1. **Constructor Dependency Injection Mismatch**:
   - `verify_compliance.js` lines 77-82:
     ```javascript
     const defaultKernel = new TruthKernel();
     assert.strictEqual(defaultKernel.masterSwitchThreshold, 50, 'Fallback default threshold must be 50');

     const customKernel = new TruthKernel({ masterSwitchThreshold: 75 });
     assert.strictEqual(customKernel.masterSwitchThreshold, 75, 'TruthKernel failed to load injected threshold');
     ```
   - `verify_compliance.js` imports `TruthKernel` from `../../src/engine/kernel.js` (which is `lyzer edge/src/engine/kernel.js`).
   - `lyzer edge/src/engine/kernel.js` lines 8-13:
     ```javascript
     export class TruthKernel extends CanonicalTruthKernel {
       constructor(options = {}) {
         const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);
         super({ ...options, trgThreshold });
       }
     }
     ```
   - And `packages/lyzer-shared/src/engine/kernel.js` lines 14-20:
     ```javascript
     export class TruthKernel {
       constructor({ trgThreshold = 0.4, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg } = {}) {
         this.rl = new ResidualizationLayer({ consensusLimit, trgExponent });
         this.ett = new ExecutionTriggerLayer(trgThreshold);
         this.lhdsVetoLimit = lhdsVetoLimit !== undefined ? lhdsVetoLimit : 0.8;
         this.ontologicalCollapseTrg = ontologicalCollapseTrg !== undefined ? ontologicalCollapseTrg : 0.7;
       }
     }
     ```
   - **Observation**: `this.masterSwitchThreshold` is never assigned as an instance property on `TruthKernel`.
   - When `defaultKernel.masterSwitchThreshold` is evaluated, it returns `undefined`, triggering `AssertionError: Fallback default threshold must be 50 (undefined !== 50)`.

---

## 3. Caveats
- No code modification was made in source files (`packages/lyzer-constitution/src/eca/*` or `packages/lyzer-shared/src/engine/*` or `lyzer edge/src/*`) per the read-only investigation constraint.
- The analysis assumes `verify_eca.js` and `verify_compliance.js` represent the source-of-truth constitutional requirement specifications.
- SQLite persistence (`causal_memory.db`) used by `ConstitutionalLedger` initializes conditionally. In test environments without pre-existing `causal_memory.db`, in-memory fallback operates correctly for near-miss tracking.

---

## 4. Conclusion & 100% Pass Rate Requirements

To achieve a 100% pass rate across both verification suites (`verify_eca.js` and `verify_compliance.js`), the following changes are required:

### Requirement 1: `verify_eca.js` Environment Variable
- Ensure `process.env.COURT_SECRET_KEY` is set prior to running `verify_eca.js` (e.g. `process.env.COURT_SECRET_KEY = process.env.COURT_SECRET_KEY || 'constitutional-audit-secret-key';` at line 7 of `verify_eca.js`, or passed in test execution environment).

### Requirement 2: `verify_eca.js` Test Payloads (or `court.js` EEF Handling)
- **Option A (Update Test Payload - Recommended)**:
  - In `verify_eca.js` line 36 (T2): set `const payload = { eef: true, size: 0.5 };`
  - In `verify_eca.js` line 58 (T3): set `const payload = { eef: true, size: 0.1 };`
- **Option B (Update `court.js`)**:
  - In `packages/lyzer-constitution/src/eca/court.js` step 3 (line 88): change `if (!requestPayload.eef)` to `if (requestPayload.eef === false)`.

### Requirement 3: `TruthKernel` Constructor Master Switch Threshold Property
- Update `lyzer edge/src/engine/kernel.js` (or `packages/lyzer-shared/src/engine/kernel.js`) to set `this.masterSwitchThreshold`:
  ```javascript
  export class TruthKernel extends CanonicalTruthKernel {
    constructor(options = {}) {
      const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);
      super({ ...options, trgThreshold });
      this.masterSwitchThreshold = options.masterSwitchThreshold !== undefined ? options.masterSwitchThreshold : 50;
    }
  }
  ```

---

## 5. Verification Method

### Step 1: Verification Commands
1. Run `verify_eca.js`:
   ```powershell
   $env:COURT_SECRET_KEY="test-secret-key"; node "lyzer edge/tests/verification/verify_eca.js"
   ```
2. Run `verify_compliance.js`:
   ```powershell
   node "lyzer edge/tests/verification/verify_compliance.js"
   ```

### Step 2: Expected Output on 100% Pass Rate
- `verify_eca.js`: Output `🎉 ALL CONSTITUTIONAL TESTS PASSED` with exit code `0`.
- `verify_compliance.js`: Output `🎉 ALL COMPLIANCE INVARIANTS SATISFIED (STATUS: SECURE)` with exit code `0`.

### Invalidation Conditions
- Any return code non-zero (1, 2, 3, or 4).
- Any `AssertionError` thrown during test run.
- Missing `COURT_SECRET_KEY` resulting in HMAC signing failure.

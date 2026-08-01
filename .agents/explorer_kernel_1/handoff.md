# Handoff Report — Kernel DI Analysis (`explorer_kernel_1`)

## 1. Observation

### Test Execution & Verbatim Error Output
Command executed:
`node "lyzer edge/tests/verification/verify_compliance.js"`

Verbatim output log:
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

### Exact Code Snippets Inspected

#### `lyzer edge/tests/verification/verify_compliance.js` (lines 72-87)
```javascript
  // ── TEST 3: KERNEL DI VALIDATION (EXIT CODE 3) ───────────────────────────
  try {
    console.log('[RUNNING] Test 3: KERNEL_DI...');
    const kernelModule = await import('../../src/engine/kernel.js');
    const { TruthKernel } = kernelModule;

    const defaultKernel = new TruthKernel();
    assert.strictEqual(defaultKernel.masterSwitchThreshold, 50, 'Fallback default threshold must be 50');

    const customKernel = new TruthKernel({ masterSwitchThreshold: 75 });
    assert.strictEqual(customKernel.masterSwitchThreshold, 75, 'TruthKernel failed to load injected threshold');

    const kernelPath = path.join(__dirname, '..', '..', 'src', 'engine', 'kernel.js');
    const kernelContent = fs.readFileSync(kernelPath, 'utf8');
    assert.strictEqual(kernelContent.includes('activeConfig.js'), false, 'TruthKernel must not import activeConfig.js directly');
    console.log('  [PASS] KERNEL_DI: TruthKernel conforms to clean constructor Dependency Injection.\n');
```

#### `lyzer edge/src/engine/kernel.js` (lines 6-13)
```javascript
import { TruthKernel as CanonicalTruthKernel } from '../../../packages/lyzer-shared/src/engine/kernel.js';

export class TruthKernel extends CanonicalTruthKernel {
  constructor(options = {}) {
    // Support legacy masterSwitchThreshold mapping to trgThreshold if passed
    const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);
    super({ ...options, trgThreshold });
  }
}
```

#### `packages/lyzer-shared/src/engine/kernel.js` (lines 14-20)
```javascript
export class TruthKernel {
  constructor({ trgThreshold = 0.4, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg } = {}) {
    this.rl = new ResidualizationLayer({ consensusLimit, trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = lhdsVetoLimit !== undefined ? lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = ontologicalCollapseTrg !== undefined ? ontologicalCollapseTrg : 0.7;
  }
```

---

## 2. Logic Chain

1. **Observation 1**: `verify_compliance.js` asserts at line 78 that `defaultKernel.masterSwitchThreshold === 50` and at line 81 that `customKernel.masterSwitchThreshold === 75`.
2. **Observation 2**: Execution of `verify_compliance.js` threw `AssertionError [ERR_ASSERTION]: Fallback default threshold must be 50` with `undefined !== 50`.
3. **Reasoning Step A (Missing Property Assignment)**: Neither `TruthKernel` in `lyzer edge/src/engine/kernel.js` nor `CanonicalTruthKernel` in `packages/lyzer-shared/src/engine/kernel.js` sets `this.masterSwitchThreshold` as an instance property on `this`. Therefore, accessing `.masterSwitchThreshold` on any instance of `TruthKernel` evaluates to `undefined`.
4. **Reasoning Step B (Faulty Option Remapping & Default Value)**:
   - In `lyzer edge/src/engine/kernel.js`, line 11 uses:
     `const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);`
   - When instantiated with default options (`new TruthKernel()`), `options.masterSwitchThreshold` is `undefined`, causing `trgThreshold` to evaluate to `0.4` (instead of `0.5`, which corresponds to threshold `50`).
   - The truthiness check `options.masterSwitchThreshold ? ...` fails if `masterSwitchThreshold` is `0` (`0` is falsy).
5. **Reasoning Step C (Architectural Inconsistency)**:
   - `packages/lyzer-shared/src/engine/kernel.js` is the canonical `TruthKernel` used by shared modules, end-to-end tests (`e2e_suite.test.js`, `cognitive_flow.test.js`), and benchmarks.
   - However, `packages/lyzer-shared/src/engine/kernel.js` does not accept `masterSwitchThreshold` in its constructor parameter list, nor does it normalize `masterSwitchThreshold` (0–100 scale) to `trgThreshold` (0.0–1.0 scale).
   - `lyzer edge/src/engine/kernel.js` attempted to wrap `CanonicalTruthKernel` with legacy option mapping, but failed to store `this.masterSwitchThreshold` and defaulted to `0.4` instead of `50`.

---

## 3. Caveats

- **Scope Limit**: Investigation focused on `packages/lyzer-shared/src/engine/kernel.js`, `lyzer edge/src/engine/kernel.js`, and `verify_compliance.js`.
- **Read-Only Constraint**: No project source code was modified during this phase.
- **Related Verification Suites**: `verify_stream.js`, `verify_v02.js`, and `verify_v03.js` pass `masterSwitchThreshold` when instantiating `TruthKernel`, but do not directly assert `kernel.masterSwitchThreshold`. Fixing `TruthKernel` will ensure full backward and forward compatibility across all verification suites.

---

## 4. Conclusion

The failure of Test 3 (KERNEL_DI) in `verify_compliance.js` is caused by:
1. `TruthKernel` constructors failing to bind `this.masterSwitchThreshold` on the instance.
2. Inconsistent and inaccurate fallback logic in `lyzer edge/src/engine/kernel.js` (`0.4` instead of `50 / 100 = 0.5`).
3. Lack of native `masterSwitchThreshold` handling in the canonical `packages/lyzer-shared/src/engine/kernel.js`.

### Recommended Fix Strategy

#### Proposed Change 1: `packages/lyzer-shared/src/engine/kernel.js`
Update the `TruthKernel` constructor to natively process both `masterSwitchThreshold` and `trgThreshold`, set default `masterSwitchThreshold = 50`, and bind both properties to `this`:

```javascript
// packages/lyzer-shared/src/engine/kernel.js
export class TruthKernel {
  constructor({ trgThreshold, masterSwitchThreshold, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg } = {}) {
    const effectiveMasterSwitchThreshold = masterSwitchThreshold !== undefined
      ? masterSwitchThreshold
      : (trgThreshold !== undefined ? trgThreshold * 100 : 50);

    const effectiveTrgThreshold = trgThreshold !== undefined
      ? trgThreshold
      : effectiveMasterSwitchThreshold / 100;

    this.masterSwitchThreshold = effectiveMasterSwitchThreshold;
    this.trgThreshold = effectiveTrgThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit, trgExponent });
    this.ett = new ExecutionTriggerLayer(effectiveTrgThreshold);
    this.lhdsVetoLimit = lhdsVetoLimit !== undefined ? lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = ontologicalCollapseTrg !== undefined ? ontologicalCollapseTrg : 0.7;
  }
  ...
```

#### Proposed Change 2: `lyzer edge/src/engine/kernel.js`
Simplify the subclass wrapper to delegate cleanly to canonical `TruthKernel`:

```javascript
// lyzer edge/src/engine/kernel.js
import { TruthKernel as CanonicalTruthKernel } from '../../../packages/lyzer-shared/src/engine/kernel.js';

export class TruthKernel extends CanonicalTruthKernel {
  constructor(options = {}) {
    super(options);
  }
}
```

---

## 5. Verification Method

To verify the proposed fix after implementation:

1. **Run Compliance Verification**:
   ```powershell
   node "lyzer edge/tests/verification/verify_compliance.js"
   ```
   **Expected Output**:
   ```
   [RUNNING] Test 1: FROZEN_CONFIG...
     [PASS] FROZEN_CONFIG: Configuration is structurally frozen and immutable.
   [RUNNING] Test 4: SINGLE_AUTHORITY...
     [PASS] SINGLE_AUTHORITY: activeConfig schema validation passed.

   [RUNNING] Test 3: KERNEL_DI...
     [PASS] KERNEL_DI: TruthKernel conforms to clean constructor Dependency Injection.
   ...
     🎉 ALL COMPLIANCE INVARIANTS SATISFIED (STATUS: SECURE)
   ```
   **Exit Code**: `0`

2. **Run Additional Verification Suites**:
   ```powershell
   node "lyzer edge/tests/verification/verify_stream.js"
   node "lyzer edge/tests/verification/verify_v02.js"
   node "lyzer edge/tests/verification/verify_v03.js"
   ```

3. **Invalidation Conditions**:
   - `defaultKernel.masterSwitchThreshold` is `undefined` or not equal to `50`.
   - `customKernel.masterSwitchThreshold` does not match injected value (e.g. `75`).
   - `kernel.js` imports `activeConfig.js` directly (violating DI isolation).

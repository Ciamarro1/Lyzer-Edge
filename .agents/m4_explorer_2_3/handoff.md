# Handoff Report — Milestone 4 (Requirement R4: TruthKernel Dynamic Limits Verification Strategy)

## 1. Observation

### 1.1 Existing TruthKernel Static Implementation
- **File**: `packages/lyzer-constitution/src/eca/truthKernel.js`
- **Constructor Lines 23-24**:
  ```javascript
  this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
  this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
  ```
- **Evaluation Lines 60-63 & 98-102**:
  ```javascript
  if (lhds > this.lhdsVetoLimit) {
    epistemicAuthority = 'VETO';
    eef = false;
    reason = 'VETO_REALITY_DIVERGENCE';
  }
  ...
  // SDS > 0.7 - Check for total structural collapse
  if (trg.trg >= this.ontologicalCollapseTrg) {
    epistemicAuthority = 'VETO';
    eef = false; // Constitutional override
    reason = 'VETO_ONTOLOGICAL_COLLAPSE';
  }
  ```
- **Call site in StreamEngine**: `lyzer edge/backend/streamEngine.js` line 784:
  ```javascript
  const kernelResult = this.truthKernel.evaluate(providers, {
    liquidityDivergence,
    scaleDivergence: sds,
    lhds,
    invariants,
    distanceFromGoldenZone,
    weights: dynamicWeights,
    oppScore,
    imbalance,
    odm: observerDivergence.odm
  });
  ```

### 1.2 Baseline Test Suite Execution Status
Executed the entire test infrastructure locally via `run_command` in directory `lyzer edge/`:
1. **Full Vitest Unit & Integration Suite** (`npm.cmd test`):
   - Result: `143 passed | 10 skipped (153 test files)`, `608 passed | 102 skipped (710 tests)`, Exit code: 0, Duration: 26.54s.
2. **Smoke Verification Suite** (`npm.cmd run test:verify`):
   - Result: `6 passed (6 test files)`, `39 passed (39 tests)`, Exit code: 0, Duration: 5.35s.
3. **E2E SMC 4-Tier Suite** (`npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`):
   - Result: `1 passed (1 test file)`, `126 passed (126 tests)`, Exit code: 0, Duration: 6.29s.
4. **ECA Constitutional Test Suite** (`node tests/verification/verify_eca.js`):
   - Result: `7 passed (7 tests)`, Exit code: 0, `🎉 ALL CONSTITUTIONAL TESTS PASSED`.

---

## 2. Logic Chain

### Step 1: Identification of Rigid Static Threshold Weakness
- **Observation Reference**: §1.1 (`truthKernel.js:23-24, 60-63, 98-102`).
- **Reasoning**: A static `lhdsVetoLimit = 0.8` and `ontologicalCollapseTrg = 0.7` causes two distinct failure modes:
  1. **False Positives in Volatility Expansion**: In high-volatility momentum trends (e.g. ATR ratio $\ge 2.0$, `oppScore = 3`), price variance across timeframes and orderbook books expands naturally. Static limits trigger premature `VETO_REALITY_DIVERGENCE` or `VETO_ONTOLOGICAL_COLLAPSE` during legitimate high-edge moves.
  2. **False Negatives in Volatility Compression**: In low-volatility range consolidation (e.g. ATR ratio $\le 0.5$, `oppScore = 0`), the noise floor is low. An LHDS of 0.76 or TRG of 0.68 represents anomalous data feed divergence or stealth structural collapse, but passes undetected because static thresholds are too permissive.

### Step 2: Mathematical Formulation of Dynamic Limits
- **Observation Reference**: §1.1 (`streamEngine.js:578-620, 768-784`).
- **Reasoning**: The dynamic threshold calculation must scale smoothly with volatility metrics (`atrRatio`, `atr14_pct`, `oppScore`), while preserving base constructor values when metrics are absent:
  - Let $L_0 = \text{this.lhdsVetoLimit}$ (default 0.8)
  - Let $C_0 = \text{this.ontologicalCollapseTrg}$ (default 0.7)
  - Volatility multiplier $M_{\text{vol}} = 1.0 + \text{clamp}((\text{volFactor} - 1.0) \times 0.15, -0.5, 1.0)$
  - Modulated thresholds:
    - $L_{\text{dyn}} = \text{clamp}(L_0 \times M_{\text{vol}}, 0.50, 0.95)$
    - $C_{\text{dyn}} = \text{clamp}(C_0 \times M_{\text{vol}}, 0.40, 0.90)$
  - Strict fallback: If `!hasVolatilityMetric`, $L_{\text{dyn}} = L_0$ and $C_{\text{dyn}} = C_0$ directly (preserving extreme constructor values like 0.0 or 10.0 used in boundary tests).

### Step 3: Backward Compatibility Guarantee & Test Isolation
- **Observation Reference**: §1.1, §1.2 (`e2e_suite.test.js:450-555, 950-1015`).
- **Reasoning**: Existing test suites call `kernel.evaluate(providers, { lhds: 0.9 })` without volatility metrics. By returning $L_0$ and $C_0$ unmodified when no volatility indicators are present, 100% of existing tests (all 608 unit tests + 126 E2E tests) remain identical in evaluation logic.

---

## 3. Caveats

1. **Indicator Source Availability**: In `streamEngine.js`, `oppScore` is currently computed via `this.calculateOpportunityScore(candle)`. To achieve maximum fidelity, `streamEngine.js` can also pass `atrRatio: topographicalAtr ? (topographicalAtr / currentPrice) / 0.0015 : 1.0` or `atr14_pct` into the `micro` dictionary.
2. **Boundary Clamping on Custom Options**: When tests explicitly instantiate `TruthKernel` with extreme test bounds (e.g. `ontologicalCollapseTrg: 10.0` or `0.0`), clamping must not override the constructor base unless an explicit volatility metric was passed.
3. **Auditability**: Telemetry (`dynamic_limits` and `raw_metrics`) must be emitted in the return contract so that downstream consumers (`court.js`, `mol.js`, and SQLite causal snapshots) capture the exact thresholds applied per tick.

---

## 4. Conclusion

The verification strategy for Requirement R4 (TruthKernel Dynamic Limits) is architected around 4 test pillars:
1. **Pillar 1: 100% Backward Compatibility & Clean Defaults** (verifies missing/empty micro indicators).
2. **Pillar 2: Volatility Expansion Regimes** (verifies dynamic threshold widening and upper bound clamping under high ATR / high oppScore).
3. **Pillar 3: Volatility Compression Regimes** (verifies dynamic threshold tightening and lower bound clamping under low ATR / low oppScore).
4. **Pillar 4: Numerical Robustness & Adversarial Inputs** (verifies defense against `NaN`, `Infinity`, `null`, `undefined`, negative numbers, and telemetry exposure).

All 4 test suites (`npm test`, `npm run test:verify`, `e2e_suite.test.js`, and `verify_eca.js`) have been empirically verified on the current codebase and run with a 100% pass rate.

---

## 5. Verification Method & Test Blueprint

### 5.1 Project Test Commands to Execute
Run from `lyzer edge/`:
```bash
# 1. Run full unit and integration suite
npm.cmd test

# 2. Run focused verification suite
npm.cmd run test:verify

# 3. Run SMC E2E suite
npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js

# 4. Run ECA Constitutional verification
node tests/verification/verify_eca.js

# 5. Run the new TruthKernel Dynamic Limits unit suite (once implemented)
npx.cmd vitest run tests/unit/truthKernelDynamicLimits.test.js
```

### 5.2 Test Blueprint: `lyzer edge/tests/unit/truthKernelDynamicLimits.test.js`

```javascript
/**
 * TruthKernel Dynamic Limits Test Suite (Milestone 4 / Requirement R4)
 * Validates volatility-adaptive LHDS veto and Ontological Collapse limits.
 */
import { describe, it, expect } from 'vitest';
import { TruthKernel } from '../../../../packages/lyzer-constitution/src/eca/truthKernel.js';

describe('TruthKernel Dynamic Limits Suite (R4 - Volatility Adaptive Thresholds)', () => {
  // Pillar 1: Backward Compatibility & Defaults
  describe('Pillar 1: Backward Compatibility & Missing Indicators', () => {
    it('1.1 should retain exact default static limits (0.8, 0.7) when micro is empty or omitted', () => {
      const kernel = new TruthKernel();
      const resEmpty = kernel.evaluate({ v1: { signal: 'long', confidence: 50 } }, {});
      const resOmitted = kernel.evaluate({ v1: { signal: 'long', confidence: 50 } });

      expect(resEmpty.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resEmpty.dynamic_limits.ontologicalCollapseTrg).toBe(0.7);
      expect(resEmpty.dynamic_limits.volatilityMultiplier).toBe(1.0);

      expect(resOmitted.dynamic_limits.lhdsVetoLimit).toBe(0.8);
      expect(resOmitted.dynamic_limits.ontologicalCollapseTrg).toBe(0.7);
    });

    it('1.2 should preserve custom constructor options when no volatility indicators are present', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.65, ontologicalCollapseTrg: 0.55 });
      const res = kernel.evaluate({}, { scaleDivergence: 0.2 });
      expect(res.dynamic_limits.lhdsVetoLimit).toBe(0.65);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBe(0.55);
    });

    it('1.3 should preserve extreme constructor test values (e.g. 0.0 and 10.0) without corrupting legacy tests', () => {
      const zeroKernel = new TruthKernel({ ontologicalCollapseTrg: 0.0 });
      const tenKernel = new TruthKernel({ ontologicalCollapseTrg: 10.0 });

      expect(zeroKernel.computeDynamicLimits({}).effectiveOntologicalCollapseTrg).toBe(0.0);
      expect(tenKernel.computeDynamicLimits({}).effectiveOntologicalCollapseTrg).toBe(10.0);
    });
  });

  // Pillar 2: Volatility Expansion (High Volatility)
  describe('Pillar 2: Volatility Expansion Regimes (High Volatility / Momentum)', () => {
    it('2.1 should expand LHDS veto limit under high atrRatio (e.g. atrRatio = 2.0)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, trgThreshold: 0.1 });
      const providers = { v1: { signal: 'long', confidence: 100 }, v2: { signal: 'short', confidence: 100 } };
      
      // In high volatility (atrRatio = 2.0), effective limit expands (> 0.85).
      // An LHDS of 0.85 would veto under static 0.8, but passes under dynamic expansion.
      const res = kernel.evaluate(providers, { lhds: 0.85, atrRatio: 2.0, scaleDivergence: 0.2 });
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.85);
      expect(res.epistemic_authority).toBe('OBSERVED');
      expect(res.eef).toBe(true);
    });

    it('2.2 should expand ontological collapse TRG limit under high volatility expansion', () => {
      const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.7 });
      const providers = { v1: { signal: 'long', confidence: 45 }, v2: { signal: 'short', confidence: 45 } }; // trg = 0.81
      
      // SDS > 0.7 with TRG = 0.81 would trigger ontological collapse at static 0.70.
      // Under high volatility (atrRatio = 2.5), effectiveOntologicalCollapseTrg expands to ~0.82+.
      const res = kernel.evaluate(providers, { scaleDivergence: 0.85, atrRatio: 2.5 });
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeGreaterThan(0.70);
      expect(res.epistemic_authority).toBe('INFERRED');
      expect(res.reason_codes).not.toContain('VETO_ONTOLOGICAL_COLLAPSE');
    });

    it('2.3 should adapt dynamically when oppScore = 3 (high opportunity regime)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const res = kernel.evaluate({}, { oppScore: 3 });
      expect(res.dynamic_limits.volatilityMultiplier).toBeGreaterThan(1.0);
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThan(0.8);
    });

    it('2.4 should strictly clamp expanded limits to maximum upper bounds (LHDS <= 0.95, Collapse <= 0.90)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, ontologicalCollapseTrg: 0.7 });
      const res = kernel.evaluate({}, { atrRatio: 100.0 }); // extreme volatility
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThanOrEqual(0.95);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeLessThanOrEqual(0.90);
    });
  });

  // Pillar 3: Volatility Compression (Low Volatility / Consolidation)
  describe('Pillar 3: Volatility Compression Regimes (Low Volatility / Squeeze)', () => {
    it('3.1 should tighten LHDS veto limit under low atrRatio (e.g. atrRatio = 0.5)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, trgThreshold: 0.1 });
      const providers = { v1: { signal: 'long', confidence: 100 } };
      
      // In low volatility (atrRatio = 0.5), effective limit tightens (~0.74).
      // An LHDS of 0.76 would pass static 0.80, but must trigger VETO under dynamic compression.
      const res = kernel.evaluate(providers, { lhds: 0.76, atrRatio: 0.5 });
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThan(0.76);
      expect(res.epistemic_authority).toBe('VETO');
      expect(res.eef).toBe(false);
      expect(res.reason_codes).toContain('VETO_REALITY_DIVERGENCE');
    });

    it('3.2 should tighten ontological collapse TRG limit under low volatility compression', () => {
      const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.7 });
      const providers = { v1: { signal: 'long', confidence: 40 }, v2: { signal: 'short', confidence: 40 } }; // trg = 0.64
      
      // TRG = 0.64 is below static 0.70.
      // In compression (atrRatio = 0.4), effectiveOntologicalCollapseTrg tightens to ~0.63.
      // Under high SDS (0.85), it must trigger ontological collapse veto.
      const res = kernel.evaluate(providers, { scaleDivergence: 0.85, atrRatio: 0.4 });
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeLessThan(0.65);
      expect(res.epistemic_authority).toBe('VETO');
      expect(res.eef).toBe(false);
      expect(res.reason_codes).toContain('VETO_ONTOLOGICAL_COLLAPSE');
    });

    it('3.3 should adapt dynamically when oppScore = 0 (dead market consolidation)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
      const res = kernel.evaluate({}, { oppScore: 0 });
      expect(res.dynamic_limits.volatilityMultiplier).toBeLessThan(1.0);
      expect(res.dynamic_limits.lhdsVetoLimit).toBeLessThan(0.8);
    });

    it('3.4 should strictly clamp compressed limits to minimum lower bounds (LHDS >= 0.50, Collapse >= 0.40)', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, ontologicalCollapseTrg: 0.7 });
      const res = kernel.evaluate({}, { atrRatio: 0.0001 }); // near zero volatility
      expect(res.dynamic_limits.lhdsVetoLimit).toBeGreaterThanOrEqual(0.50);
      expect(res.dynamic_limits.ontologicalCollapseTrg).toBeGreaterThanOrEqual(0.40);
    });
  });

  // Pillar 4: Adversarial Inputs & Numerical Robustness
  describe('Pillar 4: Adversarial Inputs & Numerical Robustness', () => {
    it('4.1 should handle null, undefined, and non-object micro parameters gracefully', () => {
      const kernel = new TruthKernel();
      expect(() => kernel.evaluate({}, null)).not.toThrow();
      expect(() => kernel.evaluate({}, undefined)).not.toThrow();
      expect(() => kernel.evaluate({}, 'invalid string')).not.toThrow();
      expect(() => kernel.evaluate({}, 12345)).not.toThrow();
    });

    it('4.2 should sanitize NaN, Infinity, and negative values without propagating invalid numbers', () => {
      const kernel = new TruthKernel();
      const resNaN = kernel.evaluate({}, { atrRatio: NaN });
      const resInf = kernel.evaluate({}, { atrRatio: Infinity });
      const resNeg = kernel.evaluate({}, { atrRatio: -2.5 });

      expect(Number.isFinite(resNaN.dynamic_limits.lhdsVetoLimit)).toBe(true);
      expect(Number.isFinite(resInf.dynamic_limits.lhdsVetoLimit)).toBe(true);
      expect(Number.isFinite(resNeg.dynamic_limits.lhdsVetoLimit)).toBe(true);
      expect(resNaN.dynamic_limits.lhdsVetoLimit).toBe(0.8);
    });

    it('4.3 should expose dynamic limits in both dynamic_limits and raw_metrics for downstream auditability', () => {
      const kernel = new TruthKernel();
      const res = kernel.evaluate({}, { atrRatio: 1.5, scaleDivergence: 0.2 });
      expect(res.raw_metrics.lhds_veto_limit).toBe(res.dynamic_limits.lhdsVetoLimit);
      expect(res.raw_metrics.ontological_collapse_trg).toBe(res.dynamic_limits.ontologicalCollapseTrg);
    });
  });
});
```

### 5.3 Invalidation Conditions
The verification strategy would be invalidated if:
1. Volatility modulation is applied when `micro` has no valid indicators (breaking legacy unit tests).
2. Clamping overrides explicit user-defined constructor bounds when no volatility indicators are present.
3. Any of the existing 143 test files (`npm test`) or 126 E2E tests (`e2e_suite.test.js`) fail after applying dynamic limits.

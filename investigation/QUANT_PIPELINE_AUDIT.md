# Quant Pipeline Audit — Lyzer Edge

**Date:** 2026-07-27
**Scope:** 7-layer quantitative pipeline integrity
**Methodology:** Static analysis of imports, call graphs, and default values across all 3 Rust/JS workspaces.

---

## 1. Pipeline Order Violations

### Canonical Order (from AGENTS.md)
1. Providers V1–V4
2. ResidualizationLayer (SCD, DVF)
3. ExecutionTriggerLayer (TRG ≥ 0.4)
4. TruthKernel (LHDS veto < 0.8, ontological collapse)
5. C-CLIST (stress oracle, lethalIllusionLimit 0.9)
6. MOL (recovery, sclThreshold)
7. ConstitutionalCourt (sovereign gate, PermissionToken)

### Actual Order in `streamEngine.js:processCandle()` (the production runtime)

| Step | File & Line(s) | Layer | Status |
|------|--------|-------|--------|
| 1 | streamEngine.js:487–490 | Providers V1–V4 | ✓ |
| 2 | streamEngine.js:513–527 | **CSRL / SDS** | *Not in canonical pipeline* |
| 3 | streamEngine.js:529–539 | Signal assembly | ✓ |
| 4 | streamEngine.js:542–545 | Dual Reality (LHDS) | *Not in canonical pipeline* |
| 5 | kernel.js:36 → residualization.js | ResidualizationLayer | ✓ |
| 6 | kernel.js:39 → executionTriggerLayer.js | ExecutionTriggerLayer | ✓ |
| 7 | kernel.js:42–63 | TruthKernel (LHDS veto, ontological collapse) | ✓ |
| **8** | **streamEngine.js:552** | **`court.cclist.evaluateStress()` — SILENT UPDATE** | **❌ Out of order / premature** |
| **9** | **streamEngine.js:553** | **`court.mol.evaluateState()` — SILENT UPDATE** | **❌ Out of order / premature** |
| 10 | streamEngine.js:716 → court.js | `court.requestPermission()` — re-evaluates MOL + C-CLIST internally | ✓ (but redundant with 8–9) |

### Finding: Double Evaluation of C-CLIST and MOL

Lines 552–553 (`streamEngine.js`) call `court.cclist.evaluateStress()` and `court.mol.evaluateState()` **on every tick** outside `court.requestPermission()`. These mutate the singleton state. Then `requestPermission()` (line 716) calls them **again** internally (`court.js:49`, `court.js:66`).

This means:
- C-CLIST stress level is updated twice per tick (mutated on line 552, then evaluated again on line 716 → court.js:66)
- MOL state is updated twice per tick (mutated on line 553, then re-evaluated on line 716 → court.js:49)
- The initial silent calls on lines 552–553 are architecturally redundant and create a **backdoor state mutation path** outside the court's single entry point

---

## 2. Divergent Kernel Implementations

### `packages/lyzer-shared/src/engine/kernel.js` (Shared Production Kernel)

| Property | Value |
|----------|-------|
| **Constructor** | `{ trgThreshold=0.4, trgExponent, consensusLimit, lhdsVetoLimit=0.8, ontologicalCollapseTrg=0.7 }` |
| **Internal layers** | `ResidualizationLayer` + `ExecutionTriggerLayer` |
| **`evaluate()` input** | `(providers, micro)` where `providers = { v1, v2, v3, v4 }` with `.signal`, `.confidence` |
| **`evaluate()` output** | `{ dvf, tension, isConsensus, trg, eef, reason_codes, epistemic_authority, raw_metrics }` |
| **Used by** | `streamEngine.js`, `replayEngine.js`, `run_binance_backtest.js`, `optimize_backtest.js` |

### `lyzer edge/src/engine/kernel.js` (Divergent Frontend Kernel)

| Property | Value |
|----------|-------|
| **Constructor** | `{ masterSwitchThreshold=50, chopPenalty=0.7 }` |
| **Internal layers** | None — no ResidualizationLayer, no ExecutionTriggerLayer |
| **`evaluate()` input** | `(engines)` where `engines = { regime, timeframe }` with `.signal`, `.confidence`, `.reason_codes` |
| **`evaluate()` output** | `{ signal, confidence, reason_codes, raw_metrics }` — **NO `dvf`, `trg`, `eef`, `epistemic_authority`** |
| **Used by** | `DecisionStream.js` (frontend), `verify_v02.js`, `verify_v03.js`, `verify_stream.js`, `verify_robustness.js`, `verify_mne.js` |

### Finding: Two Completely Different TruthKernels

These share the same class name but have:
- Different constructor parameters (residualization/TRG params vs master switch threshold/chop penalty)
- Different internal composition (two sub-layers vs none)
- Different input contracts (`providers.v1-v4` vs `engines.regime/timeframe`)
- Different output contracts (DVF/TRG/EEF/epistemic authority vs signal/confidence/reason_codes)

**Imports resolve to the wrong kernel in verification tests** — 5 verification files (`verify_v02.js`, `verify_v03.js`, `verify_stream.js`, `verify_robustness.js`, `verify_mne.js`) import `'./src/engine/kernel.js'` (the frontend kernel), but the production runtime imports `'../../packages/lyzer-shared/src/engine/kernel.js'` (the shared kernel). **The verification suite provides zero coverage of the production kernel path.**

---

## 3. Missing Contract Enforcement

### 3a. No Layer Sequence Enforcement
There is no abstraction (no pipeline orchestrator, no state machine, no middleware chain) that enforces the 7-layer sequence. The order relies entirely on the developer manually ordering calls in `streamEngine.js:processCandle()`. Any reordering or omission would pass silently.

### 3b. Frontend Court Missing MOL + C-CLIST
`lyzer edge/src/eca/court.js` is a **simplified court** with only a `ConstraintEngine`. It does not import or instantiate `ContinuousCLIST` or `MetaObservationLayer`. This means the frontend/testing path:
```
DecisionStream → TruthKernel (frontend) → court (simplified)
```
completely skips C-CLIST and MOL validation.

### 3c. Consumers of the simplified frontend court
| File | Line | Impact |
|------|------|--------|
| `lyzer edge/src/eca/court.js` | 10 | Constructor has no C-CLIST/MOL |
| `lyzer edge/src/adaptive-sandbox/AdaptivePipelineController.js` | 147 | Uses `this.court.requestPermission()` — which court? |
| `lyzer edge/tests/verification/verify_eca.js` | 38, 49, 65, 70 | Tests the frontend court only |
| `lyzer edge/tests/e2e/cognitive_flow.test.js` | 65 | Tests the frontend court only |

### 3d. The `run_final_independent_review.js` document claims:
> "A ordem estrita (Providers → ResidualizationLayer → ExecutionTriggerLayer → TruthKernel → C-CLIST → MOL → ConstitutionalCourt) foi mantida intacta sem atalhos laterais."

**This claim is FALSE.** C-CLIST and MOL are pre-evaluated outside the court's single entry point (streamEngine.js:552–553), creating a lateral shortcut.

---

## 4. Silent Fallbacks

### 4a. CSRL Divergence Failure → SDS defaults to 0.0 (⚠️ CRITICAL)

`streamEngine.js:517–527`:
```js
try {
  if (typeof this.divergenceDetector.calculateDivergence === 'function') {
    sds = this.divergenceDetector.calculateDivergence(topology, invariants);
  } else if (typeof this.divergenceDetector.detect === 'function') {
    sds = this.divergenceDetector.detect(topology);
  }
} catch (csrlErr) {
  console.warn(...)
}
// sds remains 0.0 if both branches fail or throw
```

**Impact:** MOL evaluates SDS in recovery mode (`mol.js:46`): `if (sds <= 0.7)`. A failed CSRL sets SDS = 0, which makes MOL think the market is perfectly coherent. This **undermines the MOL recovery gate** — false awakenings can occur during actual market instability because the CSRL failure is swallowed.

### 4b. Dual Reality Monitor Failure → LHDS defaults to 0.0
`streamEngine.js:542–545`:
```js
if (this.dualMonitor && candle.timestamp) {
    lhds = await this.dualMonitor.calculateDivergence(...);
}
```
If `dualMonitor` is null (shadow mode disabled) or timestamp is missing, LHDS stays 0.0. LHDS = 0 passes the LHDS veto check (`kernel.js:46: lhds > lhdsVetoLimit`), so this fallback is conservative (safe to proceed). **Low risk.**

### 4c. Provider Disabled → Signal flat
`streamEngine.js:529–532`: Controlled, documented behavior. **Acceptable.**

### 4d. Execution Layer Null → Simulated
`streamEngine.js:335–337`: In SIMULATION mode, `execution = null`. `handleExecution()` is gated by checking `this.execution`. **Acceptable.**

---

## 5. Config Drift

### 5a. ExecutionTriggerLayer standalone default vs pipeline effective default

| Parameter | `executionTriggerLayer.js` (standalone) | Pipeline effective (`kernel.js` → `streamEngine.js`) | Documented |
|-----------|-------|---------|------------|
| `trgThreshold` | **0.8** | 0.4 | 0.4 |

The standalone `ExecutionTriggerLayer` class defaults to `0.8`, but `TruthKernel` (kernel.js:15) overrides it to `0.4`. The `0.8` default is dead code — any direct instantiation of `ExecutionTriggerLayer` without arguments gets `0.8`, but the pipeline always supplies `0.4`. **Minor drift.**

### 5b. All other defaults match

| Parameter | Code default | Env var | Documented | Match |
|-----------|-------------|---------|------------|-------|
| `residualization.consensusLimit` | 0.1 | `RESIDUAL_CONSENSUS_LIMIT` | 0.1 | ✓ |
| `kernel.lhdsVetoLimit` | 0.8 | `LHDS_VETO_LIMIT` | 0.8 | ✓ |
| `kernel.ontologicalCollapseTrg` | 0.7 | `ONTOLOGICAL_COLLAPSE_TRG` | 0.7 | ✓ |
| `trgExponent` | 2 | `TRG_EXPONENT` | 2 | ✓ |
| `cclist.lethalIllusionLimit` | 0.9 | `CCLIST_LETHAL_ILLUSION_LIMIT` | 0.9 | ✓ |
| `cclist.dvfFloor` | 0.1 | `CCLIST_DVF_FLOOR` | 0.1 | ✓ |
| `cclist.stressAccumulation` | 0.002 | `CCLIST_STRESS_ACCUMULATION` | 0.002 | ✓ |
| `cclist.stressRelease` | 0.1 | `CCLIST_STRESS_RELEASE` | 0.1 | ✓ |
| `mol.sclThreshold` | 3 | `MOL_SCL_THRESHOLD` | 3 | ✓ |

---

## 6. UUIDv7 Compliance

**Status: FAIL — every UUID in the codebase uses UUIDv4, not UUIDv7.**

| File | Line | Method | Standard |
|------|------|--------|----------|
| `packages/lyzer-constitution/src/eca/permission.js` | 16 | `crypto.randomUUID()` | UUIDv4 ❌ |
| `lyzer edge/src/eca/permission.js` | 15 | `crypto.randomUUID()` or `Math.random()` fallback | UUIDv4 ❌ |
| `packages/lyzer-shared/src/research/liveShadow/shadowExecutionEngine.js` | 146 | `crypto.randomUUID()` | UUIDv4 ❌ |
| `packages/lyzer-shared/src/research/liveShadow/realityGapMonitor.js` | 179 | `crypto.randomUUID()` | UUIDv4 ❌ |
| `lyzer edge/src/causal-memory/EventFactory.js` | 10 | `crypto.randomUUID()` or `Math.random()` fallback | UUIDv4 ❌ |
| `lyzer edge/src/components/commandCenter/sdk/lacw/cognitive/CertificationEngine.js` | 16 | `crypto.randomUUID()` or `Math.random()` fallback | UUIDv4 ❌ |
| `lyzer edge/src/components/commandCenter/sdk/lacw/observability/DecisionCertificateSigner.js` | 16 | `crypto.randomUUID()` or `Math.random()` fallback | UUIDv4 ❌ |
| `lyzer edge/src/components/commandCenter/sdk/lacw/plugins/PluginCertificationEngine.js` | 16 | `crypto.randomUUID()` or `Math.random()` fallback | UUIDv4 ❌ |

UUIDv7 uses timestamp-prefixed bytes (Unix ms + random) enabling time-ordered sorting and causal traceability. `crypto.randomUUID()` (UUIDv4) is purely random with no temporal ordering. **No execution trace can be causally ordered by ID alone.**

---

## 7. Additional Findings

### 7a. `sportsEngine.js` imports from the wrong relative path
`lyzer edge/backend/sports/sportsEngine.js:3`:
```js
import { TruthKernel } from '../kernel.js';
```
This resolves to `lyzer edge/backend/kernel.js` — does this file exist? If not, this is a broken import. If it's the frontend kernel, it's the wrong one.

### 7b. Trade IDs are not UUIDs
`streamEngine.js:764`:
```js
id: `trade_${index}`,
```
Trade IDs are sequential integers with no UUID at all — not even UUIDv4. This makes cross-system traceability impossible.

---

## Summary of Findings by Severity

| # | Finding | Severity | File(s) |
|---|---------|----------|---------|
| F1 | C-CLIST/MOL pre-evaluated outside `requestPermission()` — backdoor state mutation | **HIGH** | `streamEngine.js:552–553` |
| F2 | Two incompatible `TruthKernel` classes with same name — zero test coverage of production kernel | **HIGH** | `packages/lyzer-shared/src/engine/kernel.js` vs `lyzer edge/src/engine/kernel.js` |
| F3 | CSRL failure silently defaults SDS to 0, undermining MOL recovery gate | **HIGH** | `streamEngine.js:517–527` |
| F4 | No UUIDv7 — all IDs are UUIDv4 or sequential integers | **MEDIUM** | All `permission.js`, `streamEngine.js:764` |
| F5 | Frontend court missing C-CLIST + MOL — test suite doesn't validate full pipeline | **MEDIUM** | `lyzer edge/src/eca/court.js` |
| F6 | No layer sequence enforcement — relies on manual ordering | **MEDIUM** | `streamEngine.js:processCandle()` |
| F7 | `ExecutionTriggerLayer` standalone default (0.8) differs from pipeline default (0.4) | **LOW** | `executionTriggerLayer.js:12` |
| F8 | Unknown target of `sportsEngine.js:3 ../kernel.js` import | **LOW** | `lyzer edge/backend/sports/sportsEngine.js:3` |
| F9 | `run_final_independent_review.js` claims no lateral shortcuts — false | **LOW** | `run_final_independent_review.js:24` |

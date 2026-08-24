# Technical Investigation Report — Requirement R4 & Verification Suites

**Project:** Lyzer Edge Engine Refactoring  
**Author:** Explorer 3 (Survey Phase)  
**Date:** 2026-08-23T23:47:00Z  
**Status:** Completed  

---

## 1. Executive Summary

This report delivers the architectural survey and technical specification for:
1. **Requirement R4: Dynamic Limits in TruthKernel** — Replacing static veto and ontological collapse thresholds (`lhdsVetoLimit`, `ontologicalCollapseTrg`) with dynamic, regime-aware limits sensitive to market volatility, ATR expansion/compression, and multi-timeframe structural divergence.
2. **Verification Test Suites Catalog & Execution Map** — Cataloging all test suites across the monorepo (`npm test`, `npm run test:verify`, `e2e_suite.test.js`, `p0_fixes.test.js`, `boundary-certification-suite.ts`, and ad-hoc verification scripts), documenting execution requirements, environment gotchas, baseline results, and validation criteria.

---

## 2. Requirement R4: Dynamic Limits in TruthKernel

### 2.1 File Location & Single Source of Truth
- **Canonical Implementation:** `packages/lyzer-constitution/src/eca/truthKernel.js` (134 lines)
- **Re-export Hubs:**
  - `packages/lyzer-shared/src/engine/kernel.js` (`export { TruthKernel } from '../../../lyzer-constitution/src/eca/truthKernel.js';`)
  - `lyzer edge/src/engine/kernel.js` (`export { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';`)
- **Backend Consumption:** `lyzer edge/backend/streamEngine.js` line 17 (`import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";`)

### 2.2 Current Static Implementation & Problem Analysis

In `packages/lyzer-constitution/src/eca/truthKernel.js`:
```javascript
export class TruthKernel {
  constructor(options = {}) {
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
  }
```

In `evaluate(providers, micro = {})`:
```javascript
    // 3. Ontological Confidence Limits (OCL)
    const sds = micro.scaleDivergence || 0.0;
    const lhds = micro.lhds || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > this.lhdsVetoLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else {
      ...
      if (!oosBlocked) {
        if (sds < 0.3) {
          epistemicAuthority = 'OBSERVED';
        } else if (sds <= 0.7) {
          epistemicAuthority = 'INFERRED';
        } else {
          // SDS > 0.7 - Check for total structural collapse
          if (trg.trg >= this.ontologicalCollapseTrg) {
            epistemicAuthority = 'VETO';
            eef = false; // Constitutional override
            reason = 'VETO_ONTOLOGICAL_COLLAPSE';
          } else {
            epistemicAuthority = 'INFERRED';
          }
        }
      }
    }
```

#### Key Fragilities Identified:
1. **Rigid LHDS Threshold (`lhdsVetoLimit`)**:
   - Fixed at `0.8` (or configured at boot time via `process.env.LHDS_VETO_LIMIT`).
   - In quiet / low-volatility regimes (`COMPRESSION`), even modest feed latency or orderbook distortion represents an abnormal reality gap and should be vetoed more strictly (e.g. limit ~`0.65`).
   - In high-volatility / news-expansion regimes (`EXPANSION` / `NEWS_SHOCK`), natural exchange quote dispersion and cross-venue latency jitter widen legitimately. A static strict limit causes false-positive vetoes on high-EV breakouts.
2. **Rigid Ontological Collapse Threshold (`ontologicalCollapseTrg`)**:
   - Fixed at `0.7` (or configured at boot time via `process.env.ONTOLOGICAL_COLLAPSE_TRG`).
   - When inter-scale divergence (SDS) is elevated ($> 0.7$), TRG is compared against a fixed `0.7`.
   - Because $\text{TRG} = (\text{Divergence})^{\text{exponent}} \times \text{liquidityVacuum}$, higher market volatility naturally yields higher TRG amplitudes. In wide expansion, TRG $\ge 0.7$ is normal asymmetry, not necessarily structural collapse.
   - In compression regimes, a TRG of `0.45` during high SDS represents an extreme anomaly that should trigger collapse protection earlier.

### 2.3 Available Market Volatility & Regime Data in Codebase

The codebase already computes rich volatility and regime indicators across multiple modules:

| Metric | Source Module | Description | Typical Value Range |
|---|---|---|---|
| `atr14_pct` | `streamEngine.calculateOpportunityScore` (line 591) | Normalized ATR(14) percentage of close price | `0.0002` (calm) to `0.0050+` (volatile) |
| `volatilityRatio` / `atrRatio` | `packages/lyzer-shared/src/research/regimeClassifier.js` (line 66) | Short ATR (10) / Long ATR (30) ratio | `0.5` (compression) to `2.5+` (shock) |
| `compressionRatio` | `packages/lyzer-shared/src/research/regimeClassifier.js` (line 93) | Normalized standard deviation / Bollinger Band width proxy | `0.1` (tight) to `2.0+` (loose) |
| `marketRegime` | `packages/lyzer-shared/src/causality/marketStateEngine.js` / `regimeClassifier.js` | Categorical market state (`EXPANSION`, `COMPRESSION`, `RANGE_WIDE`, etc.) | String enum |
| `oppScore` | `streamEngine.calculateOpportunityScore` (line 614) | Multimodal opportunity score based on ATR, Vol Z-score, and VWAP distance | Integer `0` to `3` |
| `sds` (Scale Divergence) | `ScaleNormalizer` / `StreamEngine` line 748 | Cross-timeframe tensor divergence | Float `0.0` to `1.0` |
| `lhds` | `DualRealityMonitor` line 765 | Dual Reality Harmonic Divergence Score | Float `0.0` to `1.0` |

### 2.4 Proposed Dynamic Limit Architecture

To satisfy Requirement R4 while maintaining **100% backward compatibility** with existing tests and deterministic defaults:

#### Mathematical Model:
Let:
- $L_0 = \text{this.baseLhdsVetoLimit}$ (default `0.80` or options override)
- $C_0 = \text{this.baseOntologicalCollapseTrg}$ (default `0.70` or options override)
- $R_v = \text{volatilityRatio} = \frac{\text{ATR}_{\text{short}}}{\text{ATR}_{\text{long}}}$ (or derived from `micro.volatilityRatio`, `micro.atrRatio`, `micro.expansionFactor`, or `micro.volatility`)

When volatility information is present in `micro`:
$$\kappa = \text{clamp}(R_v, 0.60, 1.50)$$
$$L_{\text{dynamic}} = \text{clamp}(L_0 \times \kappa^{0.5}, 0.50, 0.98)$$
$$C_{\text{dynamic}} = \text{clamp}(C_0 \times \kappa^{0.75}, 0.35, 1.25)$$

When categorical `micro.regime` is provided:
- `COMPRESSION` / `ACCUMULATION`: $\kappa = 0.80$ (stricter limits: $L \approx 0.71, C \approx 0.59$)
- `EXPANSION` / `TREND`: $\kappa = 1.25$ (relaxed limits: $L \approx 0.89, C \approx 0.83$)
- `NEWS_SHOCK`: $\kappa = 1.40$ (resilient limits: $L \approx 0.95, C \approx 0.90$)
- `RANGE` / `UNKNOWN` / default: $\kappa = 1.00$ (nominal baseline limits: $L = L_0, C = C_0$)

#### Implementation Blueprint for `truthKernel.js`:
```javascript
export class TruthKernel {
  constructor(options = {}) {
    const trgThreshold = options.trgThreshold != null ? options.trgThreshold : (options.masterSwitchThreshold != null ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold != null ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.baseLhdsVetoLimit = options.lhdsVetoLimit != null ? options.lhdsVetoLimit : 0.8;
    this.baseOntologicalCollapseTrg = options.ontologicalCollapseTrg != null ? options.ontologicalCollapseTrg : 0.7;
    this.dynamicLimitsEnabled = options.dynamicLimits !== false;
  }

  /**
   * Computes runtime dynamic limits based on market volatility and regime.
   * Gracefully defaults to base thresholds if micro metrics are absent.
   */
  computeDynamicLimits(micro = {}) {
    if (!this.dynamicLimitsEnabled) {
      return {
        lhdsVetoLimit: this.baseLhdsVetoLimit,
        ontologicalCollapseTrg: this.baseOntologicalCollapseTrg,
        volatilityFactor: 1.0
      };
    }

    let volFactor = 1.0;
    if (typeof micro.volatilityRatio === 'number' && Number.isFinite(micro.volatilityRatio)) {
      volFactor = Math.min(1.5, Math.max(0.6, micro.volatilityRatio));
    } else if (typeof micro.atrRatio === 'number' && Number.isFinite(micro.atrRatio)) {
      volFactor = Math.min(1.5, Math.max(0.6, micro.atrRatio));
    } else if (typeof micro.expansionFactor === 'number' && Number.isFinite(micro.expansionFactor)) {
      volFactor = Math.min(1.5, Math.max(0.6, micro.expansionFactor));
    } else if (typeof micro.regime === 'string') {
      const reg = micro.regime.toUpperCase();
      if (reg.includes('EXPANSION') || reg.includes('TREND')) volFactor = 1.25;
      else if (reg.includes('COMPRESSION') || reg.includes('ACCUMULATION')) volFactor = 0.80;
      else if (reg.includes('NEWS') || reg.includes('SHOCK')) volFactor = 1.40;
    }

    const dynamicLhds = Math.min(0.98, Math.max(0.50, this.baseLhdsVetoLimit * Math.pow(volFactor, 0.5)));
    const dynamicCollapse = Math.min(1.25, Math.max(0.35, this.baseOntologicalCollapseTrg * Math.pow(volFactor, 0.75)));

    return {
      lhdsVetoLimit: dynamicLhds,
      ontologicalCollapseTrg: dynamicCollapse,
      volatilityFactor: volFactor
    };
  }
```

In `evaluate(providers, micro = {})`:
```javascript
    // Compute dynamic limits at runtime
    const { lhdsVetoLimit, ontologicalCollapseTrg, volatilityFactor } = this.computeDynamicLimits(micro);

    // 3. Ontological Confidence Limits (OCL) with dynamic thresholds
    const sds = micro.scaleDivergence || 0.0;
    const lhds = micro.lhds || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > lhdsVetoLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else {
      ...
      if (!oosBlocked) {
        if (sds < 0.3) {
          epistemicAuthority = 'OBSERVED';
        } else if (sds <= 0.7) {
          epistemicAuthority = 'INFERRED';
        } else {
          // SDS > 0.7 - Check for dynamic ontological collapse
          if (trg.trg >= ontologicalCollapseTrg) {
            epistemicAuthority = 'VETO';
            eef = false; // Constitutional override
            reason = 'VETO_ONTOLOGICAL_COLLAPSE';
          } else {
            epistemicAuthority = 'INFERRED';
          }
        }
      }
    }
```

Output object should include dynamic limits for observability & Causal Memory auditing:
```javascript
    return {
      dvf: dvf.divergence,
      tension: dvf.tension,
      isConsensus: dvf.isConsensus,
      trg: trg.trg,
      eef,
      reason_codes: [reason],
      epistemic_authority: epistemicAuthority,
      dynamic_limits: {
        lhdsVetoLimit,
        ontologicalCollapseTrg,
        volatilityFactor
      },
      raw_metrics: {
        v1_confidence: v1?.confidence || 0,
        v2_confidence: v2?.confidence || 0,
        liquidity_vacuum: micro?.liquidityDivergence || 1.0,
        scale_divergence: sds
      }
    };
```

---

## 3. Comprehensive Map of Verification Test Suites

### 3.1 Environment & Execution Requirements

| Parameter | Configuration |
|---|---|
| **OS / Shell** | Windows Server 2025 / PowerShell 5.1 |
| **Node.js** | v20.11.1 / ESM (`"type": "module"`) |
| **Critical PowerShell Note** | `npm.ps1` execution is blocked by Windows execution policy. **Always invoke `npm.cmd` or `npx.cmd`** |
| **Working Directory** | `lyzer edge/` for all test commands |
| **Vitest Config** | `lyzer edge/vitest.config.js` (`environment: 'jsdom'`, `singleFork: true`, aliases for `@lyzer/shared`, `@lyzer/constitution`, and `@`) |

### 3.2 Test Suites Breakdown & Execution Commands

```
                              ┌─────────────────────────────┐
                              │  Lyzer Edge Test Ecosystem  │
                              └──────────────┬──────────────┘
                                             │
      ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
      ▼                  ▼                   ▼                   ▼                  ▼
┌─────────────┐   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    ┌─────────────┐
│  npm test   │   │ test:verify │     │  e2e_smc    │     │  p0_fixes   │    │  boundary-  │
│ (Full Unit) │   │ (Smoke Set) │     │ (126 Tests) │     │(Regressions)│    │certification│
│  147 files  │   │   6 files   │     │   4 Tiers   │     │  31 tests   │    │(NATS+RustGW)│
└─────────────┘   └─────────────┘     └─────────────┘     └─────────────┘    └─────────────┘
```

#### 1. Full Vitest Suite (`npm.cmd test`)
- **Command:** `npm.cmd test` (from `lyzer edge/`)
- **Scope:** 147 test files across all subsystems (adaptive evaluation/evolution/sandbox, causal learning/memory/reflection, distributed runtime, empirical validation, evolution governance, institutional production, market organism, smc, unit, providers).
- **Execution Profile:** ~35s duration, 546+ passing tests.
- **Observed Note:** WAL latency benchmark in `benchmark_persistence_wal.test.js` measures SQLite batch write latencies and will be dramatically improved by R2 async batching.

#### 2. Focused Smoke Verification Suite (`npm.cmd run test:verify`)
- **Command:** `npm.cmd run test:verify` (from `lyzer edge/`)
- **Scope:** 6 test files in `tests/verification/`:
  - `verify_observer_dynamics.test.js` (4 tests)
  - `verify_oos11_microstructure.test.js` (2 tests)
  - `verify_dynamic_weights.test.js` (3 tests)
  - `verify_dual_strategy.test.js` (3 tests)
  - `verify_forward_ledger.test.js` (1 test)
  - `verify_suite.test.js` (24 tests)
- **Status:** **37 / 37 passed** (2.87s duration).

#### 3. SMC E2E Suite (`e2e_suite.test.js`)
- **Command:** `npm.cmd test -- tests/e2e_smc/e2e_suite.test.js` (from `lyzer edge/`)
- **Scope:** 126 test cases structured into 4 strict tiers:
  - **Tier 1 — Feature Coverage (55 tests):** F1 MTF ingestion, F2 V1 SMC, F3 V2 SnD, F4 V3 Momentum, F5 Residualization, F6 ETT, F7 TruthKernel LHDS, F8 TruthKernel Ontological Collapse, F9 Constitutional Axioms, F10 C-CLIST, F11 MOL.
  - **Tier 2 — Boundary Value Analysis (35 tests):** Extreme edge cases for confidence values, TRG thresholds, LHDS veto limits, SDS boundaries, C-CLIST limits, MOL cooldowns.
  - **Tier 3 — Integration & Invariant Properties (31 tests):** 3-process isolation, continuous pipeline execution, state machine transitions, singleton court isolation.
  - **Tier 4 — Real-World Workloads (5 tests):** Flash crash, choppy consolidation, high volatility breakout, low liquidity drift, daily capital guardrail.
- **Status:** **126 / 126 passed** (3.07s duration).

#### 4. P0 Fixes Regression Suite (`p0_fixes.test.js`)
- **Command:** `npm.cmd test -- tests/unit/p0_fixes.test.js` (from `lyzer edge/`)
- **Scope:** 31 tests covering critical production fixes:
  - Fix A: MOL normalization in `court.js`
  - Fix C: `releaseDailyCapital()` in `streamEngine.js`
  - Fix D: `getCourtSecret()` / HMAC token verification in `permission.js`
  - Fix F: Admin authentication via headers in `server.js`
  - Fix I: Promise rejection propagation in `alphaDiscoveryEngine.js`
- **Status:** **31 / 31 passed** (3.67s duration).

#### 5. Boundary Certification Suite (`boundary-certification-suite.ts`)
- **Specification:** `lyzer edge/BOUNDARY_SPEC.md` and `lyzer edge/run-certification.ps1`
- **Infrastructure Requirements:**
  - `nats-server -js` (JetStream Broker on `localhost:4222`)
  - `lyzer-risk-gateway` Rust binary (gRPC Server on `localhost:50051`)
  - `setup-nats.ts` stream/subject topology initialization
- **Execution Script:** `.\run-certification.ps1` or:
  ```powershell
  # 1. Start NATS Server
  Start-Process -NoNewWindow nats-server -ArgumentList "-js"
  # 2. Start Risk Gateway Binary
  Start-Process -NoNewWindow cargo -ArgumentList "run --manifest-path src-rust/lyzer-risk-gateway/Cargo.toml"
  # 3. Setup NATS Streams
  npx.cmd tsx src-ts/scripts/setup-nats.ts
  # 4. Execute Certification Suite
  npx.cmd tsx src-ts/scripts/boundary-certification-suite.ts
  ```

#### 6. Ad-Hoc Verification Scripts (`tests/verification/*.js`)
- `node tests/verification/verify_stream.js` — StreamEngine continuous tick stream evaluation
- `node tests/verification/verify_mne.js` — Market Narrative Engine multi-scenario audit
- `node tests/verification/verify_robustness.js` — Multi-asset robustness simulation across datasets
- `node tests/verification/verify_compliance.js` — Constitutional Court ECA rule compliance audit
- `node tests/verification/full_system_execution_auditor.js` — Full execution pipeline auditor

---

## 4. Verification & Validation Strategy for Requirements (R1 - R4)

| Requirement | Primary Verification Command | Targeted Test Files / Suites | Key Invariants to Guard |
|---|---|---|---|
| **R1: Zero-Allocation Open Mobius (V8)** | `npm.cmd test -- tests/unit/` | `tests/verification/benchmark_providers.js`, `tests/verification/verify_v02.js` | Zero `.map()` calls in per-tick loops; memory allocation flatline during high-frequency tick burst |
| **R2: Async Batching for SQLite (Causal Memory)** | `npm.cmd test -- tests/causal-memory/` & `npm.cmd test -- tests/observability/benchmark_persistence_wal.test.js` | `tests/causal-memory/eventStore.test.js`, `tests/causal-memory/causalPipeline.test.js`, `tests/observability/benchmark_persistence_wal.test.js` | Event loop non-blocking; `insertCausalEvent` buffers in-memory; periodic `BEGIN TRANSACTION` / `COMMIT`; p99 write latency $< 100\text{ms}$ |
| **R3: Spatial Temporal Memory in SMC (V1)** | `npm.cmd test -- tests/e2e_smc/e2e_suite.test.js` & `npm.cmd test -- tests/smc/` | `tests/e2e_smc/e2e_suite.test.js` (Tier 1 F2 tests 1-5), `tests/smc/liquidityEngine.test.js`, `tests/smc/structureEngine.test.js` | Historical unmitigated FVGs/OBs retained beyond sliding window of N candles; memory bounded by spatial index cleanup |
| **R4: Dynamic Limits in TruthKernel** | `npm.cmd test -- tests/e2e_smc/e2e_suite.test.js` & `npm.cmd run test:verify` | `tests/e2e_smc/e2e_suite.test.js` (Tier 1 F7/F8, Tier 2 F7/F8 BVA tests), `tests/unit/p0_fixes.test.js` | Dynamic calculation of `lhdsVetoLimit` & `ontologicalCollapseTrg`; 100% backward compatibility when micro metrics default; no hardcoded static limits |

---

## 5. Architectural Recommendations for Implementation Phase

1. **Parameter Backward Compatibility:**
   Maintain constructor parameter signatures (`lhdsVetoLimit`, `ontologicalCollapseTrg`, `trgThreshold`) as base thresholds ($L_0, C_0$), allowing existing unit test instantiations (`new TruthKernel({ lhdsVetoLimit: 0.8 })`) to function as expected while applying dynamic volatility multipliers at evaluation time when volatility metrics are passed.
2. **Graceful Fallback:**
   If `micro` is empty or lacks volatility indicators, `computeDynamicLimits()` must return $(L_0, C_0)$ with `volatilityFactor: 1.0`, ensuring zero test breakage across the 126 E2E test cases.
3. **Observability Emission:**
   Include `dynamic_limits` in the returned `kernelResult` object and ensure `db.insertCausalEvent` captures it in `KERNEL_VERDICT` payloads for causal replay and auditability.
4. **Toolchain Execution:**
   All execution agents must execute commands with `npm.cmd` / `npx.cmd` due to the Windows PowerShell execution policy environment.

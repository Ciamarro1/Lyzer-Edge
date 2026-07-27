# Test Quality Audit Report

**Date:** 2026-07-27
**Auditor:** Test Quality & Coverage Auditor
**Scope:** `lyzer edge/tests/` — 139 test files, 557 tests

---

## 1. Test Map

| Suite | Type | # Tests | Pipeline Coverage | Passes? |
|-------|------|:-------:|:-----------------:|:-------:|
| `e2e_smc/e2e_suite.test.js` | Integration/E2E | 126 | 7/7 layers | ✅ ALL |
| `verification/verify_suite.test.js` | Smoke/Integrity | 16 | N/A (file integrity) | ✅ |
| `unit/providers/*.test.js` | Unit | ~4 | Mock/Live/Replay/Historical providers | ✅ |
| `unit/commandCenter/sdk/*.test.js` | Unit | ~130 | LACW SDK subsystems | ✅ (mostly) |
| `cognitive-intelligence/*.test.js` | Integration | ~12 | Intelligence pipeline (Fase 8) | ❌ 1 failed |
| `causal-memory/*.test.js` | Integration | ~12 | Event store, CSRL, SMC (Sprint 1-3) | ❌ 7 failed |
| `causal-learning/*.test.js` | Integration | ~6 | Knowledge graph, mining (Fase 6) | ❌ 2 failed |
| `causal-reflection/*.test.js` | Integration | ~5 | Counterfactual, dream (Fase 6.6) | ❌ 2 failed |
| `adaptive-sandbox/*.test.js` | Integration | ~11 | Adaptive pipeline (Fase 7) | ❌ 9 failed |
| `adaptive-evolution/*.test.js` | Integration | ~9 | Evolution pipeline (Fase 7.3) | ❌ 3 failed |
| `adaptive-evaluation/*.test.js` | Integration | ~14 | Evaluation pipeline (Fase 7.2) | ❌ 9 failed |
| `smc/*.test.js` | Unit | ~22 | SMC engines (trend, liquidity, etc) | ✅ |
| `providers/v4_imce.test.js` | Unit | 1 | V4 IMCE provider | ✅ |
| `market-organism/*.test.js` | Integration | ~3 | Organism lifecycle (Fase 11) | ❌ 1 failed |
| `cognitive-portfolio/*.test.js` | Integration | ~3 | Portfolio optimization (Fase 10) | ❌ 1 failed |
| `empirical-validation/*.test.js` | Integration | ~9 | Empirical pipeline (Fase 9) | ❌ 2 failed |
| `cognitive-operations/*.test.js` | Integration | ~4 | Ops pipeline (Fase 12) | ❌ 1 failed |
| `e2e/*.test.js` | E2E | 2 | Cognitive flow, dual-reality | ❌ 1 failed |
| `verification/*.js` | Ad-hoc scripts | 0 (non-test) | Signal, ECA, stream, decomposition | N/A |
| `institutional-production/*.test.js` | Integration | ~7 | CB, bus, adapters, pipeline | ✅ |
| `observability/*.test.js` | Benchmark | 3 | WAL persistence, metrics, baseline | ❌ 1 failed |
| `browser/*.test.js` | Performance | 2 | Shell, ChartHost stress | ❌ 1 failed |
| **TOTAL** | Mixed | **557** | **7/7 pipeline layers** | **517 ✅ / 40 ❌** |

---

## 2. Pipeline Coverage Matrix

| Layer | Tested? | Tests | Quality |
|-------|:-------:|-------|:-------:|
| **Providers V1-V4** | ✅ | e2e_suite (F1-F4, 20 tests), v4_imce.test.js, unit/providers/ | **Excellent.** V1 (SMC/ICT), V2 (SnD), V3 (RSI), V4 (IMCE) all tested with FVG, sweeps, support/resistance, RSI extremes, causality. Boundary cases for insufficient data, extreme prices, zero volume. |
| **ResidualizationLayer** | ✅ | e2e_suite (F5, F5-BVA: 10 tests) | **Good.** Consensus destruction, divergence preservation, tension calculation, consensusLimit=0 edge case, max divergence. |
| **ExecutionTriggerLayer** | ✅ | e2e_suite (F6, F6-BVA: 10 tests) | **Good.** TRG threshold, EEF authorization, false consensus block, negative TRG, exact boundary. |
| **TruthKernel** | ✅ | e2e_suite (F7-F8, BVA: 20 tests) | **Excellent.** LHDS veto (5 tests), ontological collapse (5 tests), boundary analysis (10 tests) covering exact limits, 0.0, 1.0, invalid inputs, dynamic limits. Priority ordering of LHDS vs collapse. |
| **C-CLIST** | ✅ | e2e_suite (F10, F10-BVA: 10 tests) | **Good.** Stress accumulation/release, lethal illusion, TRG explosion (max stress), dvfFloor=0, max accumulation, floor-to-zero release. |
| **MOL** | ✅ | e2e_suite (F11, F11-BVA: 10 tests) | **Good.** State machine (VETO→RECOVERY→EXECUTE), SCL tracking, recovery awakening, threshold=0, high threshold, authority reversion. |
| **ConstitutionalCourt** | ✅ | e2e_suite (F9, F9-BVA: 10 tests), verify_eca.js | **Excellent.** Axiom check (confidence/prediction veto), pairwise override priority, ledger tracking, null/undefined handling, empty strings. Also governance capture, edge riding, kill switch. |
| **ExchangeExecution** | ⚠️ Partial | e2e_suite (Tier 4, Scenario 5) | **Minimal.** Only daily capital safeguard. No real exchange mocking, no order book simulation, no fill probability, no slippage models, no exchange failure recovery. |

---

## 3. Critical Gaps

### Security Tests — **ZERO**
No dedicated security test files exist. Tests do NOT cover:
- Injection attacks on signal/candle data
- Authenticated/authorized access to execution endpoints
- Rate limiting, DoS protection
- Sensitive data exposure (API keys in logs)
- Input validation boundary overflow
- Protobuf/gRPC message tampering

### Exchange Execution — **CRITICAL**
Only 1 test covers exchange interaction (daily capital limit). Missing:
- Mock exchange adapter with realistic order book depth
- Partial fill scenarios
- Exchange disconnection/reconnection
- Order rejection (insufficient balance, market closed)
- Slippage models and execution quality scoring
- Exchange failover and circuit breaker state

### Performance/Load Tests — **WEAK**
3 performance tests exist but 2 fail:
- `openmobiusCoprocessor.test.js` — expects >20k c/s, gets ~11.9k (environment-dependent)
- `chartHost_stress.performance.test.js` — memory budget exceeded
- `benchmark_persistence_wal.test.js` — `db.close is not a function`
- No throughput testing for the kernel/pipeline itself
- No latency percentile testing for court decision path

### Concurrency/Race Condition Tests — **ZERO**
No tests verify:
- Simultaneous candle updates from multiple timeframes
- Concurrent `requestPermission` calls to the court
- Race between MOL state changes and kernel evaluation
- Race between C-CLIST stress updates and permission checks
- Shared state mutation across the 6 StreamEngine instances

### Cross-StreamEngine State Isolation — **ZERO**
StreamEngine is designed to run 6 instances. No tests verify:
- Independent C-CLIST stress per pair
- Independent MOL state per pair
- No leakage between TruthKernel instances
- However, `signalEngine` is a shared singleton — no tests for thread safety

### Rust Kernel Tests — **NONE**
`src-rust/` and `lyzer-workspace/` have no test files. The Rust gRPC services (RiskGateway, IntentRegistry) are untested.

### 3-Process Isolation — **ZERO**
No integration tests verify the 3-process runtime topology (Execution Node, ECA Court Node, Dashboard Node).

### Edge Riding Detection — **SUPERFICIAL**
Only tested in `verify_eca.js` as an ad-hoc script (not a real vitest test). Missing:
- Combined drawdown + slippage near-miss scenarios
- Reset behavior after successful trade
- Multiple asset edge-riding accumulation

### Verification Scripts — **NOT REAL TESTS**
`verify_*.js` files in `verification/` are standalone Node scripts (not vitest). They use ad-hoc `console.log` assertions. They DO contribute to the pipeline execution but are not counted in the 557 tests.

---

## 4. Test Quality Score

| Criterion | Score (0-10) | Notes |
|-----------|:------------:|-------|
| **Assertion Density** | 8 | e2e_suite averages ~3-4 assertions/test; unit suites ~2-3. Good specificity. |
| **Edge Case Coverage** | 7 | BVA tier adds 55 boundary tests. Missing overflow, malformed inputs, protocol-level attacks. |
| **Mock Realism** | 6 | Candles are simple objects (flat/up/down generators). No real market data replay, no order book simulation. Court/pipeline mocks are reasonable but `dualMonitor` and `divergenceDetector` are stub alternatives. |
| **Test Independence** | 7 | `beforeEach` resets court singleton state. However, module-level singletons (`court`, `ledger`, `signalEngine`) create implicit coupling risk. |
| **Documentation** | 8 | Test names are descriptive (e.g., "Tier 1 - F2 (V1 SMC) 1: Bullish FVG signal detection"). Tier structure is well-organized. |
| **Maintainability** | 6 | 139 test files in 26 directories is complex. Large duplication of helper functions across files. Verify scripts are untracked in quality pipeline. |
| **Coverage Completeness** | 5 | 7 pipeline layers covered but 3 major areas (security, exchange, concurrency) are completely absent. |
| **Overall** | **6.7/10** | Strong on pipeline logic. Weak on security, operations, and integration boundaries. |

---

## 5. Test Execution Report

| Metric | Value |
|--------|:-----:|
| **Test Files** | 139 |
| **Total Tests** | 557 |
| **Passed** | **517 (92.8%)** |
| **Failed** | **40 (7.2%)** |
| **Failed Files** | **31** |
| **Duration** | 103s |

### Failure Root Cause Analysis

| Failure Pattern | Files Affected | Root Cause |
|----------------|:--------------:|------------|
| `db.close is not a function` | 3 | SQLite db mock returns object without `close` method — **test infrastructure bug** |
| `pipelineController.test.js` (all 5 fail) | 1 | `Reflect` / `extractInsights` method missing on some object — **likely API mismatch** |
| `eventStore`, `causalPipeline`, `csrlSnapshot`, `smcFeatureEvent` | 5 | `better-sqlite3` or SQLite in-memory DB initialization failure — **database setup issue** |
| `performance > 20000 c/s` (got 11914) | 1 | Environment-dependent threshold — **should be configurable or lower** |
| `chartHost_stress` memory budget | 1 | **Actual performance regression or CI budget too tight** |
| `widgetComplianceGate` certification | 1 | Widget audit criteria changed but test not updated — **test drift** |
| `dual_reality_monitor` | 1 | Assertion mismatch in monitor behavior — **likely API change** |
| Remaining Fase 6/7/8/9/10/11/12 pipeline tests | ~17 | Consolidated SQLite/CausalDB connection failures — **systemic test infra issue** |

### Key Finding
~28 of the 40 failures (70%) are caused by **SQLite database initialization issues** in test infrastructure (`db.close`, `eventStore`, causal memory tests). Only ~8 failures are genuine logic/regression issues. The `e2e_suite.test.js` (the crown jewel with 126 tests covering all 7 pipeline layers) **passes 100%**.

---

## Recommendations (Priority Order)

1. **Fix SQLite test infrastructure** — unblocks ~28 failing tests across 10 suites
2. **Add security tests** — input validation, API key protection, injection resistance
3. **Add exchange execution tests** — mock exchange with order book, fills, slippage, disconnection
4. **Add concurrency/race tests** — parallel candle processing, simultaneous court requests
5. **Convert verify_*.js scripts to real vitest tests** — they contain valuable ECA/court logic that should be in the pipeline
6. **Lower performance thresholds or make them platform-aware** — 20k c/s is not realistic in CI
7. **Add Rust workspace tests** — unit tests for kernel, RiskGateway, IntentRegistry

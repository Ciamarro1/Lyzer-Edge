# SACROSANCT COMPONENT INVENTORY & ALPHA PIPELINE GUARDIANSHIP

- **Author**: Quant Guardian & Principal Software Architect (@lyzer-guardian)
- **Status**: SACROSANCT PROTECTION DIRECTIVE
- **Axiom**: *"No simplification action may delete, degrade, or mutate any class, method, filter, or threshold that contributes directly to alpha generation or quantitative verification."*

---

## 1. Executive Summary

During the architectural simplification of Lyzer Edge v2.0, codebase footprint will be reduced from ~48,500 LoC to ~14,500 LoC (~70.1% reduction). To guarantee zero loss of quantitative edge and zero compromise of capital safety, this document establishes the **SACROSANCT INVENTORY**.

Every item listed in Section 2 is classified as **SACROSANCT (IMMUTABLE & CANNOT BE REMOVED)**. Any pull request, refactoring, or file deletion that touches these files or methods must undergo quantitative parity verification using `RuntimeParityReplay`.

---

## 2. Detailed Sacrosanct Module Inventory

### Stage 1: Market Data & Timeframe Queues
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/smc/timeframeManager.js` | `TimeframeManager` | `addCandle()`, `getQueues()`, `synchronizeMTF()`, rolling queues (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`) | Standardizes multi-timeframe candle inputs and guarantees strict candle-close synchronization. | Prevents lookahead bias and temporal misalignment across SMC multi-timeframe analysis. |
| `lyzer edge/backend/liveDataIngestor.js` | `LiveDataIngestor` | `warmupCandles()`, `startWebSocket()`, `onTick` callback handler | Ingests real-time Binance WebSocket candles and populates historical warmup queues. | Essential interface between live market micro-structure and StreamEngine tick processing. |

---

### Stage 2: SMC (Smart Money Concepts Engine) — Core Alpha Generator
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/smc/smcFacade.js` | `SmcEngineFacade` | `evaluate(mtfCandles)`, `detectM15BOS()`, `evaluateOrderBlocks()` | **Top Alpha Contributor (29.12% predictive feature importance)**. Combines structure, liquidity, and trend into trade setups. | Deleting or altering M15 BOS detection immediately degrades system win-rate and profit factor. |
| `packages/lyzer-shared/src/smc/structureEngine.js` | `StructureEngine` | `detectBOS()`, `detectCHoCH()`, `findOrderBlocks()`, `findFVG()` | Identifies market structure breaks (BOS), character shifts (CHoCH), Order Blocks (OB), and Fair Value Gaps (FVG). | Provides structural price anchors and entry/stop-loss boundaries required for institutional R:R ratios. |
| `packages/lyzer-shared/src/smc/liquidityEngine.js` | `LiquidityEngine` | `findLiquidityPools()`, `detectSweeps()`, `findEQL_EQH()` | Detects Buy-side Liquidity (BSL), Sell-side Liquidity (SSL), EQL/EQH, and liquidity sweeps. | Prevents entering trades into retail trap zones; identifies liquidity sweeps preceding institutional expansion. |
| `packages/lyzer-shared/src/smc/trendEngine.js` | `TrendEngine` | `evaluateTrend()`, `getHigherHighsLows()` | Classifies MTF trend state across H4/H1/M15 timeframes. | Ensures trading only in alignment with higher-timeframe order flow. |
| `packages/lyzer-shared/src/providers/v1_smc_ict.js` | `LiquidityReconstructionEngine` | `reconstruct(mtfCandles)` | V1 provider generating raw SMC/ICT signals. | Provides primary baseline signal input for residualization. |
| `packages/lyzer-shared/src/providers/v2_snd_snr.js` | `StructuralBoundaryEngine` | `reconstruct(mtfCandles)` | V2 provider generating Supply & Demand / Support & Resistance levels. | Validates structural boundaries against SMC order blocks. |
| `packages/lyzer-shared/src/providers/v3_momentum_rsi.js` | `MomentumRsiEngine` | `reconstruct(mtfCandles)` | V3 provider generating momentum divergence signals. | Captures exhaustion and momentum confirmation. |
| `packages/lyzer-shared/src/providers/v4_imce.js` | `InstitutionalMarketCausalityEngine` | `reconstruct(mtfCandles)` | V4 causal provider adding institutional market causality metrics. | Highest confidence narrative provider for telemetry and state classification. |

---

### Stage 3: Execution Trigger Layer & Consensus Removal
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/engine/executionTriggerLayer.js` | `ExecutionTriggerLayer` | `evaluateTrigger()`, `TRG_THRESHOLD` ($\ge 0.40$) | Filters signals based on Tail Risk Geometry (TRG). Requires $\text{TRG} \ge 0.40$. | Eliminates low-geometry noise signals; directly boosts profit factor. |
| `packages/lyzer-shared/src/engine/residualization.js` | `ResidualizationLayer` / `Residualizer` | `residualize()`, `consensusLimit` (0.10 / 0.0) | Destroys collinear consensus between provider signals V1-V4 to isolate orthogonal alpha. | Prevents false confidence caused by correlated provider outputs. |
| `packages/lyzer-shared/src/engine/evSignalRedesign.js` | `EvSignalEngine` | `generateSignal()`, `evaluateDirectionalEV()` | Computes directional expected value scores for raw signals. | Translates raw provider outputs into unified signal proposals. |

---

### Stage 4: TruthKernel — Epistemic & Volatility Gate
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/engine/kernel.js` | `TruthKernel` | `evaluate()`, `lhdsVetoLimit` (0.80), `trgThreshold` (0.40), `ontologicalCollapseTrg` (0.70) | **Second Top Alpha Contributor (18.00% predictive feature importance)**. Calculates LHDS, TRG, and DVF. Vetoes bad trades. | Acts as the primary epistemic filter. Vetoes signals during ontological collapse or high dimensional stress. |
| `packages/lyzer-shared/src/csrl/ScaleNormalizer.js` | `ScaleNormalizer` | `alignScales()` | Normalizes price and volume arrays across timeframes into tensor matrices. | Prerequisite for cross-scale invariant extraction in TruthKernel. |
| `packages/lyzer-shared/src/csrl/CrossScaleTensorGraph.js` | `CrossScaleTensorGraph` | `buildTopology()` | Constructs cross-scale topological graphs across multi-timeframe queues. | Measures structural cohesion across market scales. |
| `packages/lyzer-shared/src/csrl/InvariantExtractor.js` | `InvariantExtractor` | `extract()` | Extracts scale-invariant topological features. | Input vector for scale divergence calculation. |
| `packages/lyzer-shared/src/csrl/DivergenceDetector.js` | `DivergenceDetector` | `calculateDivergence()`, `detect()` | Computes Scale Divergence Score (SDS). | Feeds SDS directly into TruthKernel's DVF evaluation. |

---

### Stage 5: Constitution & ECA Sovereign Court
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-constitution/src/eca/court.js` | `ConstitutionalCourt`, `court` singleton | `requestPermission()`, `configure()`, `evaluateAxioms()` | Sovereign final gate. Enforces EEF token validation and risk constraints. | Guarantees that no order reaches execution without passing constitutional safety checks. |
| `packages/lyzer-constitution/src/eca/c-clist.js` | `CCLIST` | `evaluateStress(trg, dvf)`, `lethalIllusionLimit` (0.90) | Counterfactual Causality Stress Oracle. Accumulates stress when DVF is flat; blocks at 0.90 limit. | Prevents trading during regime shifts or deceptive flat-volatility illusion states. |
| `packages/lyzer-constitution/src/eca/mol.js` | `MOL` | `evaluateState()`, `sclThreshold` (consecutive stable ticks = 3) | Meta-Observation Layer. Imposes recovery holding period after stress events. | Stops overtrading immediately following market anomalies or volatility shocks. |
| `packages/lyzer-constitution/src/eca/permission.js` | `PermissionManager` | `issueToken()`, `verifyToken()` | Generates cryptographically traceable permission tokens for order routing. | Prevents unauthorized or bypass trade execution. |
| `packages/lyzer-constitution/src/eca/ledger.js` | `ConstitutionalLedger` | `appendEvent()`, `auditQuery()` | Immutable audit log of all court evaluations and decisions. | Provides full institutional auditability for governance and regulatory compliance. |

---

### Stage 6: Execution Gateway
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `lyzer edge/backend/exchangeExecution.js` | `ExchangeExecution` | `placeOrder()`, `cancelOrder()`, `getPositions()` | Real/Testnet spot & futures exchange order gateway (Binance API). | Safe execution interface with mock fallback for simulation mode. |
| `src-rust/lyzer-shadow-oms/` | Rust `RiskGateway` & `ShadowOMS` | `Authorize`, `RegisterIntent`, `AppendIntentEvent` | High-performance Rust gRPC execution node with UUIDv7 causal traceability. | Ensures sub-millisecond execution authorization and strict 3-process isolation. |

---

### Stage 7: Replay System & Quantitative Verification
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/smc/replayEngine.js` | `ReplayEngine` | `runReplay()`, `stepTick()` | Deterministic historical tick replay harness for backtesting. | Allows exact reproduction of market conditions for strategy validation. |
| `packages/lyzer-shared/src/smc/runtimeParityReplay.js` | `RuntimeParityReplay` | `verifyParity()` | Compares live tick execution traces against replay outputs for 100% parity. | Core empirical tool ensuring that live code behavior matches research backtests. |

---

### Stage 8: Autonomous Research Lab (ARL) & EV Feedback
| File Path | Class / Module | Sacrosanct Methods & Parameters | Alpha / Verification Role | Why Preservation is Mandatory |
|---|---|---|---|---|
| `packages/lyzer-shared/src/engine/evProfiler.js` | `computeTradeEV` | `computeTradeEV(trade, config, history, globalEVMemory)` | Computes Expected Value (EV), win rate, and regime buckets for closed trades. | Feeds quantitative feedback into parameter optimization. |
| `packages/lyzer-shared/src/engine/evOptimizer.js` | `EVOptimizer` | `optimizeParameters()` | Adjusts risk thresholds based on empirical trade outcomes. | Enables continuous autonomous research and strategy adaptation without human bias. |

---

## 3. Removable / Legacy / Non-Alpha Components (Earmarked for Deletion)

The following files **DO NOT** participate in institutional alpha generation or verification and **MUST BE REMOVED** during simplification:

1. `lyzer edge/backend/EVAlphaResearchEngine.js` (Obsolete V1 engine)
2. `lyzer edge/backend/EVAlphaResearchEngineV2.js` (Obsolete V2 engine)
3. `lyzer edge/backend/EVAlphaResearchEngineV3.js` (Obsolete V3 engine)
4. `lyzer edge/backend/EVAlphaResearchEngineV3_2.js` (Obsolete V3.2 engine)
5. `lyzer edge/backend/speciesManager.js` (Unused genetic species manager)
6. `lyzer edge/backend/extinctionEngine.js` (Unused genetic extinction engine)
7. `lyzer edge/backend/alphaClusterEngine.js` (Speculative clustering)
8. `lyzer edge/backend/selectorPool.js` (Speculative selector pool)
9. `lyzer edge/backend/SelectorGenome.js` (Unused genome implementation)
10. `lyzer edge/backend/MetaFitnessEngine.js` (Unused fitness evaluator)
11. `lyzer edge/backend/RegimePermutationLab.js` (Speculative lab)
12. `lyzer edge/backend/CounterfactualWorldSimulator.js` (Stub simulator)
13. `lyzer edge/verify_*.js` (20+ old single-use ad-hoc scripts)

---

## 4. Anti-Regression Verification Protocol

Before merging any architectural simplification changes, run the following verification steps:

```bash
# 1. Run full unit and integration test suite
cd "lyzer edge"
npm test

# 2. Run runtime parity validation
node run_real_replay_validation.js

# 3. Verify zero degradation in SMC signal detection
node run_runtime_parity_experiment.js
```

# Detailed Analysis Report — Lyzer Edge Repository Cleanup (Milestone M1)

**Agent**: Explorer 2 (`teamwork_preview_explorer`)  
**Scope**: `lyzer edge/` Repository Cleanup — Dead Code, Orphan Mapping & Protected Core Audit  
**Working Directory**: `e:\projcts\lyzer\.agents\explorer_2\`  
**Date**: 2026-08-02  

---

## Executive Summary

This report provides a comprehensive, evidence-based dependency graph audit of `lyzer edge/` to map orphaned files, legacy experiment code, obsolete scientific validation modules, zombie tests, and uncalled functions. It explicitly identifies core protected subsystems—specifically the **V1–V4 engines**, **Constitutional Court integration**, and **RiskGateway gRPC communication**—marking them strictly as `MUST_RETAIN`.

---

## 1. Entry Point & Core Dependency Graph Tracing

### 1.1 Backend Server Entry Point (`backend/server.js`)
* **Imports**:
  * `dotenv/config`
  * `express`, `http`, `ws` (WebSocketServer)
  * `./streamEngine.js` (`StreamEngine`, `arl`)
  * `./statePersistence.js` (`loadEngineState`, `saveEngineState`, `clearEngineState`)
  * `./telegram.js` (`sendTelegramAlert`)
  * `./db.js` (`db`)
  * `./experimentManager.js` (`ExperimentManager`)
  * `../../packages/lyzer-constitution/src/eca/permission.js` (`getCourtSecret`)
  * `./utils/safeJson.js` (`sanitizeBodyMiddleware`, `safeMerge`)
  * `../src/observability/index.js` (`register`)
  * `./lyzerArcheologist.js` (`LyzerArcheologist`)
  * `./lyzerMindMRI.js` (`LyzerMindMRI`)
* **Assessment**: Active production server entry point. All direct dependencies are retained.

### 1.2 StreamEngine Core Ingestion & Execution (`backend/streamEngine.js`)
* **Imports**:
  * `../../packages/lyzer-shared/src/engine/evSignalRedesign.js` (`EvSignalEngine`)
  * `../../packages/lyzer-shared/src/engine/evProfiler.js` (`computeTradeEV`)
  * `./EVAlphaResearchEngineV3_3.js` (`EVAlphaResearchEngineV3_3`)
  * `./liveDataIngestor.js` (`LiveDataIngestor`)
  * `./exchangeExecution.js` (`ExchangeExecution`)
  * `./utils/safeJson.js` (`safeMerge`)
  * `./realityGapMonitor.js` (`RealityGapMonitor`)
  * `../../packages/lyzer-shared/src/engine/kernel.js` (`TruthKernel`)
  * `../../packages/lyzer-constitution/src/eca/court.js` (`ConstitutionalCourt`, `court`)
  * `../../packages/lyzer-shared/src/providers/v1_smc_ict.js` (`LiquidityReconstructionEngine`)
  * `../../packages/lyzer-shared/src/providers/v2_snd_snr.js` (`StructuralBoundaryEngine`)
  * `../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js` (`MomentumRsiEngine`)
  * `../../packages/lyzer-shared/src/providers/v4_imce.js` (`InstitutionalMarketCausalityEngine`)
  * `../../packages/lyzer-shared/src/smc/liquidityEngine.js`, `structureEngine.js`, `smcFacade.js`
  * `../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js`, `CrossScaleTensorGraph.js`, `InvariantExtractor.js`, `DivergenceDetector.js`
  * `./dualRealityMonitor.js` (`DualRealityMonitor`)
  * `./spectrogramUI.js` (`SpectrogramUI`)
  * `./telegram.js` (`sendTelegramAlert`, `formatTradeAlert`, `formatSystemAlert`)
  * `../src/observability/index.js` (metrics counters)
  * `../../packages/lyzer-shared/src/engine/MicrostructureDampener.js`
  * `../src/engine/sizing.js` (`DynamicSizing`)
  * `./riskGatewayClient.js` (`authorizeOrder`)
* **Assessment**: Core trading pipeline engine. Coordinates providers, TruthKernel, Constitutional Court, and RiskGateway gRPC.

### 1.3 Frontend SPA Entry Point (`index.html` → `src/main.js` → `src/app.js`)
* **Main Entry (`src/main.js`)**:
  * `./db/database.js` (`initDatabase`)
  * `./app.js` (`App`)
  * `./runtime/RuntimeSelector.js` (`RuntimeSelector`, `Runtimes`)
  * `./components/commandCenter/app/CommandCenterApp.js`
  * `./components/commandCenter/sdk/providers/ProviderRegistry.js`, `LiveProvider.js`
  * `./components/commandCenter/sdk/reality/RealityOrchestrator.js`
  * `./components/commandCenter/widgets/*` (`RealityStatusWidget`, `ChartHostWidget`, `RuntimeInspectorWidget`, `CourtWidget`, `TimelineWidget`, `CausalGraphWidget`)
  * `./components/commandCenter/sdk/WidgetRegistry.js`
* **App Shell (`src/app.js`)**:
  * `./services/wsClient.js`
  * `./services/LiveTradeSyncService.js`
  * `./components/GamifiedCommandCenterView.js`

---

## 2. Identified Orphaned Code & Zombie Mapping

### 2.1 Category 1: Orphaned Backend Modules & Unused Sub-Servers
1. **`backend/providers/v1_fast/`** (`exchangeExecution.js`, `ipc_client.js`, `server.js`, `streamEngine.js`)
   * **Evidence**: Legacy prototype sub-server directory. `server.js` and `streamEngine.js` here are duplicates of older code and are never imported or spawned by `backend/server.js` or `package.json`.
   * **Action Candidate**: Candidate for deletion / cleanup.
2. **`backend/providers/v2_deep/`** (`confidenceCalibration.js`, `exchangeExecution.js`, `ipc_client.js`, `lessonRegistry.js`, `outcomeResolutionEngine.js`, `server.js`, `streamEngine.js`, `tradeMemoryRegistry.js`)
   * **Evidence**: Legacy prototype sub-server directory. None of these modules are imported by root `backend/server.js` or `backend/streamEngine.js`.
   * **Action Candidate**: Candidate for deletion / cleanup.
3. **`backend/sports/`** (`sportsDataIngestor.js`, `sportsEngine.js`, `sportsExecution.js`)
   * **Evidence**: Non-crypto/non-finance domain experiment. `grep` confirms 0 imports across the entire repository.
   * **Action Candidate**: Candidate for deletion / cleanup.
4. **`backend/migrateLegacy.js`**
   * **Evidence**: Standalone CLI migration script for legacy `engine_state.json`. Unreferenced in `server.js` or `package.json`.
   * **Action Candidate**: Candidate for cleanup.

### 2.2 Category 2: Root Ad-Hoc Scripts & Unreferenced Test/Optimization Tools
1. **`optimize_backtest.js`** (Root file, 12.3 KB): Standalone backtest optimizer. Unreferenced by package.json.
2. **`run_binance_backtest.js`** (Root file, 11.7 KB): Standalone Binance backtest script. Unreferenced by package.json.
3. **`run_live_testnet.js`** (Root file, 898 B): Standalone live testnet runner. Unreferenced.
4. **`test_command_center_shell.js`** (Root file, 10.1 KB): Ad-hoc test script. Unreferenced by Vitest or npm scripts.
5. **`test_command_center_v2.js`** (Root file, 8.6 KB): Ad-hoc test script. Unreferenced.
6. **`test_design_system_kernel.js`** (Root file, 10.7 KB): Ad-hoc test script. Unreferenced.
7. **`test_robustness.js`** (Root file, 2.5 KB): Ad-hoc test script. Unreferenced.

### 2.3 Category 3: Legacy Unused Frontend View Components (`src/components/`)
The following components in `src/components/` were left behind after the UI refactoring into `GamifiedCommandCenterView.js` and Command Center V2 widgets:
* `AlertsView.js`
* `Dashboard.js`
* `DecisionAnalytics.js`
* `LiveTradingView.js`
* `ObservabilityView.js`
* `PatternRecognitionView.js`
* `PolicyEditor.js`
* `Recommendations.js`
* `ReportsView.js`
* `RiskAnalysisView.js`
* `ZSpaceDashboard.js`
* `CommandCenterView.js` (Superseded by `GamifiedCommandCenterView.js`)

**Evidence**: `grep` searches confirm 0 imports in `src/main.js`, `src/app.js`, `GamifiedCommandCenterView.js`, or `CommandCenterRouter.js`.

### 2.4 Category 4: Empty Directories & Stale Leftover Files in `src/`
* **Empty Directories**:
  * `src/dsl/`
  * `src/eca/quarantine/`
  * `src/lib/`
  * `src/mic/adapters/`, `src/mic/latency/`
  * `src/sil/`
  * `src/vm/`
  * `src/workers/`
* **Stale Leftover Files**:
  * `src/cer/` (`EDLWriter.ts`, `FMCObservabilityLayer.ts`, `RollupEngine.ts`, `SQLiteSchema.ts`, `SchemaCompatibilityGate.ts`, `types.ts`): Implementation was relocated to `@lyzer/constitution/cer/`.
  * `src/laboratory/regimeAdaptation.js`: Zero external references.
  * `src/microstructure/contracts.ts`: Relocated to `@lyzer/shared/microstructure/contracts.js`.
  * `src/types/governanceContracts.ts`: Zero external references.
  * `src/config/score_profiles.json`: Zero external references.

### 2.5 Category 5: Theoretical / Island Sub-Packages ("Zombie Modules")
The following 15 sub-packages in `src/` are isolated "cognitive science" modules that have zero imports from `main.js`, `app.js`, `server.js`, or `streamEngine.js`, and are only imported by their matching test files in `tests/`:
1. `src/adaptive-evaluation/`
2. `src/adaptive-evolution/`
3. `src/adaptive-sandbox/`
4. `src/autonomous-research/`
5. `src/causal-learning/`
6. `src/causal-memory/`
7. `src/causal-reflection/`
8. `src/cognitive-intelligence/`
9. `src/cognitive-operations/`
10. `src/cognitive-portfolio/`
11. `src/distributed-runtime/`
12. `src/empirical-validation/`
13. `src/evolution-governance/`
14. `src/institutional-production/`
15. `src/market-organism/`

### 2.6 Category 6: Zombie Verification Scripts & Non-Executable Tests
* `tests/verification/verify_*.js` (14 files): `verify_alpha.js`, `verify_compliance.js`, `verify_decomposition.js`, `verify_eca.js`, `verify_experiment_system.js`, `verify_fund_core.js`, `verify_mic.js`, `verify_mne.js`, `verify_robustness.js`, `verify_signals.js`, `verify_sil.js`, `verify_stream.js`, `verify_v02.js`, `verify_v03.js`, `full_system_execution_auditor.js`, `runtime_profiler_harness.js`.
* **Evidence**: `verify_suite.test.js` only checks text file existence (`expect(content.length).toBeGreaterThan(0)`). Vitest runner does not execute their internal logic.

---

## 3. Protection Verification (MUST_RETAIN Subsystems)

The following components inside `lyzer edge/` are verified as critical to production integrity and are strictly marked `MUST_RETAIN`:

| Subsystem | Location / Files | Verification Evidence | Status |
|---|---|---|---|
| **V1 Signal Engine** | `packages/lyzer-shared/src/providers/v1_smc_ict.js` | Imported by `streamEngine.js:17` (`LiquidityReconstructionEngine`) | **MUST_RETAIN** |
| **V2 Signal Engine** | `packages/lyzer-shared/src/providers/v2_snd_snr.js` | Imported by `streamEngine.js:18` (`StructuralBoundaryEngine`) | **MUST_RETAIN** |
| **V3 Signal Engine** | `packages/lyzer-shared/src/providers/v3_momentum_rsi.js` | Imported by `streamEngine.js:19` (`MomentumRsiEngine`) | **MUST_RETAIN** |
| **V4 Signal Engine** | `packages/lyzer-shared/src/providers/v4_imce.js` | Imported by `streamEngine.js:20` (`InstitutionalMarketCausalityEngine`) | **MUST_RETAIN** |
| **Constitutional Court** | `packages/lyzer-constitution/src/eca/court.js`, `permission.js` | Imported by `streamEngine.js:16` (`court`), `server.js:12` (`getCourtSecret`) | **MUST_RETAIN** |
| **TruthKernel & C-CLIST & MOL** | `packages/lyzer-shared/src/engine/kernel.js` | Imported by `streamEngine.js:15` (`TruthKernel`), evaluated in tick pipeline | **MUST_RETAIN** |
| **RiskGateway gRPC Client** | `backend/riskGatewayClient.js` | Imported by `streamEngine.js:36` (`authorizeOrder`), uses `@grpc/grpc-js` | **MUST_RETAIN** |
| **RiskGateway Protobuf** | `src-proto/lyzer.proto` | gRPC service definition for `RiskGateway` and `IntentRegistry` | **MUST_RETAIN** |
| **RiskGateway & Core Rust** | `src-rust/lyzer-risk-gateway`, `lyzer-intent-registry`, `lyzer-oms` | Rust binaries providing gRPC risk authorization & causal tracking | **MUST_RETAIN** |
| **Production Backend Server** | `backend/server.js`, `streamEngine.js`, `db.js`, `liveDataIngestor.js`, `exchangeExecution.js`, `experimentManager.js` | Essential runtime services spawned by `npm run backend` | **MUST_RETAIN** |
| **Production Frontend SPA** | `src/main.js`, `src/app.js`, `src/components/GamifiedCommandCenterView.js`, `src/components/commandCenter/app/CommandCenterApp.js`, `src/components/commandCenter/widgets/*` | Production UI application mounted by Vite | **MUST_RETAIN** |

---

## Conclusion & Summary Table

All findings have been fully cataloged with exact file locations and evidence chains. The core signal engines (V1–V4), ECA Constitutional Court, and RiskGateway gRPC communication are 100% verified and protected.

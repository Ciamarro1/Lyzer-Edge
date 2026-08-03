# Handoff Report — Milestone M1: Dead Code & Orphan Mapping (Explorer 2)

**Agent**: Explorer 2 (`teamwork_preview_explorer`)  
**Working Directory**: `e:\projcts\lyzer\.agents\explorer_2\`  
**Handoff Type**: Hard Handoff (Task Complete)  
**Date**: 2026-08-02  

---

## 1. Observation

Direct observations from dependency graph tracing and filesystem inspection of `lyzer edge/`:

1. **Backend Server Entry Point (`lyzer edge/backend/server.js`)**:
   * Line 5: `import { StreamEngine, arl } from './streamEngine.js';`
   * Line 6: `import { loadEngineState, saveEngineState, clearEngineState } from './statePersistence.js';`
   * Line 9: `import { sendTelegramAlert } from './telegram.js';`
   * Line 10: `import db from './db.js';`
   * Line 11: `import { ExperimentManager } from './experimentManager.js';`
   * Line 12: `import { getCourtSecret } from '../../packages/lyzer-constitution/src/eca/permission.js';`
   * Line 13: `import { sanitizeBodyMiddleware, safeMerge } from './utils/safeJson.js';`
   * Line 189: `import { LyzerArcheologist } from './lyzerArcheologist.js';`
   * Line 213: `import { LyzerMindMRI } from './lyzerMindMRI.js';`

2. **StreamEngine Entry Point (`lyzer edge/backend/streamEngine.js`)**:
   * Line 15: `import { TruthKernel } from "../../packages/lyzer-shared/src/engine/kernel.js";`
   * Line 16: `import { ConstitutionalCourt, court } from "../../packages/lyzer-constitution/src/eca/court.js";`
   * Line 17: `import { LiquidityReconstructionEngine } from "../../packages/lyzer-shared/src/providers/v1_smc_ict.js";`
   * Line 18: `import { StructuralBoundaryEngine } from "../../packages/lyzer-shared/src/providers/v2_snd_snr.js";`
   * Line 19: `import { MomentumRsiEngine } from "../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js";`
   * Line 20: `import { InstitutionalMarketCausalityEngine } from "../../packages/lyzer-shared/src/providers/v4_imce.js";`
   * Line 36: `import { authorizeOrder } from './riskGatewayClient.js';`

3. **Frontend SPA Entry Point (`lyzer edge/src/main.js` & `app.js`)**:
   * `main.js`: mounts `GamifiedCommandCenterView` or `CommandCenterApp` with widgets (`RealityStatusWidget`, `ChartHostWidget`, `RuntimeInspectorWidget`, `CourtWidget`, `TimelineWidget`, `CausalGraphWidget`).
   * `app.js` line 8: `import { GamifiedCommandCenterView } from './components/GamifiedCommandCenterView.js';`

4. **Orphaned Sub-Servers & Sports Domain**:
   * `backend/providers/v1_fast/` (`exchangeExecution.js`, `ipc_client.js`, `server.js`, `streamEngine.js`): legacy sub-server files; 0 imports by `backend/server.js`.
   * `backend/providers/v2_deep/` (`confidenceCalibration.js`, `exchangeExecution.js`, `ipc_client.js`, `lessonRegistry.js`, `outcomeResolutionEngine.js`, `server.js`, `streamEngine.js`, `tradeMemoryRegistry.js`): legacy sub-server files; 0 imports by `backend/server.js`.
   * `backend/sports/` (`sportsDataIngestor.js`, `sportsEngine.js`, `sportsExecution.js`): non-crypto domain experiment; 0 external imports across entire repo.
   * `backend/migrateLegacy.js`: CLI script; 0 imports in server or package.json.

5. **Root Ad-Hoc Scripts**:
   * 7 root `.js` files: `optimize_backtest.js`, `run_binance_backtest.js`, `run_live_testnet.js`, `test_command_center_shell.js`, `test_command_center_v2.js`, `test_design_system_kernel.js`, `test_robustness.js`. All 0 references in `package.json` or source files.

6. **Unused Frontend Views (`src/components/`)**:
   * 12 view files: `AlertsView.js`, `Dashboard.js`, `DecisionAnalytics.js`, `LiveTradingView.js`, `ObservabilityView.js`, `PatternRecognitionView.js`, `PolicyEditor.js`, `Recommendations.js`, `ReportsView.js`, `RiskAnalysisView.js`, `ZSpaceDashboard.js`, `CommandCenterView.js`. All 0 references in `main.js`, `app.js`, `GamifiedCommandCenterView.js`, or `CommandCenterRouter.js`.

7. **Empty Directories & Stale Leftover Files in `src/`**:
   * Empty directories: `src/dsl/`, `src/eca/quarantine/`, `src/lib/`, `src/mic/adapters/`, `src/mic/latency/`, `src/sil/`, `src/vm/`, `src/workers/`.
   * Stale files: `src/cer/*` (moved to `@lyzer/constitution/cer/`), `src/microstructure/contracts.ts` (moved to `@lyzer/shared/microstructure/`), `src/laboratory/regimeAdaptation.js` (0 references), `src/types/governanceContracts.ts` (0 references), `src/config/score_profiles.json` (0 references).

8. **Theoretical Island Modules ("Zombie Sub-Packages") in `src/`**:
   * 15 sub-packages (`adaptive-evaluation`, `adaptive-evolution`, `adaptive-sandbox`, `autonomous-research`, `causal-learning`, `causal-memory`, `causal-reflection`, `cognitive-intelligence`, `cognitive-operations`, `cognitive-portfolio`, `distributed-runtime`, `empirical-validation`, `evolution-governance`, `institutional-production`, `market-organism`) are only imported by their corresponding test suites in `tests/`, with 0 production pipeline wiring.

9. **Zombie Verification Scripts**:
   * 14 scripts in `tests/verification/`: `verify_suite.test.js` only asserts file length (`expect(content.length).toBeGreaterThan(0)`), without executing or testing their logic.

---

## 2. Logic Chain

1. **Premise 1**: Any file in `lyzer edge/` that is neither imported by a production entry point (`backend/server.js`, `backend/streamEngine.js`, `src/main.js`, `src/app.js`), nor executed by active build/test/deployment scripts (`package.json`, `run-certification.ps1`), nor required as part of the domain contracts is classified as an orphan/zombie.
2. **Premise 2**: Direct `grep` and AST import tracing starting from `backend/server.js` and `src/main.js` reveals that `backend/providers/v1_fast/`, `backend/providers/v2_deep/`, `backend/sports/`, root ad-hoc scripts, legacy `src/components/*View.js`, empty `src/` dirs, and stale leftover files have 0 incoming production dependencies.
3. **Premise 3**: V1–V4 signal engines (`v1_smc_ict.js`, `v2_snd_snr.js`, `v3_momentum_rsi.js`, `v4_imce.js`), Constitutional Court (`court.js`, `permission.js`), TruthKernel (`kernel.js`), and RiskGateway gRPC (`riskGatewayClient.js`, `lyzer.proto`, Rust microservices) are directly imported and actively evaluated in `backend/streamEngine.js` and `backend/server.js`.
4. **Conclusion**: The codebase contains distinct categories of orphaned code and zombie tests. All core trading pipeline components (V1-V4, Constitutional Court, RiskGateway gRPC) are verified and marked `MUST_RETAIN`.

---

## 3. Caveats

* **Independent Test Execution**: The 15 theoretical sub-packages in `src/` pass their Vitest suites when run via `npm test`. If the organization intends to retain theoretical reference code for future research, these modules should be cataloged accordingly rather than blindly deleted.
* **Ad-hoc CLI usage**: Root scripts like `run_binance_backtest.js` may be manually executed by developers via `node run_binance_backtest.js`. However, they are unmanaged by the project build pipeline.

---

## 4. Conclusion

* **Protected Core (MUST_RETAIN)**: V1–V4 engines, Constitutional Court integration, RiskGateway gRPC, `backend/server.js`, `backend/streamEngine.js`, and `src/main.js` SPA shell are 100% verified and protected.
* **Orphan & Dead Code Identification**: Detailed in `analysis.md`, covering 6 distinct categories of dead code, orphaned sub-servers, legacy UI components, empty directories, and zombie verification scripts.

---

## 5. Verification Method

1. **Inspect Analysis Report**: View `e:\projcts\lyzer\.agents\explorer_2\analysis.md`.
2. **Verify Import References**:
   * Run `grep -rn "LiquidityReconstructionEngine" "lyzer edge/backend/streamEngine.js"` to confirm V1 protection.
   * Run `grep -rn "ConstitutionalCourt" "lyzer edge/backend/streamEngine.js"` to confirm Court protection.
   * Run `grep -rn "authorizeOrder" "lyzer edge/backend/streamEngine.js"` to confirm RiskGateway gRPC protection.
3. **Verify Orphan Status**:
   * Run `grep -rn "backend/sports" "lyzer edge/"` (returns 0 references).
   * Run `grep -rn "AlertsView" "lyzer edge/src/"` (returns 0 references).

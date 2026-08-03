# Safe Dead Code Elimination Plan — Lyzer Edge Repository Cleanup

## Executive Summary
This document specifies the exact deletion targets and safety guarantees for repository cleanup and dead code elimination in `E:\projcts\lyzer`. The plan targets ~333 orphaned files and legacy experimentation modules (~31,648 LOC) identified by Explorers 1, 2, and 3, while preserving 100% of the active operational trading pipeline, V1-V4 engines, Constitutional Court, RiskGateway gRPC, verification test suites, and root deployment infrastructure.

---

## 1. Safety Guarantees & Protected Core (MUST PROTECT)

The following components are **STRICTLY PROTECTED** and MUST NOT be modified or deleted:

| Component | Target Files | Protection Rationale |
|---|---|---|
| **Core Entrypoints** | `lyzer edge/backend/server.js`, `lyzer edge/backend/streamEngine.js`, `lyzer edge/src/main.js`, `lyzer edge/src/app.js` | Active backend server, StreamEngine data pipeline, and SPA router entrypoints. |
| **V1-V4 Signal Engines** | `packages/lyzer-shared/src/providers/v1_smc_ict.js`, `v2_snd_snr.js`, `v3_momentum_rsi.js`, `v4_imce.js` | Operational trading signal generators required by StreamEngine. |
| **Constitutional Court** | `packages/lyzer-constitution/src/eca/court.js`, `packages/lyzer-constitution/src/eca/permission.js`, `packages/lyzer-constitution/` | Epistemic Court of Appeals (ECA), C-CLIST oracle, MOL state machine. |
| **TruthKernel Engine** | `packages/lyzer-shared/src/engine/kernel.js` | Operational DVF / LHDS risk and truth valuation engine. |
| **RiskGateway gRPC** | `lyzer edge/backend/riskGatewayClient.js`, `lyzer edge/src-proto/lyzer.proto`, Rust `lyzer-core-hub` / Risk Gateway | Order authorization client and gRPC protocol buffers. |
| **Database & Persistence** | `lyzer edge/backend/db.js`, `lyzer edge/backend/database.js`, `lyzer edge/backend/migrations.js` | Active SQLite database driver, schema definition, and migration manager. |
| **Verification Test Suite** | `lyzer edge/tests/verification/verify_*.js` (`verify_eca.js`, `verify_compliance.js`, etc.) | Focused verification test scripts assertion targets. |
| **Deploy & CI/CD Infrastructure** | `deploy-experiments.ps1`, `git-push-setup.ps1`, `setup-cg.ps1`, `lyzer edge/backup_restore.py`, `Dockerfile`, `.cargo/config.toml`, `.github/workflows/keep_alive.yml` | Multi-instance HF Space deployment scripts, HF Hub backup/restore engine (executed in `Dockerfile:75`), Windows MinGW Cargo build target config, keep-alive workflow. |
| **System Rules & Guides** | `AGENTS.md`, `GEMINI.md`, `CONSTITUTION.md` | Core ecosystem guidelines and agent instructions. |

---

## 2. Deletion Targets (Categorized)

### Category 1: Orphaned Sub-Servers & Legacy Domain Experiments
- `lyzer edge/backend/providers/v1_fast/` (entire folder: `exchangeExecution.js`, `ipc_client.js`, `server.js`, `streamEngine.js`) — Legacy sub-server prototype; 0 imports by `backend/server.js`.
- `lyzer edge/backend/providers/v2_deep/` (entire folder: `confidenceCalibration.js`, `exchangeExecution.js`, `ipc_client.js`, `lessonRegistry.js`, `outcomeResolutionEngine.js`, `server.js`, `streamEngine.js`, `tradeMemoryRegistry.js`) — Legacy sub-server prototype; 0 imports.
- `lyzer edge/backend/sports/` (entire folder: `sportsDataIngestor.js`, `sportsEngine.js`, `sportsExecution.js`) — Abandoned sports domain experiment; 0 imports.
- `lyzer edge/backend/migrateLegacy.js` — Abandoned CLI migration script; 0 imports.

### Category 2: Orphaned Directory Trees (`src-ts/` & `src/laboratory/`)
- `src-ts/` (entire directory tree: `governance/change_control.ts`, `scripts/setup-nats.ts`, `proto/*.proto`, etc.) — Abandoned TypeScript/proto prototypes; 0 imports across codebase.
- `src/laboratory/` (entire directory tree: `attackEcaConservatism.js`, CEL parallel simulators, MGO detectors) — Unreferenced research lab experiments; 0 imports.

### Category 3: Legacy Unreferenced Frontend Views (`lyzer edge/src/components/`)
- `lyzer edge/src/components/AlertsView.js`
- `lyzer edge/src/components/Dashboard.js`
- `lyzer edge/src/components/DecisionAnalytics.js`
- `lyzer edge/src/components/LiveTradingView.js` (legacy monolithic component replaced by active `GamifiedCommandCenterView.js` / SPA router)
- `lyzer edge/src/components/ObservabilityView.js`
- `lyzer edge/src/components/PatternRecognitionView.js`
- `lyzer edge/src/components/PolicyEditor.js`
- `lyzer edge/src/components/Recommendations.js`
- `lyzer edge/src/components/ReportsView.js`
- `lyzer edge/src/components/RiskAnalysisView.js`
- `lyzer edge/src/components/ZSpaceDashboard.js`
- `lyzer edge/src/components/CommandCenterView.js`

### Category 4: Empty Directories & Stale Leftovers in `lyzer edge/src/`
- `lyzer edge/src/cer/` (stale leftovers moved to `@lyzer/constitution/cer/`)
- `lyzer edge/src/microstructure/contracts.ts` (stale leftover moved to `@lyzer/shared/microstructure/`)
- `lyzer edge/src/types/governanceContracts.ts` (0 references)
- `lyzer edge/src/config/score_profiles.json` (0 references)
- Empty directories: `lyzer edge/src/dsl/`, `lyzer edge/src/eca/quarantine/`, `lyzer edge/src/lib/`, `lyzer edge/src/mic/adapters/`, `lyzer edge/src/mic/latency/`, `lyzer edge/src/sil/`, `lyzer edge/src/vm/`, `lyzer edge/src/workers/`

### Category 5: Obsolete Root & Backtest Scripts
- `generate_passports.js`
- `reproduce.js`
- `run_autonomous_research_lab.js`
- `run_decision_quality_audit.js`
- `run_final_independent_review.js`
- `run_final_truth_audit.js`
- `run_institutional_committee_synthesis.js`
- `run_real_replay_validation.js`
- `run_runtime_fidelity_audit.js`
- `run_runtime_parity_experiment.js`
- `run_simplification_audit.js`
- `run_simplification_execution.js`
- `lyzer edge/optimize_backtest.js`
- `lyzer edge/run_binance_backtest.js`
- `lyzer edge/run_live_testnet.js`
- `lyzer edge/test_command_center_shell.js`
- `lyzer edge/test_command_center_v2.js`
- `lyzer edge/test_design_system_kernel.js`
- `lyzer edge/test_robustness.js`

### Category 6: Shared Package Duplicates & Abandoned Code (`packages/lyzer-shared/`)
- `packages/lyzer-shared/src/app.js` (282 LOC copy-paste leftover; 0 imports)
- `packages/lyzer-shared/src/components/StrategyLab.js` (258 LOC dead UI component; 0 imports)
- `packages/lyzer-shared/src/vm/strategyVM.js` (257 LOC abandoned VM; 0 imports)

### Category 7: Unused Rust Submodules (`src-rust/`)
- `src-rust/lyzer-binance-adapter/src/dsl.rs` (120 LOC unreferenced DSL)
- `src-rust/lyzer-ocr/src/bin/mcff_run.rs` (85 LOC standalone runner)
- `src-rust/lyzer-ocr/src/bin/shadow_run.rs` (90 LOC standalone runner)
- `src-rust/lyzer-shadow-oms/src/edi.rs` (110 LOC unreferenced interface)

---

## 3. Execution & Verification Steps

1. **Deletion Execution**:
   - Worker agent deletes the target files and empty directories using filesystem removal commands.
2. **Build Verification**:
   - Worker runs `npm run build` in `lyzer edge/` to verify Vite bundle compilation succeeds with 0 errors.
3. **Verification Test Suite Execution**:
   - Worker runs `npm run test:verify` in `lyzer edge/` to verify 100% pass rate without Module Not Found errors.
4. **Deploy Script & Core Pipeline Verification**:
   - Reviewer & Challenger verify that `deploy-experiments.ps1`, `backup_restore.py`, V1-V4 engines, Constitutional Court, and RiskGateway gRPC remain 100% intact and functional.

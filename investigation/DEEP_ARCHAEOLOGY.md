# Lyzer Edge — Deep Archaeology Report

**Date:** 2026-07-27  
**Scope:** Full codebase archaeology — dead code, zombie paths, duplicates, orphaned exports, phantom dependencies  
**Method:** Static analysis via PowerShell + Select-String, file tree audit

---

## 1. ARCHIVED FILES (Dead by Declaration)

**Location:** `_archive/` — 58 files, 4 directories

| Directory | File Count | Status |
|-----------|-----------|--------|
| `_archive/backend/` | 14 JS files | Fully dead |
| `_archive/engine/` | 28 JS files | Fully dead |
| `_archive/smc/` | 2 JS files | Fully dead |
| `_archive/tests/smc/` | 1 test file | Fully dead |

**Notable archived engines never used anywhere:**
- `EVAlphaResearchEngine.js`, `EVAlphaResearchEngineV2.js`, `EVAlphaResearchEngineV3_2.js` (3 generations of dead EV engines)
- `zPolicyEngine.js`, `zSpaceEVOptimizer.js` (z-variant experiments)
- `signalEngine.js`, `regimeConditioner.js`, `regime_conditioner.js` (duplicate: both camelCase and snake_case versions)

These 58 files are **explicitly dead** — moved to archive but never deleted.

---

## 2. ORPHANED `src/` LABORATORY FILES (23 files, zero imports)

The entire `src/` directory is **completely disconnected** from the active codebase. No file in `lyzer edge/`, `packages/`, `src-ts/`, or `backend/` imports anything from `src/`.

### `src/laboratory/adversarial/` — 7 Red-Team Attack Scripts
| File | Lines |
|------|-------|
| `attackEcaConservatism.js` | ~120 |
| `attackGovCapture.js` | ~90 |
| `attackIwlNoise.js` | ~85 |
| `attackLongDecay.js` | ~95 |
| `attackObjectiveDrift.js` | ~100 |
| `attackRewardHacking.js` | ~110 |
| `attackSilAlpha.js` | ~80 |

### `src/laboratory/cel/` — 7 Causal Evidence Layer Files
| File | Lines |
|------|-------|
| `celCandidateRegistry.js` | ~150 |
| `celCausalDeltaAnalyzer.js` | ~130 |
| `celCrossRegimeValidator.js` | ~100 |
| `celOntologyChecker.js` | ~120 |
| `celParallelSimulator.js` | ~140 |
| `celRegretEngine.js` | ~110 |
| `run_simulator.js` | ~60 |

### `src/laboratory/mgo/` — 7 MGO Detector Files
| File | Lines |
|------|-------|
| `mgoCaptureDetector.js` | ~90 |
| `mgoConservatismIndex.js` | ~80 |
| `mgoGrdDetector.js` | ~85 |
| `mgoObjectiveDriftDetector.js` | ~95 |
| `mgoRewardHackingDetector.js` | ~100 |
| `mgoZombieDetector.js` | ~75 |
| `testRewardHacking.js` | ~50 |

### `src/laboratory/mil2/` — 1 File
| File | Lines |
|------|-------|
| `missionEvolutionEvaluator.js` | ~200 |

### `src/` Root
| File | Lines |
|------|-------|
| `lyzer_shm_intent.js` | ~60 |
| `laboratory/monteCarlo.js` | ~80 |

**Total orphaned: ~2,500+ lines of dead lab code.**

---

## 3. DUPLICATED FILES (Project Code Only)

### 3a. Same-name files, different contents

| Filename | Path 1 | Path 2 | Notes |
|----------|--------|--------|-------|
| `replayEngine.js` | `packages/lyzer-shared/src/research/` | `packages/lyzer-shared/src/smc/` | Different implementations |
| `worker.js` | `packages/lyzer-shared/src/workers/` | `lyzer edge/src/workers/` | Near-identical (both have TODO stubs) |

### 3b. TypeScript files duplicated across packages/ and lyzer edge/src/

| Filename | Duplicate 1 | Duplicate 2 | Likely origin |
|----------|------------|------------|---------------|
| `contracts.ts` | `packages/lyzer-shared/src/microstructure/` | `lyzer edge/src/microstructure/` | Forked from shared |
| `governanceContracts.ts` | `packages/lyzer-shared/src/types/` | `lyzer edge/src/types/` | Forked from shared |
| `types.ts` | `packages/lyzer-constitution/src/cer/` | `lyzer edge/src/cer/` | Forked from constitution |
| `SQLiteSchema.ts` | `packages/lyzer-constitution/src/cer/` | `lyzer edge/src/cer/` | Forked from constitution |
| `SchemaCompatibilityGate.ts` | `packages/lyzer-constitution/src/cer/` | `lyzer edge/src/cer/` | Forked from constitution |

**5 files, ~1,000+ lines duplicated across workspace boundaries.** The copies in `lyzer edge/src/` are likely stale forks that diverged from the canonical versions in `packages/`.

### 3c. Rust workspace fragmentation

There are **3 separate Rust workspaces** that are disconnected:

| Workspace Root | Crates | Status |
|---------------|--------|--------|
| `src-rust/Cargo.toml` | 8 crates (lyzer-eca, lyzer-shared, lyzer-oal, lyzer-ocr, lyzer-shm-spine, lyzer-binance-adapter, lyzer-reality-ws, lyzer-shadow-oms) | Main research workspace |
| `lyzer-workspace/Cargo.toml` | 5 crates (lyzer-core-models, lyzer-core-arbitration, lyzer-core-governance, lyzer-core-memory, lyzer-core-hub) | Constitutional hub workspace |
| `lyzer edge/src-rust/Cargo.toml` | 3 crates (lyzer-intent-registry, lyzer-oms, lyzer-risk-gateway) | Edge services workspace |

Additionally, an **exact copy** of the edge services workspace exists at `node_modules/lyzer-edge-analyst/src-rust/` (npm workspace hoisting artifact).

The proto file `lyzer edge/src-proto/lyzer.proto` is also duplicated at `node_modules/lyzer-edge-analyst/src-proto/lyzer.proto`.

---

## 4. ORPHANED BACKEND EXPORTS (Defined but Never Imported)

### Imported by server.js
These are actively used:
- `StreamEngine`, `arl`
- `loadEngineState`, `saveEngineState`, `clearEngineState`
- `sendTelegramAlert`
- `db` (default export)
- `ExperimentManager`
- `LyzerArcheologist`
- `LyzerMindMRI`

### NOT imported by server.js (but imported by other backend files)
These are used internally by other backend modules:
- `AlphaDiscoveryEngine` — used in `experimentManager.js`
- `CounterfactualWorldSimulator`, `DualRealityMonitor` — internal tools
- `EVAlphaResearchEngineV3`, `EVAlphaResearchEngineV3_3` — research engines
- `EventsLogger`, `ExchangeExecution`, `LiveDataIngestor` — service modules
- `MetaFitnessEngine`, `RealityGapMonitor`, `RegimePermutationLab` — monitoring
- `SelectorGenome`, `SelectorPredator`, `SelectorPool`, `SpeciesManager` — evolution
- `SpectrogramUI` — UI generation
- `ExtinctionEngine`, `EcosystemState`, `MetricsTracker` — in streamEngine scope

### FULLY ORPHANED (not imported anywhere)
- **`migrateLegacy.js`** — complete standalone file, zero imports across the codebase

### Not imported in frontend
- `Router` class from `lyzer edge/src/router.js` — exported but never imported by `main.js` (router is included some other way)

---

## 5. DEAD RESEARCH FILES (`packages/lyzer-shared/src/research/`)

**91 files** exist in this directory. ~75 of them are NOT imported by any active code.

### Never imported research scripts/engines (sample):
- `alphaContribution.js`, `alphaDecayCurve.js`, `alphaDecayMonitor.js`
- `alphaEvolutionEngine.js`, `alphaGovernanceEngine.js`
- `autoExperiments.js`, `datasetIntegrityValidator.js`
- `featureDiscovery.js`, `fetch_historical_ohlcv.js`
- `historicalWarPipeline.js`, `lyzerStressInjectionEngine.js`
- `lyzerSurvivalScore.js`, `monteCarloAdversarial.js`
- `parameterSensitivity.js`, `productionGate.js`
- `redTeamDestructionTest.js`, `regimeClassifier.js`
- `regimeDiscovery.js`, `statisticalValidator.js`
- `adversarialExecutionTest.js`, `capitalGovernor.js`
- `executionReplayEngine.js`, `liquiditySurvivalEngine.js`
- `portfolioManager.js`, `alphaLifecycleManager.js`
- `capitalAllocationGovernor.js`, `decisionLedger.js`
- `investmentCommitteeEngine.js`, `researchGovernanceEngine.js`
- `shadowExecutionEngine.js`, `shadowWarEnduranceSuite.js`
- `assetObservationEngine.js`, `correlationRiskEngine.js`
- `crossAssetRegimeEngine.js`, `institutionalPortfolioManager.js`
- `macroStressEngine.js`, `multiAssetChaosEngine.js`
- `blackSwanCertification2.js`, `complianceEngine.js`
- `continuousAlphaAuditor.js`, `dataLineageEngine.js`
- `fundAccountingEngine.js`, `fundSimulator.js`
- `humanOversightSimulator.js`, `incidentResponseEngine.js`
- `independentValidationEngine.js`, `institutionalChaosEngine.js`
- `institutionalKPIEngine.js`, `institutionalMemoryEngine.js`
- `institutionalRealityEngine.js`, `institutionalRealityScore.js`
- `institutionalReportingEngine.js`, `investmentCommitteeAI.js`
- `monteCarloExecutionWar.js`, `operationalChaosEngine.js`
- `shadowFundEngine.js`, `shadowTradingTelemetry.js`
- `digitalTwinEngine.js`, `alphaHealthMonitor.js`
- `dataIntegrityMonitor.js`, `executionHealthMonitor.js`
- `observabilityLayer.js`, `riskHealthMonitor.js`
- `systemHealthMonitor.js`

### Test files not imported:
- `test_fase1_observation_layer.js`
- `test_reality_gap_monitor.js`
- `test_shadow_execution_engine.js`
- `test_shadow_war_endurance.js`
- `metrics_integrity_test.js`
- `governance_attack.js`
- `generate_tearsheet.js`

### Runnable scripts (not imported, but independently runnable):
- `run_adaptive_calibration.js`, `run_benchmark_generator.js`
- `run_l6_war.js`, `run_v4_solo_experiment.js`
- `run_walkforward_validation.js`, `runL11Simulation.js`
- `run_governor_red_team.js`, `run_l13_autonomous_suite.js`
- `run_l14_validation_suite.js`, `run_l8_red_team.js`

**Total: ~75 dead files, estimated 15,000+ lines of unexecuted research code.**

---

## 6. ROOT-LEVEL STANDALONE SCRIPTS (10 files)

| Script | Status |
|--------|--------|
| `run_autonomous_research_lab.js` | Standalone runner |
| `run_decision_quality_audit.js` | Standalone audit |
| `run_final_independent_review.js` | Standalone review |
| `run_final_truth_audit.js` | Standalone audit |
| `run_institutional_committee_synthesis.js` | Standalone synthesis |
| `run_real_replay_validation.js` | Standalone validation |
| `run_runtime_fidelity_audit.js` | Standalone audit |
| `run_runtime_parity_experiment.js` | Standalone experiment |
| `run_simplification_audit.js` | Standalone audit |
| `run_simplification_execution.js` | Standalone execution |

Also: `reproduce.js` — standalone reproduction script.

These are independent entry points, not dead per se, but they represent disconnected tooling.

---

## 7. PHANTOM DEPENDENCIES

### Declared in `package.json` but never imported

| Package | Declared In | Imported? |
|---------|------------|-----------|
| `@huggingface/hub` | Root `package.json` | YES — used by backup_restore.py / scripts |
| `isomorphic-git` | Root `package.json` | YES — used by HF integration |
| **`ts-node`** | `lyzer edge/package.json` | **NEVER imported** — `tsx` is used instead |

### Workspace package names declared but unused in imports

| Package Name | Declared In | Used in Import Statements? |
|-------------|------------|---------------------------|
| `@lyzer/shared` | `packages/lyzer-shared/package.json` | **NO** — code uses `../../packages/lyzer-shared/src/...` relative paths |
| `@lyzer/constitution` | `packages/lyzer-constitution/package.json` | **NO** — code uses `../../packages/lyzer-constitution/src/...` relative paths |

The npm workspace package names are **zombie declarations**. All code imports them via relative paths. The `"main": "src/index.js"` entries are never resolved by any consumer.

---

## 8. TODO / FIXME / HACK ANNOTATIONS

### Stub implementations (TODO — never built)

| File | Line | Annotation |
|------|------|------------|
| `lyzer edge/src/workers/worker.js` | 18 | `// TODO: Implement actual Monte Carlo logic` |
| `lyzer edge/src/workers/worker.js` | 23 | `// TODO: Implement actual Risk Analysis logic` |
| `lyzer edge/src/workers/worker.js` | 35 | `// TODO: Implement actual Edge Recalc logic` |
| `lyzer edge/src/workers/worker.js` | 40 | `// TODO: Implement actual Outlier Scan logic` |
| `packages/lyzer-shared/src/workers/worker.js` | 18 | Same 4 TODOs (duplicate file!) |
| `packages/lyzer-shared/src/workers/worker.js` | 23 | Same |
| `packages/lyzer-shared/src/workers/worker.js` | 35 | Same |
| `packages/lyzer-shared/src/workers/worker.js` | 40 | Same |

The worker.js files are **entirely stub implementations** — all 4 handler functions are empty shells.

### Other annotations

| File | Line | Annotation |
|------|------|------------|
| `packages/lyzer-shared/src/research/liveShadow/test_fase1_observation_layer.js` | 119 | `protectedAlpha.signalVersion = 'HACKED_VERSION';` |
| `src/laboratory/mgo/mgoRewardHackingDetector.js` | 2 | `MGO DETECTOR: REWARD HACKING` |
| `src/laboratory/mgo/mgoRewardHackingDetector.js` | 73 | `threat_type: 'REWARD_HACKING'` |
| `src/laboratory/adversarial/attackRewardHacking.js` | 69 | `// HACK: System perfectly hedges everything...` |

### Portuguese UI strings (not i18n — hardcoded)

| File | Line | String |
|------|------|--------|
| `lyzer edge/src/components/AlertsView.js` | 91 | `"CUIDADO: Isso irá apagar TODOS os alertas..."` |
| `lyzer edge/src/components/Dashboard.js` | 151 | `"Apagar Todos os Trades (Reset Geral)"` |
| `lyzer edge/src/components/Dashboard.js` | 210 | `"Tem certeza que deseja APAGAR COMPLETAMENTE..."` |
| `lyzer edge/src/components/PolicyEditor.js` | 99 | `"? ALERTA VERMELHO: Isso irá paralisar..."` |

---

## 9. DUPLICATE RUST DEPENDENCIES ACROSS WORKSPACES

| Dependency | Present In | Version(s) |
|-----------|-----------|------------|
| `tokio` | All 3 workspaces + 8 crates | `1.0`, `1.34`, `1.52.3` — **3 different versions** |
| `tonic` | `src-rust` (0.12), `lyzer edge/src-rust` (0.9) | **Mismatched versions** |
| `prost` | `src-rust` (0.13), `lyzer edge/src-rust` (0.11) | **Mismatched versions** |
| `uuid` | `src-rust/lyzer-shadow-oms` (v4, v7), `lyzer edge/src-rust/lyzer-oms` (v7) | Duplicated |

The 3 Rust workspaces cannot compile together — they use incompatible dependency versions.

---

## 10. DISCONNECTED `src-ts/` GOVERNANCE FILES

Directory: `src-ts/governance/` — 7 TypeScript files:

| File | Status |
|------|--------|
| `change_control.ts` | Unknown — not imported by backend or frontend |
| `constitutional_registry.ts` | Unknown — not imported |
| `governance_ledger.ts` | Unknown — not imported |
| `institutional_health.ts` | Unknown — not imported |
| `policy_engine.ts` | Unknown — not imported |
| `retirement_authority.ts` | Unknown — not imported |
| `test_collision.ts` | Test file |

Also includes `.proto` files for governance:
- `cml_ledger.proto`, `eca_jurisdiction.proto`, `proto_version.proto`, `rio_telemetry.proto`

These appear to be an older governance layer that was superseded by the `lyzer-workspace/` Rust constitutional hub. They define a TypeScript-based governance system that no code depends on.

---

## 11. PYTHON BACKUP SCRIPT

- `lyzer edge/backup_restore.py` — exists but is never imported by any JS/TS code. Referenced only in `server.js` string literals for `exec('python3 ...')` calls.

---

## SUMMARY STATISTICS

| Category | Count | Estimated Lines |
|----------|-------|-----------------|
| Archived files (dead) | 58 | ~15,000 |
| Orphaned `src/laboratory/` files | 23 | ~2,500 |
| Dead research files | ~75 | ~15,000 |
| Duplicated TS files | 5 | ~1,000 |
| Duplicated JS files | 2 | ~200 |
| Standalone root scripts | 11 | ~3,000 |
| **Total dead/duplicate code** | **~174 files** | **~36,700+ lines** |

Additional:
- Phantom deps: `ts-node` (declared, unused)
- Zombie package names: `@lyzer/shared`, `@lyzer/constitution` (declared but never imported by name)
- TODO stubs: 8 empty handlers in worker.js files
- Portuguese hardcoded UI strings: 4
- 3 separate Rust workspaces with incompatible dependency versions

# Milestone 4 Exploration Synthesis — Codebase Deduplication Matrix & Alias Strategy

## Overview
Explorer 8 completed an exhaustive SHA-256 byte-for-byte hash comparison across all directories in `E:\projcts\lyzer` (excluding `node_modules`, `.git`, `dist`, `build`, `target`, `_archive`, `.agents`, `.opencode`) and mapped import/require references across 327 codebase files.

## Summary of Duplicates Cataloged

1. **Category 1: Source Code Duplicates (64 files)**
   - **11 Constitution/CER/SIL files**: Identical between `lyzer edge/src/{cer,sil}/` and `packages/lyzer-constitution/src/{cer,sil}/`.
     - `EDLWriter.ts`, `FMCObservabilityLayer.ts`, `RollupEngine.ts`, `SchemaCompatibilityGate.ts`, `SQLiteSchema.ts`, `types.ts`
     - `evolutionRegistry.js`, `goalMutation.js`, `meaningAuditor.js`, `ontologyDrift.js`, `semanticInterpreter.js`
   - **53 Shared files**: Identical between `lyzer edge/src/` and `packages/lyzer-shared/src/`.
     - Components: `BehaviorView.js`, `DecisionStream.js`, `EdgeExplorerView.js`, `EdgeScoreRing.js`, `EvolutionView.js`, `ExecutionTerminal.js`, `MonteCarloView.js`, `ReplayView.js`, `Settings.js`, `StrategyLab.js`, `SystemHealthView.js`, `TradeDetail.js`, `TradeForm.js`, `TradeLog.js`
     - Database: `activeConfig.js`, `historicalData.js`
     - DSL: `compiler.js`, `parser.js`, `validator.js`
     - Engines/Adapters: `evFeatureCausalEngine.js`, `evMTFEngine.js`, `evProfiler.js`, `evSignalRedesign.js`, `evidenceToConfidence.js`
     - Laboratory: `adversarialTesting.js`, `experimentRunner.js`, `governanceCost.js`, `governanceRemoval.js`, `mutationSurvival.js`, `regimeAdaptation.js`, `semanticCorruption.js`, `stressTest.js`
     - Lib/MIC: `eventBus.js`, `workerClient.js`, `events.js`, `gateway.js`, `zombieEngine.js`, `abstractAdapter.js`, `replayAdapter.js`, `scenarios.js`
     - Microstructure: `contracts.ts`, `evidenceHistory.js`, `mdd.js`, `mee.js`, `microstructure.js`
     - Providers/Styles/Types/VM/Workers: `v3_momentum_rsi.js`, `components.css`, `layout.css`, `governanceContracts.ts`, `tradeLogSchema.js`, `strategyVM.js`, `worker.js`, `router.js`

2. **Category 2: Documentation & Audit Duplicates (53 files)**
   - 52 files in `lyzer edge/engineering-audit/` are identical to root `engineering-audit/`.
   - `lyzer edge/HANDOFF.md` is identical to `docs/HANDOFF.md`.

3. **Category 3: Internal Submodule Duplicates**
   - `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` is identical to `lyzer edge/backend/exchangeExecution.js`.

## Canonical Mapping & Deduplication Strategy

1. **Canonical Locations**:
   - `packages/lyzer-constitution/src/` for all CER, SIL, ECA, and governance modules.
   - `packages/lyzer-shared/src/` for shared UI components, engines, adapters, DSL, laboratory tools, and microstructure.
   - Root `engineering-audit/` for engineering audit reports.
   - Root `docs/HANDOFF.md` for handoff documentation.

2. **Workspace Alias Configuration**:
   - Update `lyzer edge/vite.config.js` and `lyzer edge/tsconfig.json` to configure path aliases:
     - `@lyzer/shared` -> `../packages/lyzer-shared/src`
     - `@lyzer/constitution` -> `../packages/lyzer-constitution/src`
   - Update `lyzer edge/package.json` workspace dependencies to include `"@lyzer/shared": "*"` and `"@lyzer/constitution": "*"`.

3. **Import Migration**:
   - Re-route 118 relative import statements across `lyzer edge/src/`, `lyzer edge/backend/`, `lyzer edge/tests/`, and root scripts to point to `@lyzer/shared` or `@lyzer/constitution`.
   - In Node.js backend files, re-route imports to `require('../../packages/lyzer-shared/src/...')` or `require('../../packages/lyzer-constitution/src/...')`.
   - Re-route `lyzer edge/backend/providers/v1_fast/exchangeExecution.js` to reuse `lyzer edge/backend/exchangeExecution.js`.

4. **File Removal**:
   - Remove the 64 duplicate source files in `lyzer edge/src/`.
   - Remove `lyzer edge/engineering-audit/` directory (52 files).
   - Remove `lyzer edge/HANDOFF.md`.

## Work Assignment for Worker 4
- Update `vite.config.js`, `tsconfig.json`, and `package.json` with workspace aliases.
- Update import paths across backend, frontend, tests, and root scripts.
- Delete 117 duplicate files in `lyzer edge/`.
- Run tests (`npm test`) to verify 100% pass without missing module errors.

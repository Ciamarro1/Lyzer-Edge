const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';
const duplicateScan = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\duplicate_scan.json', 'utf8'));
const importAnalysis = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_analysis.json', 'utf8'));

// Build detailed markdown for analysis.md
let analysisMd = `# Milestone 4 Deduplication Investigation Report

## Executive Summary

An exhaustive byte-for-byte SHA-256 hash comparison across the entire repository (\`packages/\`, \`lyzer edge/\`, \`src/\`, \`docs/\`, \`engineering-audit/\`) was conducted to locate all duplicate files, map dependency reference graphs, and formulate a safe deduplication plan.

### Key Metrics
- **Total Duplicate Hash Groups Identified**: **120**
- **Category 1 (Source Code Duplicates: \`packages/\` vs \`lyzer edge/src/\`)**: **64 files**
  - **Category 1A (Constitution Package)**: **11 files** in \`lyzer edge/src/cer/\` and \`lyzer edge/src/sil/\` byte-for-byte identical to \`packages/lyzer-constitution/src/\`
  - **Category 1B (Shared Package)**: **53 files** in \`lyzer edge/src/\` (components, db, dsl, engine, laboratory, lib, mic, microstructure, providers, styles, types, vm, workers, router.js) byte-for-byte identical to \`packages/lyzer-shared/src/\`
- **Category 2 (Documentation & Audit Duplicates)**: **53 files**
  - **52 files** in \`engineering-audit/\` duplicated inside \`lyzer edge/engineering-audit/\`
  - **1 file** \`docs/HANDOFF.md\` duplicated as \`lyzer edge/HANDOFF.md\`
- **Category 3 (Internal Submodule Duplicates)**: **3 hash groups**
  - \`lyzer edge/backend/exchangeExecution.js\` <==> \`lyzer edge/backend/providers/v1_fast/exchangeExecution.js\`
  - 7 Rust crate \`.gitignore\` files
  - 2 Rust crate \`build.rs\` files
- **Total JavaScript / TypeScript / JSON Files Scanned for Imports**: **327**
- **Total Import Statements Analyzing / Targetting Duplicated Files**: **202**

---

## 1. Detailed Inventory of Duplicate Files

### 1.1 Category 1A: Constitution Package Duplicates (11 Files)

These 11 files reside in both \`lyzer edge/src/\` and \`packages/lyzer-constitution/src/\`.

| # | Hash (SHA-256) | File in \`lyzer edge/src/\` | Canonical Package Location (\`packages/lyzer-constitution/\`) | Status |
|---|----------------|---------------------------|-------------------------------------------------------------|--------|
| 1 | \`d647a7b1...` | \`lyzer edge/src/cer/EDLWriter.ts\` | \`packages/lyzer-constitution/src/cer/EDLWriter.ts\` | Duplicate |
| 2 | \`228e60db...` | \`lyzer edge/src/cer/FMCObservabilityLayer.ts\` | \`packages/lyzer-constitution/src/cer/FMCObservabilityLayer.ts\` | Duplicate |
| 3 | \`c360389c...` | \`lyzer edge/src/cer/RollupEngine.ts\` | \`packages/lyzer-constitution/src/cer/RollupEngine.ts\` | Duplicate |
| 4 | \`13e027fa...` | \`lyzer edge/src/cer/SchemaCompatibilityGate.ts\` | \`packages/lyzer-constitution/src/cer/SchemaCompatibilityGate.ts\` | Duplicate |
| 5 | \`06dadaf2...` | \`lyzer edge/src/cer/SQLiteSchema.ts\` | \`packages/lyzer-constitution/src/cer/SQLiteSchema.ts\` | Duplicate |
| 6 | \`27adf29a...` | \`lyzer edge/src/cer/types.ts\` | \`packages/lyzer-constitution/src/cer/types.ts\` | Duplicate |
| 7 | \`7bd05fbe...` | \`lyzer edge/src/sil/evolutionRegistry.js\` | \`packages/lyzer-constitution/src/sil/evolutionRegistry.js\` | Duplicate |
| 8 | \`1ab26d76...` | \`lyzer edge/src/sil/goalMutation.js\` | \`packages/lyzer-constitution/src/sil/goalMutation.js\` | Duplicate |
| 9 | \`8b50be29...` | \`lyzer edge/src/sil/meaningAuditor.js\` | \`packages/lyzer-constitution/src/sil/meaningAuditor.js\` | Duplicate |
| 10 | \`94dc887a...` | \`lyzer edge/src/sil/ontologyDrift.js\` | \`packages/lyzer-constitution/src/sil/ontologyDrift.js\` | Duplicate |
| 11 | \`466e1f6a...` | \`lyzer edge/src/sil/semanticInterpreter.js\` | \`packages/lyzer-constitution/src/sil/semanticInterpreter.js\` | Duplicate |

---

### 1.2 Category 1B: Shared Package Duplicates (53 Files)

These 53 files reside in both \`lyzer edge/src/\` and \`packages/lyzer-shared/src/\`.

| Subdirectory | File Count | Duplicate Files in \`lyzer edge/src/\` | Canonical Package Location (\`packages/lyzer-shared/src/\`) |
|--------------|------------|--------------------------------------|-----------------------------------------------------------|
| \`components/\` | 14 | \`BehaviorView.js\`, \`DecisionStream.js\`, \`EdgeExplorerView.js\`, \`EdgeScoreRing.js\`, \`EvolutionView.js\`, \`ExecutionTerminal.js\`, \`MonteCarloView.js\`, \`ReplayView.js\`, \`Settings.js\`, \`StrategyLab.js\`, \`SystemHealthView.js\`, \`TradeDetail.js\`, \`TradeForm.js\`, \`TradeLog.js\` | \`packages/lyzer-shared/src/components/*\` |
| \`db/\` | 2 | \`activeConfig.js\`, \`historicalData.js\` | \`packages/lyzer-shared/src/db/*\` |
| \`dsl/\` | 3 | \`compiler.js\`, \`parser.js\`, \`validator.js\` | \`packages/lyzer-shared/src/dsl/*\` |
| \`engine/\` | 4 | \`evFeatureCausalEngine.js\`, \`evMTFEngine.js\`, \`evProfiler.js\`, \`evSignalRedesign.js\` | \`packages/lyzer-shared/src/engine/*\` |
| \`kernelAdapters/\` | 1 | \`evidenceToConfidence.js\` | \`packages/lyzer-shared/src/kernelAdapters/*\` |
| \`laboratory/\` | 8 | \`adversarialTesting.js\`, \`experimentRunner.js\`, \`governanceCost.js\`, \`governanceRemoval.js\`, \`mutationSurvival.js\`, \`regimeAdaptation.js\`, \`semanticCorruption.js\`, \`stressTest.js\` | \`packages/lyzer-shared/src/laboratory/*\` |
| \`lib/\` | 2 | \`eventBus.js\`, \`workerClient.js\` | \`packages/lyzer-shared/src/lib/*\` |
| \`mic/\` | 6 | \`events.js\`, \`gateway.js\`, \`zombieEngine.js\`, \`adapters/abstractAdapter.js\`, \`adapters/replayAdapter.js\`, \`latency/scenarios.js\` | \`packages/lyzer-shared/src/mic/*\` |
| \`microstructure/\` | 5 | \`contracts.ts\`, \`evidenceHistory.js\`, \`mdd.js\`, \`mee.js\`, \`microstructure.js\` | \`packages/lyzer-shared/src/microstructure/*\` |
| \`providers/\` | 1 | \`v3_momentum_rsi.js\` | \`packages/lyzer-shared/src/providers/*\` |
| \`styles/\` | 2 | \`components.css\`, \`layout.css\` | \`packages/lyzer-shared/src/styles/*\` |
| \`types/\` | 2 | \`governanceContracts.ts\`, \`tradeLogSchema.js\` | \`packages/lyzer-shared/src/types/*\` |
| \`vm/\` | 1 | \`strategyVM.js\` | \`packages/lyzer-shared/src/vm/*\` |
| \`workers/\` | 1 | \`worker.js\` | \`packages/lyzer-shared/src/workers/*\` |
| Root src | 1 | \`router.js\` | \`packages/lyzer-shared/src/router.js\` |

---

### 1.3 Category 2: Documentation & Audit Duplicates (53 Files)

- **Root \`engineering-audit/\` vs \`lyzer edge/engineering-audit/\`**: 52 files (including executive summary, risk matrix, performance reports, runtime proofs, and telemetry data) are 100% identical copies.
- **Root \`docs/HANDOFF.md\` vs \`lyzer edge/HANDOFF.md\`**: 100% byte-for-byte identical.

---

### 1.4 Category 3: Internal Submodule Duplicates (3 Hash Groups)

1. \`lyzer edge/backend/exchangeExecution.js\` is 100% identical to \`lyzer edge/backend/providers/v1_fast/exchangeExecution.js\`.
2. 7 Rust crate \`.gitignore\` files (\`src-rust/*\` and \`lyzer edge/src-rust/*\`).
3. 2 Rust crate \`build.rs\` files (\`lyzer edge/src-rust/lyzer-intent-registry/build.rs\` and \`lyzer edge/src-rust/lyzer-oms/build.rs\`).

---

## 2. Import & Reference Dependency Mapping

An automated AST and regex scan was performed across all 327 JavaScript, TypeScript, and JSON files in the workspace to catalog all \`import\` and \`require\` references targeting these files.

### Import Breakdown by Module Origin:
1. **Relative Imports inside \`lyzer edge/src/\`**: 40 references.
   - Example: \`import { EventBus } from './lib/eventBus.js';\` in \`lyzer edge/src/app.js\`
   - Example: \`import { DecisionStream } from './DecisionStream.js';\` in \`lyzer edge/src/components/Dashboard.js\`
2. **Relative Imports inside \`lyzer edge/backend/\`**: 19 references.
   - Example: \`const { permission } = require('../../packages/lyzer-constitution/src/eca/permission.js');\` in \`lyzer edge/backend/server.js\`
   - Example: \`const { streamEngine } = require('../../packages/lyzer-shared/src/engine/evSignalRedesign.js');\` in \`lyzer edge/backend/streamEngine.js\`
3. **Relative Imports inside \`lyzer edge/tests/\`**: 59 references.
   - Example: \`import { EventBus } from '../../src/lib/eventBus.js';\` in \`lyzer edge/tests/unit/commandCenter_m1_1.test.js\`
4. **Imports within \`packages/\`**: 55 references.
   - Internal relative imports between modules in \`packages/lyzer-shared\` and \`packages/lyzer-constitution\`.
5. **Root level runner scripts (\`run_*.js\`)**: 29 references.
   - Root scripts already import directly from \`./packages/lyzer-shared/src/...\`.

---

## 3. Clean Deduplication Plan

### 3.1 Canonical Locations Decision

1. **\`packages/lyzer-constitution/src/\`** is the canonical home for all constitutional rules, governance algorithms, ECA logic, CER schema/writers, and SIL semantic interpreters (\`cer/*\`, \`sil/*\`, \`eca/*\`).
2. **\`packages/lyzer-shared/src/\`** is the canonical home for all reusable domain engines, shared UI components, DSL parsers/compilers, laboratory harnesses, MIC adapters, microstructure models, styles, and worker clients.
3. **Root \`engineering-audit/\`** is the canonical home for engineering audit reports.
4. **Root \`docs/HANDOFF.md\`** is the canonical home for documentation handoffs.

### 3.2 File Removal Action Plan

Once import references are updated to point to canonical package paths:
1. **Remove 11 duplicate files in \`lyzer edge/src/cer/\` and \`lyzer edge/src/sil/\`**.
2. **Remove 53 duplicate files in \`lyzer edge/src/\`** (\`components/*\`, \`db/*\`, \`dsl/*\`, \`engine/*\`, \`kernelAdapters/*\`, \`laboratory/*\`, \`lib/*\`, \`mic/*\`, \`microstructure/*\`, \`providers/*\`, \`styles/*\`, \`types/*\`, \`vm/*\`, \`workers/*\`, \`router.js\`).
3. **Remove redundant \`lyzer edge/engineering-audit/\` directory** (52 duplicate files).
4. **Remove redundant \`lyzer edge/HANDOFF.md\`**.
5. **Remove duplicate \`lyzer edge/backend/providers/v1_fast/exchangeExecution.js\`** (or replace with module re-export).

### 3.3 Import Updating Strategy

To ensure seamless module resolution across \`lyzer edge/\` frontend (Vite), backend (Node.js), and tests (Vitest):

1. **Configure Package Path Aliases in \`lyzer edge\`**:
   - In \`lyzer edge/vite.config.js\`:
     \`\`\`js
     resolve: {
       alias: {
         '@': fileURLToPath(new URL('./src', import.meta.url)),
         '@lyzer/shared': fileURLToPath(new URL('../packages/lyzer-shared/src', import.meta.url)),
         '@lyzer/constitution': fileURLToPath(new URL('../packages/lyzer-constitution/src', import.meta.url))
       }
     }
     \`\`\`
   - In \`lyzer edge/tsconfig.json\` / \`jsconfig.json\`:
     \`\`\`json
     "paths": {
       "@/*": ["./src/*"],
       "@lyzer/shared/*": ["../packages/lyzer-shared/src/*"],
       "@lyzer/constitution/*": ["../packages/lyzer-constitution/src/*"]
     }
     \`\`\`
2. **Update Import Statements in Frontend & Backend**:
   - In \`lyzer edge/src/\` and \`lyzer edge/tests/\`: Replace relative paths referencing removed duplicate files with \`@lyzer/shared/...\` or \`@lyzer/constitution/...\`.
   - In \`lyzer edge/backend/\`: Replace relative paths like \`../../packages/lyzer-shared/src/...\` with clean workspace package requires/imports or standardized relative package imports.

---
`;

fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\analysis.md', analysisMd);
console.log('Successfully written E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\analysis.md');

# ANATOMIA QUANTITATIVA DO CÓDIGO — Lyzer Edge

**Date:** 2026-07-27
**Scope:** All source files excluding node_modules, _archive, .git, dist, build

---

## Section 1: Code Taxonomy

### 1.1 File Type Distribution (Project Source Only)

| Extension | Count | Notes |
|-----------|-------|-------|
| .md       | 1236  | Documentation |
| .js       | 888   | JavaScript source |
| .ts       | 103   | TypeScript source |
| .rs       | 55    | Rust source |
| .py       | 44    | Python source |
| .json     | 68    | Configuration |
| .toml     | 20    | Rust/Cargo config |
| .csv      | 13    | Data |
| .css      | 8     | Stylesheets |
| .proto    | 5     | Protobuf definitions |
| .ps1      | 11    | PowerShell scripts |

### 1.2 Total Volumes

| Metric | Value |
|--------|-------|
| Total source files | 1,090 |
| Total lines of code | 106,746 |
| Total exports | 1,160 |
| Total imports | 1,783 |
| Export/Import ratio | 0.65 |

---

## Section 2: The Giants

Top 20 largest files (source code, excl. generated/bundled code):

| # | File | Lines | Risk Level |
|---|------|-------|------------|
| 1 | \lyzer edge/src/components/LiveTradingView.js\ | 1,513 | HIGH |
| 2 | \lyzer edge/tests/e2e_smc/e2e_suite.test.js\ | 1,282 | HIGH |
| 3 | \packages/lyzer-shared/src/components/DecisionStream.js\ | 1,048 | HIGH |
| 4 | \lyzer edge/src/components/DecisionStream.js\ | 1,048 | HIGH (duplicate) |
| 5 | \lyzer edge/src/components/ZSpaceDashboard.js\ | 983 | HIGH |
| 6 | \packages/lyzer-shared/src/components/ZSpaceDashboard.js\ | 981 | HIGH (duplicate) |
| 7 | \lyzer edge/tests/verification/verify_mne.js\ | 875 | HIGH |
| 8 | \lyzer edge/backend/streamEngine.js\ | 858 | HIGH |
| 9 | \lyzer edge/src/db/queries.js\ | 747 | HIGH |
| 10 | \lyzer edge/tests/verification/verify_stream.js\ | 747 | HIGH |
| 11 | \lyzer edge/backend/db.js\ | 743 | HIGH |
| 12 | \lyzer edge/tests/verification/verify_robustness.js\ | 696 | HIGH |
| 13 | \packages/lyzer-shared/src/db/queries.js\ | 682 | HIGH |
| 14 | \lyzer edge/src/engine/stats.js\ | 623 | HIGH |
| 15 | \lyzer edge/.agents/skills/frontend-design/scripts/ux_audit.py\ | 621 | Python agent |
| 16 | \lyzer edge/src/components/GamifiedCommandCenterView.js\ | 585 | HIGH |
| 17 | \.agents/skills/mobile-design/scripts/mobile_audit.py\ | 554 | Python agent |
| 18 | \lyzer edge/src/components/commandCenter/widgets/chartHost/ChartHostWidget.js\ | 523 | HIGH |
| 19 | \lyzer edge/src/engine/evDecompositionLab.js\ | 497 | MEDIUM |
| 20 | \lyzer edge/src/components/DecisionAnalytics.js\ | 496 | MEDIUM |

**Critical finding:** 20 files exceed 500 lines — these are high-complexity risk zones.

---

## Section 3: The Dwarfs

### 3.1 Files Under 200 bytes

| File | Size (bytes) |
|------|-------------|
| \src-rust/lyzer-binance-adapter/src/lib.rs\ | 48 |
| \src-rust/lyzer-oal/src/acquisition/mod.rs\ | 49 |
| \src-rust/lyzer-reality-ws/src/lib.rs\ | 49 |
| \src-rust/lyzer-oal/src/lib.rs\ | 79 |
| \lyzer edge/src/designSystem/theme/index.js\ | 126 |
| \lyzer edge/src-rust/lyzer-risk-gateway/build.rs\ | 136 |
| \src-rust/lyzer-ocr/src/lib.rs\ | 108 |

### 3.2 Files Under 10 Lines of Code

| File | Lines |
|------|-------|
| \src-rust/lyzer-oal/src/distribution/mod.rs\ | 1 |
| \src-rust/lyzer-oal/src/archive/mod.rs\ | 1 |
| \src-rust/lyzer-oal/src/acquisition/mod.rs\ | 2 |
| \src-rust/lyzer-binance-adapter/src/lib.rs\ | 3 |
| \src-rust/lyzer-reality-ws/src/lib.rs\ | 3 |
| \lyzer edge/src-rust/lyzer-risk-gateway/build.rs\ | 4 |
| \src-rust/lyzer-oal/src/lib.rs\ | 4 |
| \lyzer edge/src/designSystem/theme/index.js\ | 4 |
| \src-rust/lyzer-ocr/src/lib.rs\ | 5 |
| \packages/lyzer-constitution/src/eca/riskPolicy.js\ | 6 |
| \lyzer edge/src-rust/lyzer-intent-registry/build.rs\ | 6 |
| \lyzer edge/src-rust/lyzer-oms/build.rs\ | 6 |
| \lyzer edge/src/eca/riskPolicy.js\ | 6 |
| ... 7 manifest files with 7 lines each | 7 |
| \lyzer edge/vite.config.js\ | 9 |

**Warning:** 19 source files have < 10 lines. Mostly Rust module declarations and config stubs.

---

## Section 4: Complexity Hotspots

### 4.1 Deepest Nesting (12+ spaces indentation)

225 files contain deeply nested code (12+ spaces). Top offenders:

| File | Depth Score (lines with 12+ spaces) |
|------|--------------------------------------|
| \ZSpaceDashboard.js\ | 692 |
| \DecisionAnalytics.js\ | 674 |
| \db.js\ (backend) | 584 |
| \DecisionStream.js\ | 464 |
| \strategyVM.js\ | 312 |
| \	imeframeManager.js\ | 252 |
| \liquidityEngine.js\ | 237 |
| \Dashboard.js\ | 219 |
| \TradeForm.js\ | 196 |
| \LiveTradingView.js\ | 185 |

### 4.2 Most Imports Per File (Highest Module Coupling)

| File | Import Count |
|------|-------------|
| \index.js\ (shared) | 74 |
| \streamEngine.js\ | 37 |
| \main.js\ | 30 |
| \server.js\ | 25 |
| \ull_system_execution_auditor.js\ | 24 |
| \pp.js\ (shared) | 23 |
| \dversarialTesting.js\ | 20 |
| \rchitectureCertification.js\ | 18 |
| \CommandCenterView.js\ | 17 |
| \GamifiedCommandCenterView.js\ | 16 |

### 4.3 Highest console.log Density

| File | Console Log Count | Purpose |
|------|------------------|---------|
| \erify_stream.js\ | 90 | Verification test |
| \erify_mne.js\ | 46 | Verification test |
| \erify_robustness.js\ | 43 | Verification test |
| \erify_v03.js\ | 40 | Verification test |
| \erify_signals.js\ | 34 | Verification test |
| \
un_l6_war.js\ | 31 | Research script |
| \erify_v02.js\ | 30 | Verification test |
| \erify_compliance.js\ | 26 | Verification test |
| \erify_alpha.js\ | 25 | Verification test |
| \oundary-certification-suite.ts\ | 25 | Certification test |

**Note:** Verification scripts dominate console.log usage — these are ad-hoc diagnostic tools.

### 4.4 Empty Catch Blocks (Silent Failures)

16 files contain empty catch blocks (potential swallowed exceptions):

| File | Empty Catches |
|------|--------------|
| \GamifiedCommandCenterView.js\ | 8 |
| \ChartAdapter.js\ | 1 |
| \EdgeDashboardWidget.js\ | 1 |
| \PatternRecognitionWidget.js\ | 1 |
| \pp.js\ | 1 |
| \decisionLedger.js\ | 1 |
| \investmentCommitteeEngine.js\ | 1 |
| \correlationRiskEngine.js\ | 1 |
| \observabilityLayer.js\ | 1 |
| \dataLineageEngine.js\ | 1 |
| \undAccountingEngine.js\ | 1 |
| \independentValidationEngine.js\ | 1 |
| \institutionalMemoryEngine.js\ | 1 |
| \institutionalReportingEngine.js\ | 1 |
| \investmentCommitteeAI.js\ | 1 |
| \shadowFundEngine.js\ | 1 |

### 4.5 Highest Export Count Per File

| File | Exports |
|------|---------|
| \queries.js\ (shared) | 63 |
| \index.js\ (shared) | 55 |
| \governanceContracts.ts\ | 24 |
| \stats.js\ | 23 |
| \manifest.js\ | 22 |
| \	ypes.ts\ | 16 |
| \database.js\ | 16 |
| \metricsRegistry.js\ | 12 |
| \evMTFEngine.js\ | 12 |

---

## Section 5: Module Map

### 5.1 Per-Module Statistics

| Module | Files | Total Lines | Exports | Imports | Avg Lines/File |
|--------|-------|-------------|---------|---------|----------------|
| \lyzer edge/src\ | 460 | 43,846 | 694 | 450 | 95.3 |
| \lyzer edge/backend\ | 42 | 6,206 | 58 | 119 | 147.8 |
| \lyzer edge/tests\ | 157 | 12,647 | 5 | 620 | 80.6 |
| \lyzer edge/src-ts\ | 68 | 4,270 | 98 | 143 | 62.8 |
| \lyzer edge/src-rust\ | 6 | 728 | 0 | 0 | 121.3 |
| \packages/lyzer-shared/src\ | 185 | 20,810 | 248 | 305 | 112.5 |
| \packages/lyzer-constitution/src\ | 24 | 1,212 | 40 | 21 | 50.5 |
| \src-rust\ (Rust workspace) | 43 | 1,794 | 0 | 0 | 41.7 |
| \lyzer-workspace\ | 7 | 474 | 0 | 0 | 67.7 |
| \src-ts\ | 7 | 363 | 13 | 9 | 51.9 |
| \.agents\ (Python AI agents) | 20 | 4,781 | 0 | 0 | 239.1 |

### 5.2 Sub-Module Breakdown: \lyzer edge/src\

| Sub-directory | File Count |
|---------------|------------|
| \components/\ | 252 |
| \components/commandCenter/\ | 225 |
| \engine/\ | 40 |
| \services/\ | 12 |
| \designSystem/\ | 10 |
| \eca/\ | 10 |
| \laboratory/\ | 9 |
| ... (others) | ... |

### 5.3 Sub-Module Breakdown: \packages/lyzer-shared/src\

| Sub-directory | File Count | Lines |
|---------------|------------|-------|
| \
esearch/\ | 93 | ~5,095 |
| \
esearch/operations/\ | 35 | 2,349 |
| \
esearch/liveShadow/\ | 11 | 1,730 |
| \
esearch/multiAsset/\ | 7 | 357 |
| \
esearch/execution/\ | 5 | 388 |
| \
esearch/governance/\ | 5 | 271 |

---

## Section 6: Coupling Matrix

### 6.1 Module Dependency Graph

`
lyzer edge/backend/  --imports--?  local (./* ./*.js)
                                    node (express, ws, http, fs, crypto, path, url, events)
                                    sqlite3

lyzer edge/src/      --imports--?  ../../packages/lyzer-shared/src/* (via relative paths)
                                    ../../packages/lyzer-constitution/src/* (via relative paths)
                                    ../db/queries, ../engine/*, ../services/*
                                    local siblings (./*, ../*)
                                    npm: apexcharts, dexie, lightweight-charts, crypto, fs, path

packages/lyzer-shared/src/
                     --imports--?  ../lyzer-constitution/src/eca/court.js
                                    ../db/*, ../engine/*, ../lib/*
                                    ../causality/*, ../execution/*, ../providers/*
                                    ../governance/*, ../services/*
                                    npm: better-sqlite3, crypto, uuid, apexcharts, dexie, fs, path, url

packages/lyzer-constitution/src/
                     --imports--?  (mostly local, tightly coupled within package)

src-rust/            --imports--?  (no JS imports — pure Rust, Cargo dependencies)
`

### 6.2 Coupling Analysis

**Backend ? Frontend/Shared coupling:**
- \streamEngine.js\ imports extensively from \../packages/lyzer-shared/src/\ and \../packages/lyzer-constitution/src/\
- 6 \StreamEngine\ instances share module-level singletons (\signalEngine\, \court\)

**Frontend ? Shared coupling:**
- Uses Vite alias \@\ mapping to \lyzer edge/src/\
- Imports shared packages via relative paths (e.g. \../../packages/lyzer-shared/src/...\)
- \index.js\ is the barrel file with 74 imports — highest coupling point

**Duplicated components:**
- \DecisionStream.js\ exists in BOTH \lyzer edge/src/components/\ AND \packages/lyzer-shared/src/components/\
- \ZSpaceDashboard.js\ similarly duplicated
- \queries.js\ duplicated across both locations

---

## Section 7: Entropy Signals

### 7.1 Files Too Large (> 500 lines) — High Risk

**16 files** exceed 500 lines. These are the primary candidates for refactoring:

| Priority | File | Lines | Reason |
|----------|------|-------|--------|
| P0 | \LiveTradingView.js\ | 1,513 | Largest file — likely violates SRP |
| P0 | \e2e_suite.test.js\ | 1,282 | Overgrown test suite |
| P1 | \DecisionStream.js\ (2 copies) | 1,048 | Duplicated, overgrown |
| P1 | \ZSpaceDashboard.js\ (2 copies) | ~982 | Duplicated, overgrown |
| P1 | \erify_mne.js\ | 875 | Ad-hoc verification script |
| P1 | \streamEngine.js\ | 858 | Core orchestrator — critical path |
| P2 | \db/queries.js\ (2 copies) | ~715 | Duplicated query files |
| P2 | \erify_stream.js\ | 747 | Ad-hoc verification |
| P2 | \erify_robustness.js\ | 696 | Ad-hoc verification |

### 7.2 Files Too Small (< 10 lines, not config) — Code Smell

**19 files** under 10 lines. Notable:

- \src-rust/lyzer-oal/src/{acquisition,archive,distribution}/mod.rs\ — module declarations only, likely empty modules
- \src-rust/lyzer-binance-adapter/src/lib.rs\ (3 lines) — barely any implementation
- \lyzer edge/src/designSystem/theme/index.js\ (4 lines) — trivial re-export
- \packages/lyzer-constitution/src/eca/riskPolicy.js\ (6 lines) — stub
- \lyzer edge/src/eca/riskPolicy.js\ (6 lines) — duplicate stub

### 7.3 Directories With Too Many Files

| Directory | File Count | Concern |
|-----------|------------|---------|
| \lyzer edge/src/components/\ | 252 | Monolithic — suggests insufficient decomposition |
| \lyzer edge/src/components/commandCenter/\ | 225 | Massive sub-component |
| \packages/lyzer-shared/src/research/\ | 93 | Largest package sub-module |
| \packages/lyzer-shared/src/\ | 185 | Package needs further decomposition |
| \lyzer edge/tests/\ | 157 | Test directory |

### 7.4 Mixed Concerns (Files Importing From Too Many Modules)

Files importing from 15+ different locations:

| File | Import Count | Concern |
|------|-------------|---------|
| \index.js\ (shared) | 74 | Excessive barrel — creates deep dependency tree |
| \streamEngine.js\ | 37 | Central orchestrator with too many dependencies |
| \main.js\ | 30 | Application entry too coupled |
| \server.js\ | 25 | Server bootstrap too coupled |
| \ull_system_execution_auditor.js\ | 24 | Test infrastructure too coupled |
| \pp.js\ | 23 | Application shell too coupled |

### 7.5 Empty Catch Blocks — Silent Failure Risk

16 files swallow exceptions. **8 empty catches in \GamifiedCommandCenterView.js\** is the most egregious.

### 7.6 Duplicate Files

| File Pair | Lines Each |
|-----------|------------|
| \lyzer edge/src/components/DecisionStream.js\ vs \packages/lyzer-shared/src/components/DecisionStream.js\ | 1,048 vs 1,048 |
| \lyzer edge/src/components/ZSpaceDashboard.js\ vs \packages/lyzer-shared/src/components/ZSpaceDashboard.js\ | 983 vs 981 |
| \lyzer edge/src/db/queries.js\ vs \packages/lyzer-shared/src/db/queries.js\ | 747 vs 682 |
| \lyzer edge/src/eca/riskPolicy.js\ vs \packages/lyzer-constitution/src/eca/riskPolicy.js\ | 6 vs 6 |
| \.agents/.../ux_audit.py\ vs \lyzer edge/.agents/.../ux_audit.py\ | 621 vs 621 |

**Warning:** DecisionStream and ZSpaceDashboard are exact duplicates — code drift risk.

### 7.7 Console.Log in Production Code

While verification scripts are expected to have console.log, \streamEngine.js\ (20 calls), \server.js\ (22 calls), and \semanticCorruption.js\ (36 calls) are production files with significant debug logging.

---

## Summary of Critical Findings

| Finding | Severity | Count |
|---------|----------|-------|
| Files > 500 lines (high complexity) | HIGH | 16 |
| Empty catch blocks (silent failures) | HIGH | 16 |
| Duplicate source files | MEDIUM | 5 pairs |
| Files < 10 lines (stubs/dead code) | LOW | 19 |
| Files with 15+ imports (high coupling) | MEDIUM | 11 |
| Production files with 20+ console.log calls | LOW | 3 |
| Deep nesting (12+ spaces) | MEDIUM | 225 files |

**Total Technical Debt Signals:** 6 HIGH, 3 MEDIUM, 2 LOW



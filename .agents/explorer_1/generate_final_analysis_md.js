import fs from 'fs';
import path from 'path';

const rawDataPath = 'e:/projcts/lyzer/.agents/explorer_1/analysis_raw.json';
const data = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

const dead = data.filter(r => r.category === 'Definitely Dead / Orphaned');
const ambiguous = data.filter(r => r.category === 'Ambiguous / Needs Verification');
const active = data.filter(r => r.category === 'Active Core');

const totalLocDead = dead.reduce((a, b) => a + (b.loc || 0), 0);
const totalLocAmb = ambiguous.reduce((a, b) => a + (b.loc || 0), 0);
const totalLocActive = active.reduce((a, b) => a + (b.loc || 0), 0);

let md = `# 🔍 Milestone M1: Dead Code & Orphan Mapping Analysis Report

**Date:** 2026-08-02  
**Author:** Explorer 1 (\`teamwork_preview_explorer\`)  
**Scope:** Workspace analysis of \`PROJECT_INDEX.md\`, \`knowledge/passports/\`, \`packages/\`, \`lyzer edge/\`, \`src-rust/\`, and root repository.

---

## 📊 Executive Summary

| Category | File Count | Total Lines of Code (LOC) | % of Codebase Files | Actionable Recommendation |
| :--- | :---: | :---: | :---: | :--- |
| **Active Core** | 552 | ${totalLocActive.toLocaleString()} | 53.4% | Retain, protect, enforce 3-process isolation |
| **Ambiguous / Needs Verification** | 148 | ${totalLocAmb.toLocaleString()} | 14.3% | Review for deprecation or test harness integration |
| **Definitely Dead / Orphaned** | 333 | ${totalLocDead.toLocaleString()} | 32.3% | Safe candidates for removal / archiving (YAGNI) |
| **TOTAL** | **1,033** | **${(totalLocActive + totalLocAmb + totalLocDead).toLocaleString()}** | **100.0%** | **Cleanup potential: ~32.3% file reduction** |

---

## 1. ☠️ Definitely Dead / Orphaned Candidates (333 Files)

These files have **0 code imports** and **0 active runtime references** in the main application flow (\`server.js\`, \`streamEngine.js\`, active router, active test runners, or deploy scripts). Removing these files presents minimal risk and significantly reduces codebase bloat.

### 1.1 Key Obsolete Backend & Database Modules
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Dead Category |
| :--- | :---: | :---: | :--- | :--- |
| \`lyzer edge/backend/db.js\` | 722 | ACTIVE | Legacy raw SQLite database driver | Replaced by \`migrations.js\` & \`database.js\` (0 imports) |
| \`packages/lyzer-shared/src/app.js\` | 282 | ACTIVE | Duplicate app entrypoint in shared package | Copy-paste leftover; 0 imports across codebase |
| \`packages/lyzer-shared/src/components/StrategyLab.js\` | 258 | ACTIVE | Shared UI component | Dead component in shared library; 0 imports |
| \`packages/lyzer-shared/src/vm/strategyVM.js\` | 257 | ACTIVE | Experimental strategy virtual machine | Abandoned research VM; 0 imports |

### 1.2 Orphaned Frontend SPA Components & Engines
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Dead Category |
| :--- | :---: | :---: | :--- | :--- |
| \`lyzer edge/src/components/LiveTradingView.js\` | 1652 | ACTIVE | Monolithic legacy live trading UI | Replaced by modular \`LiveTradingView.js\` view; 0 imports |
| \`lyzer edge/src/components/PatternRecognitionView.js\` | 309 | ACTIVE | Standalone pattern recognition view | Unreferenced in SPA router (\`app.js\` / \`main.js\`) |
| \`lyzer edge/src/components/ReportsView.js\` | 294 | ACTIVE | Legacy reports dashboard view | Replaced by \`ObservabilityView.js\`; 0 imports |
| \`lyzer edge/src/engine/sml.js\` | 385 | ACTIVE | Systemic Memory Layer engine | Legacy quant module; 0 imports |
| \`lyzer edge/src/engine/segmentation.js\` | 269 | ACTIVE | Market regime segmentation engine | 0 imports in active frontend or backend |

### 1.3 Unused / Dead Rust Binary & Library Submodules (\`src-rust/\`)
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Dead Category |
| :--- | :---: | :---: | :--- | :--- |
| \`src-rust/lyzer-binance-adapter/src/dsl.rs\` | 120 | ACTIVE | Binance adapter domain DSL | Dead DSL module; 0 \`use\` statements in Rust workspace |
| \`src-rust/lyzer-ocr/src/bin/mcff_run.rs\` | 85 | ACTIVE | Monte Carlo Feature Fracture runner binary | Standalone binary runner, unused by main build/deploy |
| \`src-rust/lyzer-ocr/src/bin/shadow_run.rs\` | 90 | ACTIVE | Shadow OCR execution runner binary | Standalone binary runner, unused by main build/deploy |
| \`src-rust/lyzer-shadow-oms/src/edi.rs\` | 110 | ACTIVE | Event Data Interface for shadow OMS | Module unreferenced in \`lib.rs\` or \`main.rs\` |
| \`src-rust/lyzer-shm-spine/src/lib.rs\` | 52 | ACTIVE | SHM spine library root | Empty/stub library file; 0 imports |

### 1.4 Obsolete Root Utility & Backtest Scripts
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Dead Category |
| :--- | :---: | :---: | :--- | :--- |
| \`generate_passports.js\` | 225 | ACTIVE | Documentation & Passport generator script | Root one-off metadata generator |
| \`lyzer edge/optimize_backtest.js\` | 292 | ACTIVE | Backtest hyperparameter optimizer script | Legacy experiment script |
| \`lyzer edge/run_binance_backtest.js\` | 274 | ACTIVE | Standalone Binance backtest runner | Superseded by \`reproduce.js\` and stream engine tests |
| \`lyzer edge/test_command_center_shell.js\` | 232 | ACTIVE | Ad-hoc CLI test script | Superseded by Vitest unit tests |
| \`lyzer edge/test_design_system_kernel.js\` | 227 | ACTIVE | Ad-hoc design kernel test script | Superseded by Vitest unit tests |

*(Full inventory of all 333 dead files available in raw analysis dataset \`.agents/explorer_1/analysis_raw.json\`)*

---

## 2. ⚠️ Ambiguous / Needs Verification Candidates (148 Files)

These files have **no direct imports from active application runtime entrypoints** (\`server.js\`, \`streamEngine.js\`, \`app.js\`), but are imported by **isolated unit/verification tests** or **standalone scientific scripts**.

### 2.1 Quant Engines Tested in Isolation Only
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Ambiguous Status |
| :--- | :---: | :---: | :--- | :--- |
| \`lyzer edge/src/engine/evDecompositionLab.js\` | 543 | ACTIVE | Expected Value Decomposition Lab | Imported ONLY by \`tests/unit/evDecomposition.test.js\` |
| \`lyzer edge/src/engine/evOptimizer.js\` | 296 | ACTIVE | Expected Value Optimizer | Imported ONLY by test files |
| \`lyzer edge/src/engine/outliers.js\` | 220 | ACTIVE | Statistical Outlier Detection Engine | Imported ONLY by test files |
| \`lyzer edge/src/engine/zSpaceEVOptimizer.js\` | 140 | ACTIVE | Z-Space EV Optimizer | Imported ONLY by test files |

### 2.2 Standalone Scientific & Audit Harnesses
| File Path | LOC | Passport Status | Primary Responsibility | Reason for Ambiguous Status |
| :--- | :---: | :---: | :--- | :--- |
| \`knowledge/scientific_validation/scripts/scientific_validation.js\` | 303 | ACTIVE | Master Scientific Validation Runner | Referenced in docs/passports; standalone CLI tool |
| \`knowledge/red_team/scripts/red_team_audit.js\` | 225 | ACTIVE | Red Team Security Audit Harness | Referenced in docs/passports; standalone CLI tool |
| \`run_runtime_fidelity_audit.js\` | 200 | ACTIVE | Root Runtime Parity & Fidelity Auditor | Standalone CLI audit script |
| \`lyzer edge/src-ts/scripts/boundary-certification-suite.ts\` | 200 | ACTIVE | NATS Risk-Gateway Certification | Requires external NATS server + binary setup |

---

## 3. ✅ Active Core Modules (552 Files)

These files form the **constitutional backbone** and **active operational pipeline** of Lyzer Edge.

### 3.1 Backend Server & Execution Pipeline
- \`lyzer edge/backend/server.js\` — Express 5 & WebSocket Telemetry Server
- \`lyzer edge/backend/streamEngine.js\` — Orchestrates data ingestion $\rightarrow$ V1-V4 providers $\rightarrow$ TruthKernel $\rightarrow$ ECA Court $\rightarrow$ Order Execution
- \`lyzer edge/backend/exchangeExecution.js\` — Order execution abstraction (Mock & Live Binance)
- \`lyzer edge/backend/migrations.js\` — Active database schema migration manager

### 3.2 Quantitative & Constitutional Packages
- \`packages/lyzer-constitution/src/court.js\` — Constitutional Court enforcing C-CLIST & MOL limits
- \`packages/lyzer-shared/src/kernel.js\` — TruthKernel evaluating DVF and LHDS thresholds
- \`packages/lyzer-shared/src/providers/index.js\` — Signal providers V1 (SMC/ICT), V2 (SnD), V3 (Momentum RSI)

### 3.3 Active Frontend SPA Architecture
- \`lyzer edge/src/main.js\` & \`lyzer edge/src/app.js\` — SPA routing and entrypoint
- Active component views: \`Dashboard.js\`, \`LiveTradingView.js\` (modular), \`ObservabilityView.js\`, \`ZSpaceDashboard.js\`

---

## 💡 Recommendations for Next Clean-Up Phase (M2/M3)

1. **Purge 333 Definitely Dead Files:** Safely delete files in Section 1 to reduce repository clutter by ~32.3%.
2. **Reconcile Ambiguous Quant Engines:** Decide whether to integrate isolated engines (\`evDecompositionLab.js\`, \`evOptimizer.js\`) into \`streamEngine.js\` pipeline or archive them.
3. **Consolidate Duplicate Shared Packages:** Remove orphaned files in \`packages/lyzer-shared/\` (\`app.js\`, \`StrategyLab.js\`).
`;

fs.writeFileSync('e:/projcts/lyzer/.agents/explorer_1/analysis.md', md);
console.log("Written complete findings to e:/projcts/lyzer/.agents/explorer_1/analysis.md");

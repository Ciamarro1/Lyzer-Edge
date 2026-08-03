# Explorer 3 Analysis Report — Milestone M1: Dead Code & Orphan Mapping

**Repository**: Lyzer Edge Repository (`e:\projcts\lyzer\`)  
**Scope**: Root directory, `packages/`, `src-rust/`, `lyzer-workspace/`, root scripts, and root CI/CD / deployment configs.  
**Date**: 2026-08-02  
**Agent**: Explorer 3 (`teamwork_preview_explorer`)

---

## 1. Executive Summary

This investigation conducted an exhaustive audit of all root-level assets, workspace packages (`packages/`), Rust workspaces (`src-rust/`, `lyzer-workspace/`), script files, and deployment configurations across the Lyzer Edge repository.

Key Findings:
1. **Critical Assets (MUST PROTECT)**: Core infrastructure scripts (`deploy-experiments.ps1`, `git-push-setup.ps1`, `setup-cg.ps1`), Dockerfile, `.cargo/config.toml`, `.github/workflows/keep_alive.yml`, `AGENTS.md`, `GEMINI.md`, `CONSTITUTION.md`, workspace packages (`packages/lyzer-constitution`, `packages/lyzer-shared`), Rust workspaces (`src-rust/`, `lyzer-workspace/`), and `lyzer edge/backup_restore.py` (invoked directly in `Dockerfile:75`).
2. **Orphaned / Dead Code Trees**:
   - `src-ts/`: Governance and protocol TS/proto modules (`governance/change_control.ts`, `cml_ledger.proto`, etc.) with **0 consumer imports** across the codebase.
   - `src/laboratory/`: Adversarial attack scripts, CEL parallel simulators, and MGO detectors with **0 consumer imports** across the codebase.
3. **Ad-Hoc / Validation Scripts**: 12 root-level JavaScript scripts (`generate_passports.js`, `reproduce.js`, `run_*.js`) created for one-off research, falsification audits, and report generation. None are imported or invoked by the build pipeline, backend server, or Docker runtime.

---

## 2. Infrastructure & Deployment Protection Assessment

### 2.1 Essential Infrastructure & Deployment Assets (MUST PROTECT)

| Asset | Exact Path | Role & References | Protection Level |
|---|---|---|---|
| **Hugging Face Multi-Instance Deployment** | `e:\projcts\lyzer\deploy-experiments.ps1` | Provisions 4 Hugging Face Spaces (`exp-a` to `exp-d`), configures secret env vars, and force-pushes repository code. Referenced in `AGENTS.md` ("Script: deploy-experiments.ps1"). | **MUST PROTECT** |
| **Backup / Restore Engine** | `e:\projcts\lyzer\lyzer edge\backup_restore.py` | Handles SQLite database backup/restore from Hugging Face Hub. Executed on container startup via `Dockerfile:75` (`WORKDIR "/app/lyzer edge"` -> `python3 backup_restore.py restore`). Referenced in `AGENTS.md`. | **MUST PROTECT** |
| **MinGW-w64 Rust Cargo Target Config** | `e:\projcts\lyzer\.cargo\config.toml` | Defines `linker = "C:\\mingw64\\mingw64\\bin\\gcc.exe"` for `x86_64-pc-windows-gnu`. Essential for building Rust binaries on Windows. Referenced in `AGENTS.md`. | **MUST PROTECT** |
| **GitHub Actions Keep-Alive Workflow** | `e:\projcts\lyzer\.github\workflows\keep_alive.yml` | Scheduled cron workflow (`*/40 * * * *`) that pings `https://jonatanciamarro-lyzer-edge.hf.space` to prevent Hugging Face Space sleeping. | **MUST PROTECT** |
| **Git Remote & Credentials Setup** | `e:\projcts\lyzer\git-push-setup.ps1` | Configures git user credentials and remotes for GitHub and Hugging Face. | **MUST PROTECT** |
| **Cognitive Governance Initializer** | `e:\projcts\lyzer\setup-cg.ps1` | Verifies agent/skill structure and creates `.opencode/config.json`. | **MUST PROTECT** |
| **Production Container Spec** | `e:\projcts\lyzer\Dockerfile` | Multi-stage build (Stage 1: Rust `lyzer-core-hub` compilation + Node npm install + Vite build + NATS download; Stage 2: Ubuntu 24.04 runtime with Hugging Face Hub dependencies). | **MUST PROTECT** |
| **Constitutional Agent Rules** | `e:\projcts\lyzer\AGENTS.md` & `e:\projcts\lyzer\.agents\rules\GEMINI.md` | Master guidelines, 7-layer pipeline rules, system prompt protections, developer commands. | **MUST PROTECT** |
| **System Constitution** | `e:\projcts\lyzer\CONSTITUTION.md` | Fundamental 9 Laws of the Engineering Constitution. | **MUST PROTECT** |

---

## 3. Core Packages & Rust Workspaces Audit

### 3.1 Workspace Packages (`packages/`)

- **`packages/lyzer-constitution/`**:
  - Contains Constitutional Court logic (`court.js`), ECA axioms (`axioms.js`), C-CLIST oracle (`c-clist.js`), MOL state machine (`mol.js`), Ledger, Risk Policy, Proposal Budget, and Schema Compatibility Gates (`cer/SchemaCompatibilityGate.ts`).
  - **Consumer Imports Verified**:
    - `lyzer edge/backend/server.js:12` imports `getCourtSecret` from `../../packages/lyzer-constitution/src/eca/permission.js`.
    - `lyzer edge/backend/streamEngine.js:16` imports `ConstitutionalCourt`, `court` from `../../packages/lyzer-constitution/src/eca/court.js`.
  - **Status**: **ACTIVE & MUST PROTECT** (Core Judicial Authority).

- **`packages/lyzer-shared/`**:
  - Contains Smart Money Concepts facade (`smcFacade.js`), Replay Engine (`replayEngine.js`), Signal Providers V1-V4 (`v1_smc_ict.js`, `v2_snd_snr.js`, `v3_momentum_rsi.js`, `v4_imce.js`), TruthKernel (`kernel.js`), CSRL normalizer (`ScaleNormalizer.js`), EV signal redesign (`evSignalRedesign.js`), and EventBus (`eventBus.js`).
  - **Consumer Imports Verified**:
    - `lyzer edge/backend/streamEngine.js:7-34` imports TruthKernel, Signal Providers V1-V4, MicrostructureDampener, CSRL components, and EV engines.
    - `lyzer edge/backend/dualRealityMonitor.js:1-2` imports CSRL normalizers.
    - `lyzer edge/src/db/activeConfig.js:4` exports activeConfig.
    - `lyzer edge/src/engine/*` and unit tests in `lyzer edge/tests/` import extensively from `packages/lyzer-shared`.
  - **Status**: **ACTIVE & MUST PROTECT** (Core Quantitative Execution & Signal Engine).

### 3.2 Rust Workspaces (`src-rust/` & `lyzer-workspace/`)

- **`src-rust/`**:
  - Contains Rust kernel crates: `lyzer-binance-adapter`, `lyzer-eca`, `lyzer-oal`, `lyzer-ocr`, `lyzer-reality-ws`, `lyzer-shadow-oms`, `lyzer-shared`, `lyzer-shm-spine`.
  - Workspace root manifest: `src-rust/Cargo.toml`.
  - **Status**: **ACTIVE & MUST PROTECT** (High-Performance Kernel Subsystem).

- **`lyzer-workspace/`**:
  - Contains Constitutional Hub Rust crates: `lyzer-core-arbitration`, `lyzer-core-governance`, `lyzer-core-hub`, `lyzer-core-memory`, `lyzer-core-models`.
  - Workspace root manifest: `lyzer-workspace/Cargo.toml`.
  - **Consumer Build Verified**: `Dockerfile:15` executes `cargo build --release --manifest-path lyzer-workspace/lyzer-core-hub/Cargo.toml` and copies `lyzer-core-hub` binary to `/usr/local/bin/` in production image (`Dockerfile:47`).
  - **Status**: **ACTIVE & MUST PROTECT** (Production IPC Hub).

---

## 4. Analysis of Root Scripts & Orphaned Code

### 4.1 Root JavaScript Utility & Validation Scripts

The repository root contains 12 JavaScript files. Consumer reference checks confirm that **none of these files are imported by production backend/frontend code or called in `package.json` build scripts**.

| Script File | Purpose & Description | Referenced in Code? | Classification & Recommendation |
|---|---|---|---|
| `generate_passports.js` | Generates passport markdown files in `knowledge/passports/` by scanning project directories. | No | Ad-Hoc Utility / Scientific Tool. Safe for archive/removal. |
| `reproduce.js` | Reproducibility script re-running feature importance over 1,395 trades from `lyzer_edge_backup_2026-07-24.json`. | No | Ad-Hoc Falsification Script. Safe for archive/removal. |
| `run_autonomous_research_lab.js` | Executes 9 phases of autonomous research lab importing `packages/lyzer-shared/src/research/*`. | No | Standalone Research Runner. Safe for archive/removal. |
| `run_decision_quality_audit.js` | Performs 9-phase decision quality and counterfactual audit on production backup trades. | No | One-off Audit Script. Safe for archive/removal. |
| `run_final_independent_review.js` | Peer-review audit script writing reports to `knowledge/final_independent_review/`. | No | One-off Audit Script. Safe for archive/removal. |
| `run_final_truth_audit.js` | Evaluates quantitative claims against backup data. | No | One-off Audit Script. Safe for archive/removal. |
| `run_institutional_committee_synthesis.js` | Writes `knowledge/institutional_synthesis/master_synthesis_report.md`. | No | One-off Synthesis Script. Safe for archive/removal. |
| `run_real_replay_validation.js` | Bar-by-bar ReplayEngine test runner over synthetic candle stream. | No | Standalone Replay Harness. Safe for archive/removal. |
| `run_runtime_fidelity_audit.js` | Generates fidelity metrics in `knowledge/runtime_fidelity/`. | No | One-off Audit Script. Safe for archive/removal. |
| `run_runtime_parity_experiment.js` | Executes RuntimeParityReplayEngine across 6 market assets. | No | Standalone Experiment Script. Safe for archive/removal. |
| `run_simplification_audit.js` | Generates `knowledge/simplification_roadmap_v2.md`. | No | One-off Audit Script. Safe for archive/removal. |
| `run_simplification_execution.js` | Legacy file cleanup script targeting obsolete files (`run_sports.js`, `api_response.json`). | No | Legacy Maintenance Script. Safe for archive/removal. |

### 4.2 Orphaned Directory Trees

- **`src-ts/`**:
  - Structure: `governance/change_control.ts`, `governance/constitutional_registry.ts`, `governance/governance_ledger.ts`, `governance/institutional_health.ts`, `governance/policy_engine.ts`, `governance/retirement_authority.ts`, `governance/test_collision.ts`, and protobuf schemas in `governance/protos/`.
  - Import Check: `grep_search` across `lyzer edge/`, `packages/`, `src/`, `src-rust/`, `lyzer-workspace/` yielded **0 references**.
  - **Classification**: **DEAD / ORPHANED CODE TREE** (Abandoned TypeScript governance prototype).

- **`src/laboratory/`**:
  - Structure: Adversarial attack scripts (`attackEcaConservatism.js`, `attackGovCapture.js`, `attackRewardHacking.js`, etc.), CEL simulator (`celParallelSimulator.js`, `run_simulator.js`), MGO detectors (`mgoCaptureDetector.js`, etc.), `monteCarlo.js`, `shadow_orchestrator.py`, `lyzer_shm_intent.js`.
  - Import Check: `grep_search` across application source directories yielded **0 references**.
  - **Classification**: **DEAD / ORPHANED CODE TREE** (Abandoned laboratory experiments).

---

## 5. Summary Matrix & Actionable Categorization

```
LYZER EDGE REPOSITORY ROOT
├── MUST PROTECT (Infrastructure, Deployment, Rules, Architecture)
│   ├── AGENTS.md
│   ├── GEMINI.md
│   ├── CONSTITUTION.md
│   ├── Dockerfile
│   ├── deploy-experiments.ps1
│   ├── git-push-setup.ps1
│   ├── setup-cg.ps1
│   ├── .cargo/config.toml
│   ├── .github/workflows/keep_alive.yml
│   ├── packages/lyzer-constitution/
│   ├── packages/lyzer-shared/
│   ├── src-rust/
│   ├── lyzer-workspace/
│   └── lyzer edge/backup_restore.py (Container restore engine)
│
├── ORPHANED / DEAD CODE (Candidates for Pruning / Archival in M2/M3)
│   ├── src-ts/ (0 imports)
│   └── src/laboratory/ (0 imports)
│
└── AD-HOC / SCIENTIFIC VALIDATION SCRIPTS (Stand-alone runners)
    ├── generate_passports.js
    ├── reproduce.js
    └── run_*.js (10 audit & experiment runners)
```

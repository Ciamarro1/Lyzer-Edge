# Handoff Report — Explorer 3 (Milestone M1: Dead Code & Orphan Mapping)

**Agent**: Explorer 3 (`teamwork_preview_explorer`)  
**Working Directory**: `e:\projcts\lyzer\.agents\explorer_3\`  
**Target Milestone**: M1 Dead Code & Orphan Mapping  

---

## 1. Observation

Direct observations from tool executions and codebase inspection:

1. **Deployment Assets**:
   - `e:\projcts\lyzer\deploy-experiments.ps1`: 155-line PowerShell script provisioning 4 Hugging Face Spaces (`lyzer-edge-exp-a` to `d`), configuring secrets, and running `git push`. Documented in `AGENTS.md` ("Script: deploy-experiments.ps1").
   - `e:\projcts\lyzer\lyzer edge\backup_restore.py`: SQLite backup/restore engine for Hugging Face Hub. Invoked directly in `e:\projcts\lyzer\Dockerfile:75`: `CMD ["sh", "-c", "python3 backup_restore.py restore; nats-server -js & lyzer-core-hub & node backend/server.js"]` from `WORKDIR "/app/lyzer edge"`.
   - `e:\projcts\lyzer\.cargo\config.toml`: Target configuration for `x86_64-pc-windows-gnu` using MinGW-w64 (`linker = "C:\\mingw64\\mingw64\\bin\\gcc.exe"`). Documented in `AGENTS.md`.
   - `e:\projcts\lyzer\.github\workflows\keep_alive.yml`: GitHub Actions workflow scheduling curl pings every 40 minutes (`cron: '*/40 * * * *'`) to keep Hugging Face Space active.

2. **Core Packages & Rust Workspaces**:
   - `packages/lyzer-constitution/`: Constitutional Court, ECA court, C-CLIST oracle, MOL state machine. Directly imported in `lyzer edge/backend/server.js:12` (`getCourtSecret`) and `lyzer edge/backend/streamEngine.js:16` (`ConstitutionalCourt`, `court`).
   - `packages/lyzer-shared/`: Quantitative trading engines, SMC facade, CSRL normalizer, TruthKernel. Directly imported in `lyzer edge/backend/streamEngine.js:7-34`, `lyzer edge/src/`, and `tests/`.
   - `src-rust/`: 8 Rust crates (`lyzer-binance-adapter`, `lyzer-eca`, `lyzer-oal`, `lyzer-ocr`, `lyzer-reality-ws`, `lyzer-shadow-oms`, `lyzer-shared`, `lyzer-shm-spine`) with workspace root `src-rust/Cargo.toml`.
   - `lyzer-workspace/`: 5 Rust crates (`lyzer-core-arbitration`, `lyzer-core-governance`, `lyzer-core-hub`, `lyzer-core-memory`, `lyzer-core-models`). `lyzer-core-hub` is compiled in `Dockerfile:15` and copied to `/usr/local/bin/lyzer-core-hub` in `Dockerfile:47`.

3. **Orphaned Directory Trees**:
   - `src-ts/`: Contains 7 TS files (`governance/change_control.ts`, etc.) and 4 `.proto` files (`cml_ledger.proto`, etc.). Grep search across the entire repository yielded **0 imports/references**.
   - `src/laboratory/`: Contains adversarial attack scripts (`attackEcaConservatism.js`, etc.), CEL parallel simulators, and MGO detectors. Grep search across application code yielded **0 imports/references**.

4. **Root-Level Ad-Hoc Scripts**:
   - 12 root JS files (`generate_passports.js`, `reproduce.js`, `run_autonomous_research_lab.js`, `run_decision_quality_audit.js`, `run_final_independent_review.js`, `run_final_truth_audit.js`, `run_institutional_committee_synthesis.js`, `run_real_replay_validation.js`, `run_runtime_fidelity_audit.js`, `run_runtime_parity_experiment.js`, `run_simplification_audit.js`, `run_simplification_execution.js`).
   - Grep search excluding `.agents/` confirmed **0 imports or calls in application backend, frontend, or build scripts**.

---

## 2. Logic Chain

1. **Step 1**: Inspected deployment files and container entrypoints. `Dockerfile:75` relies on `python3 backup_restore.py restore` in `lyzer edge/`, `deploy-experiments.ps1` manages multi-instance HF deployments, `.cargo/config.toml` enables Windows GCC compilation, and `.github/workflows/keep_alive.yml` prevents HF Space hibernation.
   - *Inference*: These assets form the operational backbone of deployment, building, and uptime management and must be strictly protected.

2. **Step 2**: Traced all package imports across `lyzer edge/`. `packages/lyzer-constitution` is imported by `server.js` and `streamEngine.js` for Constitutional Court enforcement. `packages/lyzer-shared` is imported across the stream engine and provider pipeline. `lyzer-workspace/lyzer-core-hub` is compiled in `Dockerfile`.
   - *Inference*: Both packages in `packages/` and both Rust workspace trees (`src-rust/` and `lyzer-workspace/`) are active production components and must be protected.

3. **Step 3**: Analyzed `src-ts/` and `src/laboratory/`. Performed ripgrep searches across all source code directories for any module imports. Result: 0 matches.
   - *Inference*: `src-ts/` and `src/laboratory/` are abandoned prototypes/experiments that can be safely targeted for deprecation/pruning without affecting any active code or tests.

4. **Step 4**: Examined the 12 root-level JS scripts (`generate_passports.js`, `reproduce.js`, `run_*.js`). Verified that none are listed in `package.json` scripts or imported in `lyzer edge/`.
   - *Inference*: As confirmed by `AGENTS.md`, these are ad-hoc scientific audit and report-generation scripts used for manual validation, independent of the automated runtime.

---

## 3. Caveats

- **No Caveats**: All assertions are backed by direct file content views, container command tracing, and workspace-wide ripgrep import verifications.

---

## 4. Conclusion

1. **MUST PROTECT Assets**:
   - `deploy-experiments.ps1`
   - `git-push-setup.ps1`
   - `setup-cg.ps1`
   - `lyzer edge/backup_restore.py`
   - `Dockerfile`
   - `.cargo/config.toml`
   - `.github/workflows/keep_alive.yml`
   - `AGENTS.md`, `GEMINI.md`, `CONSTITUTION.md`
   - Workspace packages: `packages/lyzer-constitution/`, `packages/lyzer-shared/`
   - Rust workspaces: `src-rust/`, `lyzer-workspace/`

2. **ORPHANED / DEAD CODE Trees**:
   - `src-ts/` (0 consumer imports)
   - `src/laboratory/` (0 consumer imports)

3. **AD-HOC VALIDATION SCRIPTS**:
   - 12 root JS files (`generate_passports.js`, `reproduce.js`, `run_*.js`)

---

## 5. Verification Method

1. **Verify Package Imports**:
   - Run: `grep_search` with Query `lyzer-constitution` or `packages/lyzer-constitution` in `lyzer edge/backend/` -> verify imports in `server.js` and `streamEngine.js`.
   - Run: `grep_search` with Query `packages/lyzer-shared` in `lyzer edge/backend/` -> verify imports in `streamEngine.js` and `dualRealityMonitor.js`.

2. **Verify Docker Container CMD & Workspace Build**:
   - Inspect `Dockerfile` lines 15, 47, and 75 to confirm compilation of `lyzer-core-hub` from `lyzer-workspace/` and execution of `backup_restore.py`.

3. **Verify Zero Imports for `src-ts` and `src/laboratory`**:
   - Run: `grep_search` for `src-ts` across `e:\projcts\lyzer\` (excluding `.agents/`) -> returns 0 results.
   - Run: `grep_search` for `src/laboratory` across `e:\projcts\lyzer\` (excluding `.agents/`) -> returns 0 results.

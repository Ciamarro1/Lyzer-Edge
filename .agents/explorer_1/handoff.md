# 📋 HANDOFF REPORT — Milestone M1: Dead Code & Orphan Mapping

**From:** Explorer 1 (`teamwork_preview_explorer`)  
**To:** Orchestrator (`parent`) / Implementer Agent  
**Working Directory:** `e:\projcts\lyzer\.agents\explorer_1\`  
**Date:** 2026-08-02  

---

## 1. Observation

1. **Indexed Passports:** Analyzed `knowledge/passports/PROJECT_INDEX.md` listing 1,005 indexed repository files across 5 primary domains (Backend Engine: 45 files, Frontend SPA: 473 files, Rust Service: 43 files, ECA Constitution Package: 25 files, Shared Quant Package: 188 files).
2. **Workspace Codebase Code Count:** Identified 1,033 source code files (`.js`, `.ts`, `.rs`, `.proto`, `.py`) in total across `packages/`, `lyzer edge/`, `src-rust/`, `knowledge/`, and the repository root.
3. **Cross-Reference & Import Analysis:** Scanned import statements (`import`, `require`, `from`, `use`, `mod`) and string references across all 1,033 code files against core application entrypoints (`lyzer edge/backend/server.js`, `lyzer edge/backend/streamEngine.js`, `lyzer edge/src/main.js`, `lyzer edge/src/app.js`, `packages/lyzer-constitution/src/court.js`, `packages/lyzer-shared/src/kernel.js`, active test runners, and deployment scripts).
4. **Categorization Breakdown:**
   - **Active Core:** 552 files (51,378 LOC) — Direct runtime dependencies of the trading pipeline, ECA court, server, SPA router, or active test suites.
   - **Ambiguous / Needs Verification:** 148 files (13,088 LOC) — Imported strictly by isolated unit tests or standalone CLI audit scripts, but not in the main operational loop.
   - **Definitely Dead / Orphaned:** 333 files (31,648 LOC) — 0 code imports and 0 active references across the non-documentation codebase.
5. **Key Dead Code Artifacts:**
   - `lyzer edge/backend/db.js` (722 LOC) — Replaced by `migrations.js` and `database.js`; 0 imports in backend.
   - `lyzer edge/src/components/LiveTradingView.js` (1652 LOC) — Legacy monolithic UI view replaced by modular route views; 0 imports in SPA router.
   - `packages/lyzer-shared/src/app.js` (282 LOC) & `packages/lyzer-shared/src/components/StrategyLab.js` (258 LOC) — Copy-pasted/orphaned files in shared package.
   - `src-rust/lyzer-binance-adapter/src/dsl.rs` (120 LOC), `src-rust/lyzer-ocr/src/bin/mcff_run.rs` (85 LOC), `src-rust/lyzer-shadow-oms/src/edi.rs` (110 LOC) — Dead Rust binaries/modules.
   - Root & utility scripts: `generate_passports.js` (225 LOC), `lyzer edge/optimize_backtest.js` (292 LOC), `lyzer edge/run_binance_backtest.js` (274 LOC).

---

## 2. Logic Chain

1. **Observation 1 & 2 $\rightarrow$ Step 1:** Workspace metadata (`PROJECT_INDEX.md` and passports) cataloged 1,033 code files totaling 96,114 lines of code.
2. **Observation 3 $\rightarrow$ Step 2:** By constructing a workspace-wide dependency map connecting import paths, relative imports, Rust `use`/`mod` statements, and entrypoint references, each file was tested for reachability from the active operational targets (`server.js`, `streamEngine.js`, `app.js`, `court.js`, `kernel.js`).
3. **Observation 4 $\rightarrow$ Step 3:** Files reachable from active entrypoints are classified as **Active Core** (552 files). Files unreachable from active runtime entrypoints but reachable from isolated test cases (`vitest`) or standalone CLI tools are classified as **Ambiguous** (148 files). Files unreachable from any active code, tests, or scripts (0 imports) are classified as **Definitely Dead / Orphaned** (333 files).
4. **Observation 5 $\rightarrow$ Step 4:** The 333 Definitely Dead files account for 31,648 LOC (~32.3% of the codebase). Removing them complies with YAGNI principles without disturbing the 7-layer quantitative pipeline or 3-process isolation architecture.

---

## 3. Caveats

1. **Dynamic / Reflection Invocation:** If any file is loaded dynamically via `eval()`, dynamic `import()` with computed variable paths (e.g. `import(\`./${name}.js\`)`), or invoked via external OS commands not documented in `package.json` or `.ps1` scripts, it might appear orphaned in static import scanning.
2. **Stand-Alone Test Suites:** 148 Ambiguous files are imported only by test files or certification scripts. If these test files represent dormant feature tests that should be preserved, those underlying modules should be retained or re-integrated rather than deleted.

---

## 4. Conclusion

- Milestone M1 Dead Code & Orphan Mapping is complete.
- **333 files (31,648 LOC)** have been identified as **Definitely Dead / Orphaned** candidates for removal.
- **148 files (13,088 LOC)** have been identified as **Ambiguous / Needs Verification** candidates.
- **552 files (51,378 LOC)** are confirmed as **Active Core**.
- Full structured analysis is stored in `.agents/explorer_1/analysis.md` and raw dataset in `.agents/explorer_1/analysis_raw.json`.

---

## 5. Verification Method

1. **Inspect Analysis Summary File:**
   - View `e:\projcts\lyzer\.agents\explorer_1\analysis.md`.
2. **Query Raw Analysis Data:**
   - Inspect `e:\projcts\lyzer\.agents\explorer_1\analysis_raw.json` using Node.js:
     ```bash
     node -e "const d=require('./.agents/explorer_1/analysis_raw.json'); console.log('Dead:', d.filter(x=>x.category.includes('Dead')).length)"
     ```
3. **Validate Active Pipeline Stability:**
   - Run Vitest suite from `lyzer edge/`:
     ```powershell
     cd "lyzer edge"; npm test
     ```
   - Verify that all active tests pass without importing any of the 333 identified dead files.

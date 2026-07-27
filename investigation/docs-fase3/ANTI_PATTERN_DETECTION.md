# Anti-Pattern Detection Report

**Date:** 2026-07-27  
**Scope:** 941 JS/TS files (~113,665 LOC) excluding node_modules, target, dist  
**Methodology:** Automated static analysis via PowerShell/grep heuristics

---

## 1. Summary by Anti-Pattern

| Anti-Pattern | Severity | Count | Worst Offender |
|---|---|---|---|
| **Super-God Module** (>500 lines) | 🔴 High | **23 files** | `LiveTradingView.js` (1,651 lines) |
| **God Class** (methods/properties) | 🔴 High | **89 methods** | `LiveTradingView.js` — 89 methods |
| **Copy-Paste Duplication** | 🔴 High | **3 identical `streamEngine.js`** | `v1_fast/`, `v2_deep/`, `root/` + `_archive/` copies |
| **console.log in "Production"** | 🟡 Medium | **44+** per file | `streamEngine.js` (44), `verify_*.js` test files (90) |
| **Dead Comments / Commented Code** | 🟡 Medium | **28 comment lines** | `streamEngine.js` (2.9% comment ratio, low-value) |
| **TODO/FIXME/XXX/HACK** | 🟡 Medium | **~50+ across src** | `attackRewardHacking.js` (20), `worker.js` (8) |
| **Magic Numbers** | 🟡 Medium | **~15+ identified** | `edgescore.js`, `streamEngine.js`, `liveDataIngestor.js` |
| **Inconsistent Naming** | 🟢 Low | **2 cases** | `ETH_HISTROLLER_MOCK` (SCREAMING_SNAKE mixed with camelCase) |
| **Function Too Long** | 🟡 Medium | **954 lines** | `streamEngine.js` — only 4 top-level methods |
| **Deep Nesting** | 🟢 Low | Minimal | 24-space indent found in `LiveTradingView.js` |
| **Dead Code in `_archive/`** | 🔴 High | **4+ stale copies** | `_archive/engine/stats.js`, `sml.js`, `edgescore.js`, `evDecompositionLab.js` |

---

## 2. Top 10 Code Smells Found

### Smell #1 — LiveTradingView.js God Component
- **File:** `lyzer edge/src/components/LiveTradingView.js` — **1,651 lines, 89 methods**
- **Description:** Single monolithic view component handling rendering, data fetching, trade logic, chart management, and UI state. Violates Single Responsibility Principle.
- **Recommendation:** Split into: `TradeTable`, `ChartPanel`, `OrderForm`, `PositionManager` sub-components. Use composition pattern.

### Smell #2 — Triplicated StreamEngine
- **Files:**
  - `lyzer edge/backend/streamEngine.js` (954 lines)
  - `lyzer edge/backend/providers/v1_fast/streamEngine.js` (366 lines)
  - `lyzer edge/backend/providers/v2_deep/streamEngine.js` (381 lines)
- **Description:** Three near-identical stream engine implementations with copy-pasted candle generation and execution logic. Heavy duplication of `Math.random()` simulation blocks.
- **Recommendation:** Extract a base `StreamEngine` class; let V1/V2 engines extend it, overriding only provider-specific signal logic.

### Smell #3 — _archive/ Dead Code Rot
- **Files:** `_archive/engine/stats.js` (586L), `sml.js` (385L), `edgescore.js` (329L), `evDecompositionLab.js` (543L)
- **Description:** Stale copies of engine files living alongside active duplicates in `lyzer edge/src/engine/`. Creates confusion — which is authoritative?
- **Recommendation:** Remove `_archive/` entirely (it's in git history). Or add a README explaining retention policy.

### Smell #4 — Duplicated DecisionStream/ZSpaceDashboard
- **Files:**
  - `lyzer edge/src/components/DecisionStream.js` (1,140L) ≈ `packages/lyzer-shared/src/components/DecisionStream.js` (1,140L)
  - Same pattern for `ZSpaceDashboard`, `queries.js`, `DecisionAnalytics.js`, `MonteCarloView.js`, etc.
- **Description:** Large components duplicated between app and shared package. Likely started in shared then copied to app for customization, but never reconciled.
- **Recommendation:** Use the npm workspace import path consistently; remove the app-local copies or re-export from shared.

### Smell #5 — console.log Firehose in streamEngine.js
- **File:** `lyzer edge/backend/streamEngine.js` — **44 console calls**
- **Description:** Production backend file logs every candle, every execution decision, every state transition. Causes noise and potential performance issues.
- **Recommendation:** Replace with structured logging (e.g., `pino` or `winston`) with severity levels. Keep debug logs behind `DEBUG` env flag.

### Smell #6 — Magic Number Sprawl
- **Files:** `edgescore.js:226` (`sampleSize < 1000`), `evSignalRedesign.js:144` (`emaDiff < 0.0015`), `liveDataIngestor.js:218` (`>= 60000`), `PerformanceMonitor.js:48` (`delta < 1000`), `LiveProvider.js:66` (`age > 5000`), `MarketEcologyEngine.js:30` (`spread < 0.0001`)
- **Description:** Hardcoded thresholds scattered across the codebase with no documentation of where values come from.
- **Recommendation:** Centralize all thresholds in config objects (see `.env.template` pattern). Name constants descriptively (`MIN_SAMPLE_SIZE`, `EMA_DIFF_WEAK_THRESHOLD`).

### Smell #7 — Test Files with Production-Grade console.log
- **Files:** `verify_stream.js` (90), `verify_mne.js` (46), `verify_robustness.js` (43), `verify_v03.js` (40)
- **Description:** Verification test files are the #1 source of console.log calls. While expected in test scripts, 90+ per file suggests debug-by-printf syndrome.
- **Recommendation:** Convert to proper assertions with descriptive messages. Use `vitest`'s built-in logging only for diagnostics.

### Smell #8 — TODO/JAZZ Debt in worker.js
- **File:** `lyzer edge/src/workers/worker.js` — 5 TODO stubs
- **Lines:** `// TODO: Implement actual Monte Carlo logic`, `// TODO: Implement actual Risk Analysis logic`, etc.
- **Description:** Worker file contains 4 stubbed-out analysis functions that return mock data. They appear to be placeholders from initial scaffolding.
- **Recommendation:** Either implement the functions or remove them. Placeholder code shipped to production is technical debt.

### Smell #9 — 22 `manifest.js` Files
- **Pattern:** 22 files named `manifest.js` across the widget system
- **Description:** Every widget has its own `manifest.js` with nearly identical structure. High boilerplate with low differentiation.
- **Recommendation:** Generate manifests from a single registry/config, or use a manifest factory pattern.

### Smell #10 — snake_case Function Name Inconsistency
- **File:** `lyzer edge/src/components/DecisionStream.js:705` — `function ETH_HISTROLLER_MOCK()`
- **Description:** SCREAMING_SNAKE_CASE function name mixed into a camelCase codebase. Only one of its kind.
- **Recommendation:** Rename to `mockEthHistrollerData` or similar.

---

## 3. Technical Debt Estimate

| Anti-Pattern | Estimated Effort | Strategy |
|---|---|---|
| **LiveTradingView God Component** | 16–24h | Refactor into 5 sub-components; one sprint |
| **Triplicated StreamEngine** | 8–12h | Extract base class, adapt V1/V2 |
| **_archive/ Dead Code** | 1h | `git rm -r _archive/` |
| **Duplicated Shared Components** | 16–20h | Reconcile app-local vs shared copies; pick one source of truth |
| **console.log in Production** | 4–6h | Replace with structured logger; per-file effort |
| **Magic Numbers** | 3–4h | Extract to config constants; grep-and-replace |
| **Test console.log Sprawl** | 2–3h | Convert to assertions |
| **TODO Stubs (worker.js)** | 8–16h | Implement or remove |
| **22 manifest.js Boilerplate** | 4–6h | Manifest factory pattern |
| **Naming Inconsistency** | 0.5h | One-liner rename |
| **Total Estimated Debt** | **~62–92 hours** | (~2–3 sprints) |

---

## 4. Quality Trend

| Indicator | Observation |
|---|---|
| **File Size Trend** | Newer files (`src/laboratory/`, `src/causal-*`) average 200–400 lines; Legacy files 500–1,651 lines → **improving** |
| **Archive Pattern** | `_archive/` directory with stale duplicates and active copies in `src/engine/` → **concerning** |
| **console.log in new vs old** | Newer code (`sdk/`, `causal-memory/`, `adaptive-evolution/`) has minimal console.log; legacy `backend/` and `tests/verification/` are heavy → **improving** |
| **Modularization** | New widget SDK with `CommandCenterRuntime`, `WidgetBase`, `manifest.js` pattern shows architectural maturity → **improving** |
| **Comment Quality** | Newer files have meaningful doc comments; old files have sparse/dead comments → **stable** |
| **Naming Conventions** | Mostly consistent camelCase; only 2 deviations found → **stable** |

**Overall Verdict: The codebase is on an improving trajectory.** Newer modules (SDK, causal engines, adaptive sandbox) follow modern patterns. The technical debt is concentrated in legacy files (`LiveTradingView.js`, `DecisionStream.js`, `streamEngine.js` triplication, `_archive/`). A targeted refactoring sprint focused on the top 5 smells would yield significant quality improvement.

---

*Generated by Anti-Pattern Detection Analyst — automated heuristic analysis, not a substitute for human review.*

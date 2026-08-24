# Handoff Report: Requirement R3 — Temporal Spatial Memory in SMC V1 Engine

## 1. Observation
1. **`packages/lyzer-shared/src/providers/v1_smc_ict.js` (`LiquidityReconstructionEngine`)**:
   - Line 12: `// Note: FVG/OB memory tracking is a future enhancement (see alpha_audit_report.md G8)`
   - Lines 27–49: Uses only a 4-candle slice (`prev3`, `prev2`, `prev1`, `current`). FVG detection only checks the immediate prior candle gap (`prev3.high < prev1.low && prev2.close > prev2.open`), with zero Order Block detection and zero persistent state between ticks.
2. **`packages/lyzer-shared/src/smc/liquidityEngine.js` (`LiquidityEngine`)**:
   - Lines 20–25: Fetches only the last 200 candles from `TimeframeManager` (`tfManager.getCandles('15m', 200, false)`).
   - Lines 69–123: Detects FVGs and OBs using EWMA GARCH(1,1) volatility threshold `k_sigma`.
   - Lines 237–260: Mitigates zones on price boundary penetration (`low <= lower_bound` or `high >= upper_bound`).
   - Line 258: Truncates historical zones: `this.historicalZones = this.historicalZones.slice(-200)`.
   - Line 265: Truncates returned zones: `this.zones = allZones.slice(-300)`.
3. **`lyzer edge/src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusPatternEngine.js`**:
   - Lines 19–21: Ring buffer of 200 candles (`this._candleHistory.slice(-200)`).
   - Lines 103–105: Hard truncation of stored FVGs (`this._fvgs = this._fvgs.slice(-this._maxStored)` where `_maxStored = 100`), dropping old unmitigated levels unconditionally.
4. **`lyzer edge/backend/streamEngine.js`**:
   - Lines 105, 660, 738, 752: Instantiates `this.v1 = new LiquidityReconstructionEngine()`, invokes `this.v1.reconstruct(mappedCandles)` every tick, and maps `v1Sig` into `providers.v1` for TruthKernel divergence evaluation and dynamic vector consensus (`weights.LIQUIDITY_ENGINE || 0.15`).
5. **Test Baseline Status**:
   - `npm.cmd test`: **137 passed (547 tests)**
   - `npm.cmd run test:verify`: **6 passed (37 tests)**
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`: **1 passed (126 tests)**

---

## 2. Logic Chain
1. **Observation 1 & 4** show that the primary V1 provider (`v1_smc_ict.js`) responsible for generating the SMC/ICT signal vector for the TruthKernel has zero memory retention and zero Order Block detection. If an institutional FVG or OB formed 10 or 100 bars ago, V1 loses awareness of it on the very next bar after formation.
2. **Observation 2 & 3** show that auxiliary engines (`LiquidityEngine` and `OpenMobiusPatternEngine`) implement FVG/OB detection, but they are bounded by narrow sliding windows (200 candles) and arbitrary array clipping (`.slice(-100)`). When price moves away from an institutional level (e.g. 300 bars of consolidation or trending), the level is evicted from memory.
3. When price subsequently returns to that institutional level hours or days later, the engine suffers from **institutional amnesia**: it cannot identify the level as an unmitigated FVG or OB mitigation zone, leading to missed high-probability reactions and distorted liquidity divergence scores.
4. To solve this, a dedicated, persistent **Temporal Spatial Memory Index** (`SpatialMemoryIndex`) must be integrated into the V1 SMC engine, allowing unmitigated levels to persist indefinitely across time until price interacts with and mitigates them.

---

## 3. Caveats
- **Memory Safety in Decades-Long Runs**: Unmitigated levels could theoretically accumulate if market trends monotonically in one direction without touching old levels. An institutional pruning/compaction rule (e.g., pruning levels $>50\%$ away and older than 60 days, or archiving to SQLite causal memory) should be configured as a failsafe.
- **Provider V1 Contract Compatibility**: `e2e_suite.test.js` tests `v1.reconstruct(mtfCandles)` using synthetic 5-candle arrays. The refactored `SpatialMemoryIndex` inside V1 must accept both single tick updates and synthetic historical candle arrays while preserving identical return signatures `{ signal, confidence, narrative, source }`.
- No source code changes were made during this survey phase (read-only investigation per protocol).

---

## 4. Conclusion
Requirement R3 is well-defined and structurally unblocked. The core root causes of institutional amnesia are:
1. Complete lack of state in `packages/lyzer-shared/src/providers/v1_smc_ict.js`.
2. Rigid 200-candle sliding window and array truncation in `packages/lyzer-shared/src/smc/liquidityEngine.js` and `OpenMobiusPatternEngine.js`.

The implementation phase (Milestone M3) must introduce a stateful `SpatialMemoryIndex` into `v1_smc_ict.js` / `liquidityEngine.js` that tracks the lifecycle of FVGs and OBs (Formed $\rightarrow$ Tested $\rightarrow$ Mitigated $\rightarrow$ Archived) without discarding unmitigated levels based on candle index or time decay.

---

## 5. Verification Method
1. **Inspect Analysis Report**:
   - View `c:\Users\WDAGUtilityAccount\Documents\Nova pasta\Lyzer-Edge\.agents\explorer_survey_2\analysis.md`
2. **Inspect Target Code Files**:
   - `packages/lyzer-shared/src/providers/v1_smc_ict.js` (lines 10–116)
   - `packages/lyzer-shared/src/smc/liquidityEngine.js` (lines 7–273)
   - `lyzer edge/src/components/commandCenter/sdk/evidence/openmobius/OpenMobiusPatternEngine.js` (lines 9–121)
3. **Execute Project Verification Commands**:
   - `npm.cmd test` (Unit/integration test suite)
   - `npm.cmd run test:verify` (Smoke tests)
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js` (E2E SMC test suite)

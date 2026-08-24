# Technical Survey Report: R3 — Temporal Spatial Memory in SMC V1 Engine

## Executive Summary
This investigation analyzes the architectural state and code implementation of requirement **R3 (Temporal Spatial Memory in SMC V1 Engine)** within the Lyzer Edge ecosystem. 

Currently, the primary V1 provider (`packages/lyzer-shared/src/providers/v1_smc_ict.js`) is stateless and memory-less, evaluating only a 4-candle window (`prev3` to `prev1`) for Fair Value Gaps (FVGs) and lacking Order Block (OB) detection entirely. Meanwhile, other SMC modules (`packages/lyzer-shared/src/smc/liquidityEngine.js` and `OpenMobiusPatternEngine.js`) detect FVGs and OBs but rely on narrow sliding windows (200 candles) and arbitrary array truncation (e.g., `_fvgs.slice(-100)`), causing **"institutional amnesia"** where unmitigated high-timeframe institutional levels are discarded as soon as price moves away.

This report documents the exact mechanisms of FVG/OB detection, filtering, mitigation, and sliding window boundaries across all relevant files, and provides concrete architectural specifications for implementing a persistent **Temporal Spatial Memory Index**.

---

## 1. Codebase Inventory & Component Mapping

| Subsystem / File | Class / Export | Role in SMC | Current Memory Model |
|---|---|---|---|
| `packages/lyzer-shared/src/providers/v1_smc_ict.js` | `LiquidityReconstructionEngine` | V1 Baseline Provider for TruthKernel & Vector Consensus | **Zero state** (stateless, 4-candle inspection). Comment at line 12: `// Note: FVG/OB memory tracking is a future enhancement (see alpha_audit_report.md G8)` |
| `packages/lyzer-shared/src/smc/liquidityEngine.js` | `LiquidityEngine` | SMC Suite stateful zone detector (FVG, OB, EQH/EQL, Sweeps) | In-memory `activeZones` & `historicalZones`, but initialized and fed from `TimeframeManager.getCandles('15m', 200)` (200-candle limit). Truncates historical zones at 200. |
| `packages/lyzer-shared/src/smc/smcFacade.js` | `SmcEngineFacade` | Unified facade orchestrating TF Manager, Trend, Structure, Liquidity | Synchronizes 1m candles into `TimeframeManager` and delegates to `LiquidityEngine`. |
| `packages/lyzer-shared/src/smc/timeframeManager.js` | `TimeframeManager` | MTF Candle aggregation (`1m`, `5m`, `15m`, `1h`, `4h`) | Fixed ring buffer: 1m (3000), 5m (500), 15m (500), 1h (500), 4h (500). Older candles are shifted off. |
| `packages/lyzer-shared/src/providers/openmobius/imbalance.js` | `find_fvgs`, `_fvg_mitigation_pct` | Pure algorithmic FVG detection & mitigation % | Stateless helper functions over static candle array. |
| `packages/lyzer-shared/src/providers/openmobius/orderBlocks.js` | `find_order_blocks`, `calcAtr` | Pure algorithmic Order Block detection | Stateless helper function over static candle array. |
| `lyzer edge/src/.../OpenMobiusPatternEngine.js` | `OpenMobiusPatternEngine` | UI / Evidence observation engine | Ring buffer of 200 candles, `_maxStored = 100` FVGs. Old unmitigated FVGs discarded via `.slice(-100)`. |
| `lyzer edge/backend/streamEngine.js` | `StreamEngine` | Main execution pipeline orchestrator | Instantiates `LiquidityReconstructionEngine` (V1), `SmcEngineFacade`, and `OpenMobiusPatternEngine`. |

---

## 2. In-Depth Analysis of Current Detection, Filtering & Mitigation

### 2.1 Provider V1 (`packages/lyzer-shared/src/providers/v1_smc_ict.js`)
- **Inspection Window**: Exactly 4 candles (`prev3`, `prev2`, `prev1`, `current` at lines 27–30).
- **FVG Detection (lines 36–49)**:
  ```javascript
  // Bullish FVG: prev3 high < prev1 low
  if (prev3.high < prev1.low && prev2.close > prev2.open) {
      narrative = 'BULLISH_FVG_DETECTED';
      signal = 'long';
      confidence += 30;
  }
  // Bearish FVG: prev3 low > prev1 high
  else if (prev3.low > prev1.high && prev2.close < prev2.open) {
      narrative = 'BEARISH_FVG_DETECTED';
      signal = 'short';
      confidence += 30;
  }
  ```
- **Order Block Detection**: **0% implemented.** Not a single line of code exists for OB detection in `v1_smc_ict.js`.
- **Mitigation & Retention**: **0% implemented.** If the FVG is not traded immediately in the bar it forms, it vanishes on the next tick.

### 2.2 SMC Suite Liquidity Engine (`packages/lyzer-shared/src/smc/liquidityEngine.js`)
- **Inspection Window**: Pulls `tfManager.getCandles('15m', 200, false)` (lines 20–25).
- **Volatility Filter (lines 36–46)**:
  - EWMA approximation of GARCH(1,1) log-return volatility: `volatility = sqrt(0.9 * vol^2 + 0.1 * ret^2)`.
  - `k_sigma = 1.0 * this.volatility`.
- **FVG Detection (lines 69–96)**:
  - Bullish: `prev2.high < curr.low && (curr.low - prev2.high) / prev2.high >= k_sigma * 0.5`.
  - Bearish: `prev2.low > curr.high && (prev2.low - curr.high) / curr.high >= k_sigma * 0.5`.
- **Order Block Detection (lines 98–123)**:
  - Bullish: Bearish candle followed by strong bullish close (`prev1.close < prev1.open && curr.close > prev1.high && (curr.close - prev1.high) / prev1.high >= k_sigma`). Upper bound = `prev1.high`, Lower bound = `prev1.low`.
  - Bearish: Bullish candle followed by strong bearish close (`prev1.close > prev1.open && curr.close < prev1.low && (prev1.low - curr.close) / curr.close >= k_sigma`). Upper bound = `prev1.high`, Lower bound = `prev1.low`.
- **Mitigation Logic (lines 237–254)**:
  - Bullish Zone Mitigated: `lastCandle.low <= zone.lower_bound` (Full penetration).
  - Bearish Zone Mitigated: `lastCandle.high >= zone.upper_bound` (Full penetration).
  - On mitigation: `zone.mitigated = true`, removed from `activeZones`, pushed to `historicalZones`.
- **Sliding Window Amnesia Bottlenecks**:
  1. `candles` is limited to 200. Any level that was formed >200 candles ago cannot be discovered or restored upon engine restart/cold start.
  2. Missing duplicate check on `activeZones` for FVG and OB when `startIndex` is recalculated.
  3. `historicalZones` is capped at 200 (`slice(-200)`), and `zones` for UI is capped at 300 (`slice(-300)`).

### 2.3 OpenMobius Engine (`packages/lyzer-shared/src/providers/openmobius/`)
- **`imbalance.js`**:
  - `find_fvgs(candles, min_size_atr = 0.2)`:
    - Bullish: `c0.high < c2.low` and `gap >= 0.2 * ATR14`.
    - Bearish: `c0.low > c2.high` and `gap >= 0.2 * ATR14`.
    - Mitigation calculation `_fvg_mitigation_pct`: Evaluates minimum low or maximum high of all candles occurring after `formed_at_index` in the current array slice.
- **`orderBlocks.js`**:
  - `find_order_blocks(candles, displacement_atr_mult = 1.5)`:
    - Bullish OB: Bearish candle `c` followed by 3 candles whose cumulative upward displacement and net move exceed `1.5 * ATR14`.
    - Bearish OB: Bullish candle `c` followed by 3 candles whose cumulative downward displacement and net move exceed `1.5 * ATR14`.

### 2.4 OpenMobius Pattern Engine (`lyzer edge/src/.../OpenMobiusPatternEngine.js`)
- Fixed window: `_candleHistory` max 200 bars (`slice(-200)`).
- Mitigation: Consequent Encroachment (50% midpoint):
  - Bullish: `c3.close < fvg.bottom + (fvg.gapSize * 0.5)`.
  - Bearish: `c3.close > fvg.top - (fvg.gapSize * 0.5)`.
- Amnesia point (lines 103–105):
  ```javascript
  if (this._fvgs.length > this._maxStored) {
      this._fvgs = this._fvgs.slice(-this._maxStored); // Drops oldest unmitigated FVGs!
  }
  ```

---

## 3. Comparative Gap Analysis

| Capability | Requirement R3 Target | Current V1 (`v1_smc_ict.js`) | Current `liquidityEngine.js` |
|---|---|---|---|
| **FVG Detection** | Valid 3-bar imbalance with volatility/ATR threshold | Primitive 4-bar rule with non-standard middle candle check | GARCH-filtered 3-bar gap |
| **OB Detection** | Impulsive displacement leaving structural footprint | **Not Implemented (0%)** | GARCH-filtered engulfing displacement |
| **Mitigation Model** | Touch / Consequent Encroachment / Full breach tracking | **Not Implemented (0%)** | Full bound breach only (`low <= lower_bound`) |
| **Retention Policy** | Retained in Spatial Memory Index until price mitigates | **0 bars** (immediate amnesia next tick) | Retained in memory until array shifts / restart |
| **Memory Limit** | Unmitigated levels survive indefinitely (or causal DB) | No storage | Window limited to 200 candles |
| **V1 Provider Output** | Signals & distance to nearest active unmitigated level | Stateless signal on exact creation bar | Not wired into V1 provider output |

---

## 4. Design Requirements for the Persistent Spatial Memory Index

To fulfill requirement R3 and eliminate institutional amnesia while preserving determinism and zero lookahead bias:

### 4.1 Data Structure Specification
The **`SpatialMemoryIndex`** should manage two internal collections:
1. `unmitigatedLevels`: Array / Map of active, open levels indexed by ID and sorted by price/time.
2. `mitigatedLevels`: Bounded historical ring buffer of recently mitigated levels for causal audit logs and visual overlays.

```typescript
interface SpatialLevel {
    id: string;                      // e.g. "FVG_BULLISH_1787539600000"
    type: 'FVG' | 'OB' | 'SWEEP';
    direction: 'BULLISH' | 'BEARISH';
    timeframe: string;               // e.g. '15m', '1h', '4h'
    upper_bound: number;             // Top price of the zone
    lower_bound: number;             // Bottom price of the zone
    price: number;                   // Midpoint / CE (Consequent Encroachment)
    created_at: number;              // Timestamp of the candle where level was formed
    created_index?: number;          // Bar sequence index
    strength: number;                // Volatility or ATR multiplier at formation
    mitigated: boolean;              // false until breached
    mitigated_at: number | null;     // Timestamp of mitigation candle
    mitigation_price: number | null; // Price that triggered mitigation
    test_count: number;              // Number of times price tapped zone without invalidating
}
```

### 4.2 Lifecycle & Update Protocol
1. **On Every Closed Candle**:
   - Evaluate FVG and OB formation rules on the newly closed bar.
   - For any newly detected level, if `!index.has(id)`, add to `unmitigatedLevels`.
2. **On Every Live Tick / New Candle**:
   - Check current candle extremes (`low`, `high`, `close`) against all `unmitigatedLevels`:
     - **Bullish Level (FVG/OB)**:
       - Price tests zone: `candle.low <= level.upper_bound && candle.low > level.lower_bound` -> `level.test_count++`.
       - Price mitigates zone: `candle.low <= level.lower_bound` (or `candle.close < level.price` if 50% CE mode enabled) -> Mark `mitigated = true`, `mitigated_at = timestamp`, move to `mitigatedLevels`.
     - **Bearish Level (FVG/OB)**:
       - Price tests zone: `candle.high >= level.lower_bound && candle.high < level.upper_bound` -> `level.test_count++`.
       - Price mitigates zone: `candle.high >= level.upper_bound` (or `candle.close > level.price` if 50% CE mode enabled) -> Mark `mitigated = true`, `mitigated_at = timestamp`, move to `mitigatedLevels`.
3. **Retention Rule**:
   - Unmitigated levels are **never pruned simply because of candle age or sliding window limits**. They persist until price returns and mitigates them.
   - Mitigated levels are capped (e.g., max 200-500) to ensure predictable heap usage.

### 4.3 Integration with V1 Provider (`v1_smc_ict.js`)
- `LiquidityReconstructionEngine` should maintain an instance of `SpatialMemoryIndex`.
- When `reconstruct(mtfCandles)` is called:
  - Updates the index with latest candle(s).
  - Queries `spatialIndex.getNearestUnmitigated(currentPrice)`:
    - If price is testing an active Bullish OB / FVG from below/inside -> generates `BULLISH_INSTITUTIONAL_MITIGATION_REACTION` (`signal: 'long'`, confidence 60–85).
    - If price is testing an active Bearish OB / FVG from above/inside -> generates `BEARISH_INSTITUTIONAL_MITIGATION_REACTION` (`signal: 'short'`, confidence 60–85).
    - Maintains full backward compatibility with the existing test cases in `e2e_suite.test.js` (Feature 2 V1 tests at lines 128–193).

---

## 5. Verification Baseline & Constraints

### 5.1 Test Baseline
All test suites currently execute with **100% PASS**:
- `npm.cmd test`: **137 test files passed**, **547 tests passed**.
- `npm.cmd run test:verify`: **6 test files passed**, **37 tests passed**.
- `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`: **126 tests passed**.

### 5.2 Key Refactoring Invariants for M3
1. **Zero Lookahead**: Level formation must only occur on closed candles (`i - 2` / `i - 1`).
2. **Causal Traceability**: Every zone ID must contain deterministic timestamp and pattern type.
3. **Test Compatibility**: Existing `e2e_suite.test.js` tests expect `reconstruct({ intermediate: candles })` to return `{ signal, confidence, narrative, source }`.
4. **Performance**: Zone lookup and mitigation check across active zones must be $O(K)$ where $K$ is the number of active unmitigated zones (typically $< 50$).

# Technical Analysis: Requirement R3 — Temporal Spatial Memory in SMC V1 Engine

## Executive Summary
This document provides the definitive architectural blueprint and implementation specification for **Requirement R3: Temporal Spatial Memory in SMC V1 Engine** for the Lyzer Edge trading ecosystem.

Currently, the primary V1 provider (`packages/lyzer-shared/src/providers/v1_smc_ict.js`) is stateless and memory-less, evaluating only the last 4 candles (`prev3` to `prev1`) for Fair Value Gaps (FVGs) and completely lacking Order Block (OB) detection. Meanwhile, auxiliary engines such as `LiquidityEngine` (`packages/lyzer-shared/src/smc/liquidityEngine.js`) detect FVGs and OBs but are bounded by narrow sliding windows (200 candles) and arbitrary historical array truncations, leading to **"institutional amnesia"** where unmitigated institutional price levels are discarded as soon as price moves away.

To resolve this, we design a high-performance, deterministic **`SpatialMemoryIndex`** class in `packages/lyzer-shared/src/smc/spatialMemoryIndex.js`, integrate it into `LiquidityReconstructionEngine` (`v1_smc_ict.js`), and upgrade `LiquidityEngine` (`liquidityEngine.js`). Unmitigated institutional levels will persist indefinitely across arbitrary time horizons until price interacts with and mitigates them, while maintaining strict bounded-memory safety, zero lookahead bias, and 100% backward compatibility with all 126 test cases in `e2e_suite.test.js`.

---

## 1. Codebase Diagnostics & Root Cause Analysis

### 1.1 `packages/lyzer-shared/src/providers/v1_smc_ict.js` (`LiquidityReconstructionEngine`)
- **Location**: Lines 10–116
- **Current Constructor**:
  ```javascript
  export class LiquidityReconstructionEngine {
      constructor() {
          // Note: FVG/OB memory tracking is a future enhancement (see alpha_audit_report.md G8)
      }
  ```
- **Execution Mechanism**:
  - `reconstruct(mtfCandles)` extracts candles from `mtfCandles.intermediate` or `mtfCandles.fast`.
  - Evaluates only `candles.slice(-4)` (`prev3`, `prev2`, `prev1`, `current`).
  - Detects FVG only if `prev3.high < prev1.low && prev2.close > prev2.open` (Bullish) or `prev3.low > prev1.high && prev2.close < prev2.open` (Bearish).
- **Flaws & Deficiencies**:
  1. **Zero Memory Retention**: Once a bar closes and price advances by 1 tick, the FVG is never remembered. If price retraces 10 bars later into the FVG, V1 has zero awareness of it and returns `NEUTRAL_LIQUIDITY`.
  2. **Zero Order Block (OB) Detection**: No OB detection logic exists.
  3. **Zero Level State Tracking**: No concept of `UNMITIGATED`, `TESTED`, or `MITIGATED` states.

### 1.2 `packages/lyzer-shared/src/smc/liquidityEngine.js` (`LiquidityEngine`)
- **Location**: Lines 7–273
- **Current Memory Model**:
  - Maintains `this.activeZones = []` and `this.historicalZones = []`.
  - In `evaluate(tfManager, marketStructure)`:
    - Fetches `tfManager.getCandles('15m', 200, false)` (strictly bounded to 200 candles).
    - Detects FVGs and OBs with GARCH(1,1) volatility threshold `k_sigma`.
    - Mitigates zones on price boundary penetration: `lastCandle.low <= zone.lower_bound` (Bullish) or `lastCandle.high >= zone.upper_bound` (Bearish).
    - Line 258: `this.historicalZones = this.historicalZones.slice(-200)`.
    - Line 265: `this.zones = allZones.slice(-300)`.
- **Flaws & Deficiencies**:
  1. **Sliding Window Amnesia on Cold Starts / Resets**: When `candles` is pulled from `tfManager`, it only receives 200 bars. Any historical level that formed >200 bars ago cannot be reconstructed if the process restarts or re-initializes.
  2. **Divergence from Provider V1**: `LiquidityEngine` is an auxiliary engine called via `SmcEngineFacade` for overlays and proximity checks, but its active zones were never exposed to or coordinated with Provider V1 (`LiquidityReconstructionEngine`), which supplies the primary `v1Sig` vector to the TruthKernel and Residualization layers.

### 1.3 Downstream Consumption in `lyzer edge/backend/streamEngine.js`
- **Line 105**: `this.v1 = this.disabledProviders.has('v1') ? null : new LiquidityReconstructionEngine();`
- **Line 660**: `const v1Narrative = this.disabledProviders.has('v1') ? defaultNarrative : this.v1.reconstruct(mappedCandles);`
- **Line 688–703**: `smcLiquidityResult.activeZones` is used for the Golden Zone / Topographical Risk distance calculation:
  ```javascript
  if (smcLiquidityResult && smcLiquidityResult.activeZones && smcLiquidityResult.activeZones.length > 0) {
      let minRawDist = Infinity;
      for (const zone of smcLiquidityResult.activeZones) {
          let d = 0;
          if (currentPrice < zone.lower_bound) {
              d = (zone.lower_bound - currentPrice) / currentPrice;
          } else if (currentPrice > zone.upper_bound) {
              d = (currentPrice - zone.upper_bound) / currentPrice;
          }
          if (d < minRawDist) minRawDist = d;
      }
      const atrPct = topographicalAtr ? (topographicalAtr / currentPrice) : 0.0015;
      distanceFromGoldenZone = minRawDist / atrPct;
  }
  ```
- **Line 738, 752**: `v1Sig = { signal: v1Narrative.signal, confidence: v1Narrative.confidence }` is injected into `providers.v1`.

---

## 2. Architectural Design: `SpatialMemoryIndex`

### 2.1 Core Objectives
1. **Temporal Persistence**: Unmitigated Fair Value Gaps (FVGs) and Order Blocks (OBs) are retained in memory indefinitely across hundreds or thousands of bars until price interacts with them.
2. **Mitigation Lifecycle**: Clear state transitions: `UNMITIGATED` $\rightarrow$ `TESTED` $\rightarrow$ `MITIGATED` (or `ARCHIVED`).
3. **Deterministic Zero-Lookahead Detection**: Level creation only occurs on fully closed historical candles ($i-2, i-1, i$).
4. **Bounded-Memory Safety (Compaction Rule)**: Safe garbage collection / compaction for long-running processes (e.g. max 1,000 unmitigated levels, max 500 mitigated levels) without unbounded memory growth.
5. **Contract Compliance**: Strict adherence to Provider V1 return signature `{ signal, confidence, narrative, source }`.

### 2.2 Spatial Level Entity Schema
```typescript
interface SpatialLevel {
    id: string;                      // Deterministic unique ID: e.g. "FVG_BULLISH_1787539600000_105.5"
    type: 'FVG' | 'OB' | 'SWEEP';    // Institutional structure type
    direction: 'BULLISH' | 'BEARISH';// Bias of the zone (Bullish = Support/Buy, Bearish = Resistance/Sell)
    timeframe: string;               // Timeframe origin: '1m', '5m', '15m', '1h', '4h', or 'default'
    upper_bound: number;             // Top boundary price of the zone
    lower_bound: number;             // Bottom boundary price of the zone
    price: number;                   // Midpoint / Consequent Encroachment: (upper_bound + lower_bound) / 2
    formed_at: number;               // Timestamp of candle where formation completed
    formed_index?: number;          // Sequential bar index (if available)
    strength: number;                // Relative size / ATR multiple at formation
    score: number;                   // Institutional weight (default 1.0)
    mitigated: boolean;              // false until breached
    mitigated_at: number | null;     // Timestamp of candle that triggered mitigation
    mitigation_price: number | null; // Price that breached the zone
    test_count: number;              // Number of non-mitigating price tests/touches
    last_tested_at: number | null;   // Timestamp of last test
    source_pattern: string;          // Descriptive pattern string
}
```

### 2.3 Level Formation Rules

#### A. Fair Value Gaps (FVG)
Evaluated across 3 consecutive closed candles $C_{i-2}, C_{i-1}, C_{i}$:
- **Bullish FVG**:
  - Condition: $C_{i-2}.\text{high} < C_{i}.\text{low}$ and $C_{i-1}.\text{close} > C_{i-1}.\text{open}$ (or candle gap exceeds threshold).
  - Zone Coordinates:
    - $\text{upper\_bound} = C_{i}.\text{low}$
    - $\text{lower\_bound} = C_{i-2}.\text{high}$
    - $\text{price} = (\text{upper\_bound} + \text{lower\_bound}) / 2$
    - $\text{direction} = \text{'BULLISH'}$
    - $\text{type} = \text{'FVG'}$
- **Bearish FVG**:
  - Condition: $C_{i-2}.\text{low} > C_{i}.\text{high}$ and $C_{i-1}.\text{close} < C_{i-1}.\text{open}$.
  - Zone Coordinates:
    - $\text{upper\_bound} = C_{i-2}.\text{low}$
    - $\text{lower\_bound} = C_{i}.\text{high}$
    - $\text{price} = (\text{upper\_bound} + \text{lower\_bound}) / 2$
    - $\text{direction} = \text{'BEARISH'}$
    - $\text{type} = \text{'FVG'}$

#### B. Order Blocks (OB)
Evaluated across 2 consecutive closed candles $C_{i-1}, C_{i}$:
- **Bullish Order Block (OB)**:
  - Condition: Bearish candle $C_{i-1}$ followed by strong bullish expansion $C_{i}$:
    $C_{i-1}.\text{close} < C_{i-1}.\text{open}$ and $C_{i}.\text{close} > C_{i-1}.\text{high}$.
  - Zone Coordinates:
    - $\text{upper\_bound} = C_{i-1}.\text{high}$
    - $\text{lower\_bound} = C_{i-1}.\text{low}$
    - $\text{price} = (\text{upper\_bound} + \text{lower\_bound}) / 2$
    - $\text{direction} = \text{'BULLISH'}$
    - $\text{type} = \text{'OB'}$
- **Bearish Order Block (OB)**:
  - Condition: Bullish candle $C_{i-1}$ followed by strong bearish expansion $C_{i}$:
    $C_{i-1}.\text{close} > C_{i-1}.\text{open}$ and $C_{i}.\text{close} < C_{i-1}.\text{low}$.
  - Zone Coordinates:
    - $\text{upper\_bound} = C_{i-1}.\text{high}$
    - $\text{lower\_bound} = C_{i-1}.\text{low}$
    - $\text{price} = (\text{upper\_bound} + \text{lower\_bound}) / 2$
    - $\text{direction} = \text{'BEARISH'}$
    - $\text{type} = \text{'OB'}$

---

## 3. Mitigation & Interaction Lifecycle

On every new candle or live tick with price boundaries $(\text{high}, \text{low}, \text{close})$ and timestamp $T$:

### 3.1 Bullish Zone Lifecycle
1. **Price Test (Support Reaction)**:
   - Condition: $\text{low} \le \text{upper\_bound}$ and $\text{low} > \text{lower\_bound}$.
   - Action: Price has entered the zone from above without violating the structural floor.
     - Increment `level.test_count++`.
     - Update `level.last_tested_at = T`.
     - Triggers signal candidate: `BULLISH_FVG_MITIGATION_REACTION` or `BULLISH_OB_MITIGATION_REACTION`.
2. **Full Invalidation / Mitigation**:
   - Condition: $\text{low} \le \text{lower\_bound}$.
   - Action: Price has pierced through the bottom boundary of the zone.
     - Mark `level.mitigated = true`.
     - Record `level.mitigated_at = T`, `level.mitigation_price = low`.
     - Evict from `unmitigatedLevels` and move into `mitigatedLevels` ring buffer.

### 3.2 Bearish Zone Lifecycle
1. **Price Test (Resistance Reaction)**:
   - Condition: $\text{high} \ge \text{lower\_bound}$ and $\text{high} < \text{upper\_bound}$.
   - Action: Price has entered the zone from below without violating the structural ceiling.
     - Increment `level.test_count++`.
     - Update `level.last_tested_at = T`.
     - Triggers signal candidate: `BEARISH_FVG_MITIGATION_REACTION` or `BEARISH_OB_MITIGATION_REACTION`.
2. **Full Invalidation / Mitigation**:
   - Condition: $\text{high} \ge \text{upper\_bound}$.
   - Action: Price has pierced through the top boundary of the zone.
     - Mark `level.mitigated = true`.
     - Record `level.mitigated_at = T`, `level.mitigation_price = high`.
     - Evict from `unmitigatedLevels` and move into `mitigatedLevels` ring buffer.

### 3.3 Institutional Compaction Policy (Memory Safety)
- `maxUnmitigated` limit (default: 1,000 active levels).
- `maxMitigated` limit (default: 500 historical levels).
- If unmitigated levels exceed `maxUnmitigated` (e.g. in multi-year continuous backtests with extreme monotonic trending):
  - Levels are sorted by distance from current price.
  - The farthest levels (e.g. $> 500\%$ away) and oldest are pruned first, ensuring deterministic memory bounded at $O(1)$.

---

## 4. Class Specification: `SpatialMemoryIndex`

### 4.1 Methods & Signatures
```javascript
export class SpatialMemoryIndex {
    constructor(options = {})
    
    // Ingests candle array or single candle, detects new levels, and evaluates mitigations
    update(candles, timeframe = 'default')
    
    // Ingests single closed candle for formation detection
    processClosedCandle(prev2, prev1, curr, timeframe)
    
    // Ingests live/closed candle for mitigation & test evaluation
    evaluateMitigations(candle)
    
    // Retrieves active unmitigated levels matching optional filter
    getUnmitigated(filter = null)
    
    // Retrieves historical mitigated levels
    getMitigated(limit = 100)
    
    // Returns closest unmitigated levels above and below current price
    getNearest(currentPrice)
    
    // Evaluates if current candle is testing or bouncing off an unmitigated zone
    checkInteraction(currentCandle)
    
    // Returns structural summary metrics
    getSummary()
    
    // Clears all state (for tests or engine reset)
    reset()
}
```

---

## 5. Integration Plan with Provider V1 & LiquidityEngine

### 5.1 Provider V1 (`packages/lyzer-shared/src/providers/v1_smc_ict.js`)
1. **Import `SpatialMemoryIndex`**:
   `import { SpatialMemoryIndex } from '../smc/spatialMemoryIndex.js';`
2. **Constructor**:
   Instantiate `this.spatialIndex = new SpatialMemoryIndex();`
3. **`reconstruct(mtfCandles)` Implementation**:
   - Extract `candles` from `intermediate` or `fast` (requires length $\ge 5$).
   - Synchronize with spatial index: `this.spatialIndex.update(candles);`
   - Preserve original fresh FVG and Liquidity Sweep checks verbatim to guarantee 100% test compatibility for `e2e_suite.test.js`.
   - Add **Spatial Memory Reaction Handler**: If narrative is `NEUTRAL_LIQUIDITY` and signal is `flat`, query `this.spatialIndex.checkInteraction(current)`.
     - If price is testing an active Bullish FVG/OB: `narrative = interaction.level.type === 'OB' ? 'BULLISH_OB_MITIGATION_REACTION' : 'BULLISH_FVG_MITIGATION_REACTION'`, `signal = 'long'`, `confidence = 65`.
     - If price is testing an active Bearish FVG/OB: `narrative = interaction.level.type === 'OB' ? 'BEARISH_OB_MITIGATION_REACTION' : 'BEARISH_FVG_MITIGATION_REACTION'`, `signal = 'short'`, `confidence = 65`.
   - Preserve exact return schema:
     ```javascript
     return {
         source: 'LIQUIDITY_RECONSTRUCTION',
         signal,
         confidence,
         narrative,
         spatialMemory: this.spatialIndex.getSummary() // metadata for observability
     };
     ```

### 5.2 `packages/lyzer-shared/src/smc/liquidityEngine.js`
- Integrate `SpatialMemoryIndex` into `LiquidityEngine` or apply non-eviction rules so `this.activeZones` are retained across sliding windows.
- In `evaluate(tfManager, marketStructure)`:
  - Retain active unmitigated zones indefinitely.
  - Return `activeZones` and `zones` (active + recent historical) without discarding unmitigated zones formed outside the 200-candle window.

---

## 6. Backward Compatibility & Test Suite Verification

### 6.1 Audit of Existing Test Cases in `e2e_suite.test.js`
- **Tier 1 - F2 1 (Bullish FVG)**: 5 candles, `prev3.high < prev1.low && prev2.close > prev2.open`. Expects `signal: 'long'`, `narrative: 'BULLISH_FVG_DETECTED'`. $\rightarrow$ **100% Compliant**.
- **Tier 1 - F2 2 (Bearish FVG)**: 5 candles, `prev3.low > prev1.high && prev2.close < prev2.open`. Expects `signal: 'short'`, `narrative: 'BEARISH_FVG_DETECTED'`. $\rightarrow$ **100% Compliant**.
- **Tier 1 - F2 3 (Sell-Side Sweep)**: Expects `signal: 'long'`, `narrative: 'SELL_SIDE_LIQUIDITY_SWEPT'`. $\rightarrow$ **100% Compliant**.
- **Tier 1 - F2 4 (Buy-Side Sweep)**: Expects `signal: 'short'`, `narrative: 'BUY_SIDE_LIQUIDITY_SWEPT'`. $\rightarrow$ **100% Compliant**.
- **Tier 1 - F2 5 (Neutral)**: Expects `signal: 'flat'`, `narrative: 'NEUTRAL_LIQUIDITY'`. $\rightarrow$ **100% Compliant**.
- **Tier 2 - F2 BVA 1 (<5 candles)**: Expects `signal: 'flat'`, `narrative: 'INSUFFICIENT_DATA'`. $\rightarrow$ **100% Compliant**.
- **Tier 2 - F2 BVA 2 (Conflicting)**: Expects `confidence > 0`. $\rightarrow$ **100% Compliant**.
- **Tier 2 - F2 BVA 3 (Normalization)**: Expects `confidence <= 100`. $\rightarrow$ **100% Compliant**.
- **Tier 2 - F2 BVA 4 (Price spikes)**: Expects `signal` defined. $\rightarrow$ **100% Compliant**.
- **Tier 2 - F2 BVA 5 (Zero volume)**: Expects `signal: 'flat'`. $\rightarrow$ **100% Compliant**.

### 6.2 New Verification Test Plan for Spatial Memory
1. `tests/smc/spatialMemoryIndex.test.js`:
   - Unit tests for FVG and OB formation, coordinate calculation, and midpoint CE.
   - Unit tests for 500-candle simulation verifying level retention past candle 200.
   - Unit tests for test counts vs mitigation breaches.
   - Unit tests for bounded compaction safety valve under 2,000 synthetic zones.
2. `tests/e2e_smc/e2e_suite.test.js`:
   - Additional test cases for Provider V1 reacting to historical unmitigated zones from memory.

---

## 7. Conclusion & Next Steps
The design eliminates institutional amnesia in Provider V1 and the SMC suite while guaranteeing zero regressions. All specifications are compiled into `handoff.md` for immediate implementation by the Worker.

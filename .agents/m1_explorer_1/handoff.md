# Milestone 1 (R1: Zero-Allocation in v8_openmobius.js) — Handoff Report

## 1. Observation
- **Target File 1**: `packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js`
  - Lines 24–27:
    ```javascript
    const processedCandles = candles.map(c => ({
        ...c,
        is_bullish: c.close >= c.open
    }));
    ```
    Creates a new array and copies every candle object on each tick, allocating 500+ objects per cycle.
  - Lines 29–38: Sub-routines receive `processedCandles` instead of the original `candles` array.
  - Lines 44–46: Bias detection checks `lastEvent.type === "BOS" || lastEvent.type === "CHoCH"`, while `structure.js` emits `bullish_bos`, `bearish_bos`, `bullish_choch`, `bearish_choch`.

- **Target File 2**: `packages/lyzer-shared/src/providers/openmobius/imbalance.js`
  - Lines 9–25 (`calc_atr`): Allocates `trs = []`, pushes `N - 1` items, calls `trs.slice(-period)`, and `.reduce()`.
  - Lines 32–55 (`_fvg_mitigation_pct`): Calls `candles.slice(formed_at + 1)`, `.map(c => c.low)` / `.map(c => c.high)`, and `Math.min(...spread)` / `Math.max(...spread)`.
  - Line 122 (`find_displacements`): `direction: c.is_bullish ? "bullish" : "bearish"`. Lacks fallback when `c.is_bullish` is undefined.
  - Lines 140–153 (`find_volume_anomalies`): Loops from `lookback` to `n`, allocating `candles.slice(i - lookback, i).map(c => c.volume)` on every bar iteration (up to 480 array allocations per tick), and line 152 lacks `is_bullish` fallback.

- **Target File 3**: `packages/lyzer-shared/src/providers/openmobius/orderBlocks.js`
  - Lines 3–16 (`calcAtr`): Allocates `trs = []`, `.slice(-period)`, and `.reduce()`.
  - Line 31: `const is_bullish = c.close >= c.open;` does not utilize pre-tagged `c.is_bullish`.
  - Line 33: `const next3 = candles.slice(i + 1, i + 4);` allocates a 3-element array on every bar `i` from `0` to `n - 4` (~496 slice allocations per tick).

- **Target File 4**: `packages/lyzer-shared/src/providers/openmobius/liquidity.js`
  - Lines 5–11 (`find_sweeps`): Calls `swings.filter(...).map(...)` twice on each tick, allocating 4 intermediate arrays.

- **Target File 5**: `lyzer edge/backend/openMobiusShadow.js`
  - Lines 103–111: Correctly pre-tags `is_bullish: candle.close >= candle.open` when candles enter `_candleHistory`.

- **Baseline Test Execution**:
  - `npm.cmd test` in `lyzer edge/`: 137 test files passed (547 tests passed, 102 skipped).
  - `npm.cmd run test:verify` in `lyzer edge/`: 6 passed (37 tests passed).
  - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js` in `lyzer edge/`: 126 tests passed.
  - `node packages/lyzer-shared/src/providers/openmobius/tests/parity_tester.js`: 100.00% match across trending, ranging, and edge cases.
  - `node packages/lyzer-shared/src/providers/openmobius/tests/adversarial_parity_tester.js`: 100.00% match across boundary fixtures and causality preservation tests.

---

## 2. Logic Chain
1. Removing `const processedCandles = candles.map(...)` in `v8_openmobius.js` eliminates the primary heap allocation hotspot (~500 objects + 1 array per tick).
2. Passing raw `candles` directly requires downstream modules to safely resolve candle bullishness without mutating input objects or allocating new objects.
3. Implementing property accessors with zero-allocation fallbacks `const isBullish = c.is_bullish ?? (c.close >= c.open);` in `find_displacements`, `find_volume_anomalies`, and `find_order_blocks` guarantees full compatibility whether candles are pre-tagged (as in `openMobiusShadow.js`) or raw arrays (as in direct caller tests).
4. Replacing `calc_atr` / `calcAtr` with direct indexing of the last `period` elements eliminates `trs` array creation, slice allocation, and reduce overhead while computing the exact mathematical Average True Range.
5. Replacing `_fvg_mitigation_pct` with an indexed `for` loop eliminates `candles.slice()`, `.map()`, and `Math.min/max` argument spreading while producing bit-for-bit identical mitigation percentages.
6. Replacing `find_volume_anomalies` with a sliding window accumulator converts `O(N * lookback)` with `N` array allocations into `O(N)` with zero array allocations.
7. Replacing `next3 = candles.slice(i + 1, i + 4)` in `find_order_blocks` with direct indexing `candles[i+1]`, `candles[i+2]`, `candles[i+3]` eliminates ~500 array slice allocations per tick.
8. Replacing `swings.filter().map()` in `find_sweeps` with an inline check eliminates 4 intermediate arrays per tick.

---

## 3. Caveats
- No changes should be made to `OpenMobiusPatternEngine.js` (the legacy engine used for CC evidence), as requested in ADRs and architectural contracts.
- Memory mutation of input candle objects is strictly avoided (we do not write `c.is_bullish = ...` inside `v8_openmobius.js` to preserve pure idempotency). Pre-tagging occurs at ingestion buffers (`openMobiusShadow.js`), and read fallbacks handle untagged inputs.

---

## 4. Conclusion & Concrete Worker Action Plan

The Worker for Milestone 1 should apply the following modifications:

1. **`packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js`**:
   - Remove lines 24–27 (`candles.map(...)`).
   - Pass `candles` directly into `findSwings`, `find_fvgs`, `find_displacements`, `find_volume_anomalies`, `find_sweeps`, `find_order_blocks`, `analyze_dealing_range`.
   - Update `bias` evaluation to check both `lastEvent.type === "BOS"` / `"CHoCH"` and `lastEvent.type === "bullish_bos"` / `"bearish_bos"`.

2. **`packages/lyzer-shared/src/providers/openmobius/imbalance.js`**:
   - Refactor `calc_atr(candles, period = 14)` to loop over `i = n - period` to `n - 1` without `trs` array.
   - Refactor `_fvg_mitigation_pct` to loop over `j = formed_at + 1` to `n - 1` tracking `min_low` / `max_high` without `slice`, `.map`, or `Math.min/max(...spread)`.
   - In `find_displacements`, use `const isBullish = c.is_bullish ?? (c.close >= c.open);`.
   - In `find_volume_anomalies`, use sliding window accumulator and `isBullish` fallback accessor.

3. **`packages/lyzer-shared/src/providers/openmobius/orderBlocks.js`**:
   - Refactor `calcAtr` to zero-allocation loop over last `period` candles.
   - Refactor `find_order_blocks` to index `c1 = candles[i+1]`, `c2 = candles[i+2]`, `c3 = candles[i+3]` without `candles.slice(i+1, i+4)`.
   - Use `const is_bullish = c.is_bullish ?? (c.close >= c.open);`.

4. **`packages/lyzer-shared/src/providers/openmobius/liquidity.js`**:
   - Refactor `find_sweeps` to check `swings` directly in a single pass without `swings.filter().map()`.

5. **`packages/lyzer-shared/src/providers/openmobius/tests/parity.test.js`**:
   - Add explicit imports `import { describe, it, expect } from 'vitest';` at the top of the test file.

---

## 5. Verification Method

The Worker can independently verify all changes by running:

```bash
# 1. OpenMobius unit tests
npx.cmd vitest run packages/lyzer-shared/src/providers/openmobius/tests/ --config "lyzer edge/vitest.config.js" --dir .

# 2. Oracle parity validation (must report 100.00% match)
node packages/lyzer-shared/src/providers/openmobius/tests/parity_tester.js

# 3. Adversarial boundary validation (must report zero divergences and causality preserved)
node packages/lyzer-shared/src/providers/openmobius/tests/adversarial_parity_tester.js

# 4. Focused smoke tests
cd "lyzer edge" && npm run test:verify

# 5. Full test suite
cd "lyzer edge" && npm test
```

# Handoff Report: Milestone 3 (Requirement R3: Temporal Spatial Memory in SMC V1 Engine)

## 1. Observation
1. **`packages/lyzer-shared/src/providers/v1_smc_ict.js` (`LiquidityReconstructionEngine`)**:
   - Lines 10–13: Constructor has no persistent state or memory index (`// Note: FVG/OB memory tracking is a future enhancement (see alpha_audit_report.md G8)`).
   - Lines 27–49: Extracts only a 4-candle slice (`prev3`, `prev2`, `prev1`, `current`). FVG detection only checks the immediate prior gap on the formation bar (`prev3.high < prev1.low && prev2.close > prev2.open`), with zero Order Block detection and zero persistent state across ticks.
2. **`packages/lyzer-shared/src/smc/liquidityEngine.js` (`LiquidityEngine`)**:
   - Lines 20–25: Fetches only 200 candles from `tfManager.getCandles('15m', 200, false)`.
   - Lines 69–123: Detects FVGs and OBs using EWMA volatility `k_sigma`.
   - Line 258: Truncates historical zones: `this.historicalZones = this.historicalZones.slice(-200)`.
   - Line 265: Truncates returned zones: `this.zones = allZones.slice(-300)`.
3. **`lyzer edge/backend/streamEngine.js`**:
   - Line 105: `this.v1 = this.disabledProviders.has('v1') ? null : new LiquidityReconstructionEngine();`
   - Line 660: `const v1Narrative = this.disabledProviders.has('v1') ? defaultNarrative : this.v1.reconstruct(mappedCandles);`
   - Line 688–703: Uses `smcLiquidityResult.activeZones` for Topographical Proximity / Golden Zone risk filtering.
   - Line 738, 752: Maps `v1Narrative.signal` and `v1Narrative.confidence` into `providers.v1` for TruthKernel evaluation and vector consensus.
4. **Current Test Baseline Execution**:
   - `npm.cmd test`: **141 test files passed, 569 tests passed** (0 errors).
   - `npm.cmd run test:verify`: **6 test files passed, 38 tests passed** (0 errors).
   - `npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js`: **126 passed** (0 errors).

---

## 2. Logic Chain
1. **Observation 1 & 3** prove that the primary V1 provider (`LiquidityReconstructionEngine`) responsible for generating the baseline SMC signal vector for the TruthKernel has zero memory retention and zero Order Block awareness. If an institutional FVG or OB formed 10 or 100 bars ago and price moves away, V1 immediately forgets the level on the subsequent tick.
2. **Observation 2** shows that while `LiquidityEngine` detects FVGs and OBs, its visibility is constrained by a 200-candle input window and array clipping. When market consolidation or trends exceed 200 candles, historical levels are not recoverable on cold starts or sliding updates.
3. This creates **institutional amnesia**: when price returns to an unmitigated high-timeframe institutional zone (FVG or OB) hours or days later, the engine fails to identify the zone as an institutional reaction level, causing missed high-probability setups and distorted liquidity risk estimates.
4. To solve this without lookahead bias or memory leaks, a dedicated **`SpatialMemoryIndex`** must be created in `packages/lyzer-shared/src/smc/spatialMemoryIndex.js` and integrated into `LiquidityReconstructionEngine` (`v1_smc_ict.js`) and `LiquidityEngine` (`liquidityEngine.js`).
5. Unmitigated levels are **never pruned simply due to sliding window limits** ($N > 200$), but persist until price reaches and mitigates them, with a bounded compaction rule (e.g. max 1,000 unmitigated levels) as a safety valve for infinite-horizon memory safety.
6. The return signature of `v1.reconstruct()` strictly retains `{ signal, confidence, narrative, source }` to preserve 100% backward compatibility across all 126 test cases in `e2e_suite.test.js`.

---

## 3. Caveats
- **Synthetic Test Arrays**: In unit test suites (e.g. `e2e_suite.test.js`), synthetic candle arrays with length = 5 may lack timestamps (`openTime`). `SpatialMemoryIndex` handles this gracefully via fallback sequential indexing.
- **Signal Priority**: Fresh FVG and Liquidity Sweep detections occurring on the immediate closed bar retain precedence over older spatial reactions to preserve exact expectations in `e2e_suite.test.js` tests.
- **Memory Ceiling**: In multi-year continuous simulations where price trends monotonically in one direction without touching old levels, the compaction rule (`maxUnmitigated = 1000`) prunes the oldest and most distant levels to guarantee bounded $O(1)$ heap usage.

---

## 4. Conclusion & Implementation Blueprint for Worker

The Worker must execute the following file changes:

### 4.1 Create `packages/lyzer-shared/src/smc/spatialMemoryIndex.js`
Create the dedicated `SpatialMemoryIndex` class:

```javascript
/**
 * SpatialMemoryIndex
 * 
 * Persistent spatial index tracking institutional Fair Value Gaps (FVG) and Order Blocks (OB)
 * across arbitrary time horizons without sliding-window amnesia.
 * 
 * Lifecycle:
 * - UNMITIGATED: Level formed and active, awaiting price interaction.
 * - TESTED: Price enters zone from reaction side without breaching boundary.
 * - MITIGATED: Price breaches boundary, resolving/invalidating the zone.
 */

export class SpatialMemoryIndex {
  constructor(options = {}) {
    this.maxUnmitigated = options.maxUnmitigated || 1000;
    this.maxMitigated = options.maxMitigated || 500;
    this.unmitigatedLevels = []; // Array of active open levels
    this.mitigatedLevels = [];   // Ring buffer of historical mitigated levels
    this.levelMap = new Map();   // id -> level for O(1) deduplication
    this.lastProcessedTime = 0;
    this.lastProcessedIndex = -1;
  }

  /**
   * Helper to extract monotonic timestamp or index from candle
   */
  _getCandleTime(candle, fallbackIndex = 0) {
    if (!candle) return fallbackIndex;
    if (candle.openTime !== undefined) return candle.openTime;
    if (candle.timestamp !== undefined) return candle.timestamp;
    if (candle.time !== undefined) return candle.time;
    return fallbackIndex;
  }

  /**
   * Ingests a candle array or single candle, detects newly formed levels,
   * and updates mitigation states across all unmitigated levels.
   */
  update(candles, timeframe = 'default') {
    if (!candles) return;
    const candleList = Array.isArray(candles) ? candles : [candles];
    if (candleList.length === 0) return;

    const n = candleList.length;

    // 1. If we have at least 3 candles, scan for newly closed FVGs and OBs
    if (n >= 3) {
      let startIndex = 1;
      if (this.lastProcessedTime > 0) {
        for (let i = n - 1; i >= 0; i--) {
          const t = this._getCandleTime(candleList[i], i);
          if (t <= this.lastProcessedTime) {
            startIndex = i + 1;
            break;
          }
        }
      }
      if (startIndex < 1) startIndex = 1;

      for (let i = startIndex; i < n; i++) {
        const curr = candleList[i];
        const prev1 = candleList[i - 1];
        const prev2 = i >= 2 ? candleList[i - 2] : null;

        this._processFormations(prev2, prev1, curr, i, timeframe);
      }
    }

    // 2. Evaluate mitigation on the latest candle
    const lastCandle = candleList[n - 1];
    this.evaluateMitigations(lastCandle);

    // Update watermark
    const lastClosedCandle = n >= 2 ? candleList[n - 2] : lastCandle;
    this.lastProcessedTime = this._getCandleTime(lastClosedCandle, n - 2);
  }

  /**
   * Process level formations on closed candles (zero lookahead)
   */
  _processFormations(prev2, prev1, curr, index, timeframe) {
    if (!curr || !prev1) return;
    const candleTime = this._getCandleTime(curr, index);

    // --- 1. Fair Value Gap (FVG) Detection (3 candles: prev2, prev1, curr) ---
    if (prev2) {
      // Bullish FVG: prev2 high < curr low
      if (prev2.high < curr.low && (prev1.close > prev1.open || prev1.close >= prev1.open)) {
        const top = curr.low;
        const bot = prev2.high;
        const id = `FVG_BULLISH_${candleTime}_${top}_${bot}`;
        if (!this.levelMap.has(id)) {
          const level = {
            id,
            type: 'FVG',
            direction: 'BULLISH',
            timeframe,
            upper_bound: top,
            lower_bound: bot,
            price: (top + bot) / 2,
            formed_at: candleTime,
            formed_index: index,
            strength: (top - bot) / (bot || 1),
            score: 1.0,
            mitigated: false,
            mitigated_at: null,
            mitigation_price: null,
            test_count: 0,
            last_tested_at: null,
            source_pattern: 'FVG_BULLISH'
          };
          this._addUnmitigatedLevel(level);
        }
      }

      // Bearish FVG: prev2 low > curr high
      if (prev2.low > curr.high && (prev1.close < prev1.open || prev1.close <= prev1.open)) {
        const top = prev2.low;
        const bot = curr.high;
        const id = `FVG_BEARISH_${candleTime}_${top}_${bot}`;
        if (!this.levelMap.has(id)) {
          const level = {
            id,
            type: 'FVG',
            direction: 'BEARISH',
            timeframe,
            upper_bound: top,
            lower_bound: bot,
            price: (top + bot) / 2,
            formed_at: candleTime,
            formed_index: index,
            strength: (top - bot) / (bot || 1),
            score: 1.0,
            mitigated: false,
            mitigated_at: null,
            mitigation_price: null,
            test_count: 0,
            last_tested_at: null,
            source_pattern: 'FVG_BEARISH'
          };
          this._addUnmitigatedLevel(level);
        }
      }
    }

    // --- 2. Order Block (OB) Detection (2 candles: prev1, curr) ---
    // Bullish OB: Bearish candle followed by strong bullish breakout
    if (prev1.close < prev1.open && curr.close > prev1.high) {
      const top = prev1.high;
      const bot = prev1.low;
      const id = `OB_BULLISH_${candleTime}_${top}_${bot}`;
      if (!this.levelMap.has(id)) {
        const level = {
          id,
          type: 'OB',
          direction: 'BULLISH',
          timeframe,
          upper_bound: top,
          lower_bound: bot,
          price: (top + bot) / 2,
          formed_at: candleTime,
          formed_index: index,
          strength: (curr.close - prev1.high) / (prev1.high || 1),
          score: 1.0,
          mitigated: false,
          mitigated_at: null,
          mitigation_price: null,
          test_count: 0,
          last_tested_at: null,
          source_pattern: 'OB_BULLISH'
        };
        this._addUnmitigatedLevel(level);
      }
    }

    // Bearish OB: Bullish candle followed by strong bearish breakdown
    if (prev1.close > prev1.open && curr.close < prev1.low) {
      const top = prev1.high;
      const bot = prev1.low;
      const id = `OB_BEARISH_${candleTime}_${top}_${bot}`;
      if (!this.levelMap.has(id)) {
        const level = {
          id,
          type: 'OB',
          direction: 'BEARISH',
          timeframe,
          upper_bound: top,
          lower_bound: bot,
          price: (top + bot) / 2,
          formed_at: candleTime,
          formed_index: index,
          strength: (prev1.low - curr.close) / (curr.close || 1),
          score: 1.0,
          mitigated: false,
          mitigated_at: null,
          mitigation_price: null,
          test_count: 0,
          last_tested_at: null,
          source_pattern: 'OB_BEARISH'
        };
        this._addUnmitigatedLevel(level);
      }
    }
  }

  /**
   * Internal helper to register an unmitigated level with bounded capacity check
   */
  _addUnmitigatedLevel(level) {
    this.unmitigatedLevels.push(level);
    this.levelMap.set(level.id, level);

    // Compaction rule if unmitigated levels exceed max capacity
    if (this.unmitigatedLevels.length > this.maxUnmitigated) {
      this._compactUnmitigated();
    }
  }

  /**
   * Compaction policy: Prunes oldest unmitigated levels when ceiling is exceeded
   */
  _compactUnmitigated() {
    const excess = this.unmitigatedLevels.length - this.maxUnmitigated;
    if (excess > 0) {
      const removed = this.unmitigatedLevels.splice(0, excess);
      for (const lvl of removed) {
        this.levelMap.delete(lvl.id);
      }
    }
  }

  /**
   * Evaluates price interaction and mitigation on every candle / live tick
   */
  evaluateMitigations(candle) {
    if (!candle) return;
    const candleTime = this._getCandleTime(candle, Date.now());
    const remaining = [];

    for (const level of this.unmitigatedLevels) {
      let isMitigated = false;

      if (level.direction === 'BULLISH') {
        // Test: price touches or enters zone from above
        if (candle.low <= level.upper_bound && candle.low > level.lower_bound) {
          level.test_count++;
          level.last_tested_at = candleTime;
        }
        // Mitigation: price breaches below the lower bound
        if (candle.low <= level.lower_bound) {
          isMitigated = true;
          level.mitigation_price = candle.low;
        }
      } else if (level.direction === 'BEARISH') {
        // Test: price touches or enters zone from below
        if (candle.high >= level.lower_bound && candle.high < level.upper_bound) {
          level.test_count++;
          level.last_tested_at = candleTime;
        }
        // Mitigation: price breaches above the upper bound
        if (candle.high >= level.upper_bound) {
          isMitigated = true;
          level.mitigation_price = candle.high;
        }
      }

      if (isMitigated) {
        level.mitigated = true;
        level.mitigated_at = candleTime;
        this.mitigatedLevels.push(level);
        if (this.mitigatedLevels.length > this.maxMitigated) {
          const evicted = this.mitigatedLevels.shift();
          this.levelMap.delete(evicted.id);
        }
      } else {
        remaining.push(level);
      }
    }

    this.unmitigatedLevels = remaining;
  }

  /**
   * Checks if current candle is reacting to / testing an unmitigated zone
   */
  checkInteraction(currentCandle) {
    if (!currentCandle || this.unmitigatedLevels.length === 0) return null;

    // Check most recently formed or nearest active unmitigated levels
    for (let i = this.unmitigatedLevels.length - 1; i >= 0; i--) {
      const level = this.unmitigatedLevels[i];
      if (level.direction === 'BULLISH') {
        // Price tested the bullish zone and closed inside or above it (bounce reaction)
        if (currentCandle.low <= level.upper_bound && currentCandle.close >= level.lower_bound) {
          return { level, type: 'TEST', direction: 'BULLISH' };
        }
      } else if (level.direction === 'BEARISH') {
        // Price tested the bearish zone and closed inside or below it (rejection reaction)
        if (currentCandle.high >= level.lower_bound && currentCandle.close <= level.upper_bound) {
          return { level, type: 'TEST', direction: 'BEARISH' };
        }
      }
    }
    return null;
  }

  /**
   * Retrieves active unmitigated levels
   */
  getUnmitigated(filter = null) {
    if (!filter) return [...this.unmitigatedLevels];
    return this.unmitigatedLevels.filter(filter);
  }

  /**
   * Retrieves historical mitigated levels
   */
  getMitigated(limit = 100) {
    return this.mitigatedLevels.slice(-limit);
  }

  /**
   * Returns closest unmitigated bullish (support) and bearish (resistance) levels relative to currentPrice
   */
  getNearest(currentPrice) {
    let nearestBullish = null;
    let nearestBearish = null;
    let minBullishDist = Infinity;
    let minBearishDist = Infinity;

    for (const level of this.unmitigatedLevels) {
      if (level.direction === 'BULLISH' && level.upper_bound <= currentPrice) {
        const dist = currentPrice - level.upper_bound;
        if (dist < minBullishDist) {
          minBullishDist = dist;
          nearestBullish = level;
        }
      } else if (level.direction === 'BEARISH' && level.lower_bound >= currentPrice) {
        const dist = level.lower_bound - currentPrice;
        if (dist < minBearishDist) {
          minBearishDist = dist;
          nearestBearish = level;
        }
      }
    }

    return {
      nearestBullish,
      nearestBearish,
      distanceBullish: nearestBullish ? minBullishDist : null,
      distanceBearish: nearestBearish ? minBearishDist : null
    };
  }

  /**
   * Summary metrics for telemetry and narrative observation
   */
  getSummary() {
    let bullishCount = 0;
    let bearishCount = 0;
    for (const lvl of this.unmitigatedLevels) {
      if (lvl.direction === 'BULLISH') bullishCount++;
      else if (lvl.direction === 'BEARISH') bearishCount++;
    }
    return {
      activeCount: this.unmitigatedLevels.length,
      unmitigatedBullish: bullishCount,
      unmitigatedBearish: bearishCount,
      mitigatedCount: this.mitigatedLevels.length
    };
  }

  /**
   * Clears all memory state
   */
  reset() {
    this.unmitigatedLevels = [];
    this.mitigatedLevels = [];
    this.levelMap.clear();
    this.lastProcessedTime = 0;
    this.lastProcessedIndex = -1;
  }
}
```

---

### 4.2 Update `packages/lyzer-shared/src/providers/v1_smc_ict.js`
Drop-in replacement for `packages/lyzer-shared/src/providers/v1_smc_ict.js`:

```javascript
/**
 * V1 Provider: Liquidity Reconstruction Engine (SMC/ICT lens)
 * 
 * CORE DIRECTIVE:
 * This is NOT a trading strategy. 
 * This is a Hypothesis Generator that reconstructs reality through the lens of Liquidity.
 * Focuses on: Fair Value Gaps (FVG), Order Blocks (OB), and Liquidity Sweeps.
 * 
 * Augmented with Temporal Spatial Memory Index (Milestone 3 / Requirement R3).
 */

import { SpatialMemoryIndex } from '../smc/spatialMemoryIndex.js';

export class LiquidityReconstructionEngine {
    constructor(options = {}) {
        this.spatialIndex = new SpatialMemoryIndex(options);
    }

    /**
     * Reconstructs reality based on the last N candles.
     * @param {Array|Object} mtfCandles - An object with { fast: [], intermediate: [], slow: [] }
     * @returns {Object} Narrative reconstruction { signal, confidence, narrative, source }
     */
    reconstruct(mtfCandles) {
        // Fallback to intermediate (M5/M15) or fast for structural liquidity mapping
        const candles = (mtfCandles.intermediate && mtfCandles.intermediate.length >= 5)
            ? mtfCandles.intermediate
            : (mtfCandles.fast && mtfCandles.fast.length >= 5 ? mtfCandles.fast : (mtfCandles.fast || mtfCandles.intermediate || []));
        if (candles.length < 5) return { signal: 'flat', confidence: 0, narrative: 'INSUFFICIENT_DATA', source: 'LIQUIDITY_RECONSTRUCTION' };

        // Synchronize spatial memory index with candles
        this.spatialIndex.update(candles);

        const current = candles[candles.length - 1];
        const prev1 = candles[candles.length - 2];
        const prev2 = candles[candles.length - 3];
        const prev3 = candles[candles.length - 4];

        let narrative = 'NEUTRAL_LIQUIDITY';
        let signal = 'flat';
        let confidence = 0;

        // 1. Detect Fair Value Gap (FVG)
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

        // 2. Detect Liquidity Sweep
        const lookback = parseInt(process.env.SMC_LOOKBACK) || 0;
        let majorSweepDetected = false;

        if (lookback > 0 && candles.length >= lookback + 1) {
            let majorHigh = -Infinity;
            let majorLow = Infinity;

            for (let i = candles.length - 1 - lookback; i < candles.length - 1; i++) {
                if (candles[i].high > majorHigh) majorHigh = candles[i].high;
                if (candles[i].low < majorLow) majorLow = candles[i].low;
            }

            const totalRange = current.high - current.low;
            const tailThreshold = totalRange * 0.5;

            // Bullish Sweep (Sell-Side Liquidity): price pierces majorLow but rejects forming a bullish pin bar
            const isBullishPinBar = (current.close - current.low) >= tailThreshold && (current.open - current.low) >= tailThreshold;
            if (current.low < majorLow && current.close > majorLow && isBullishPinBar) {
                narrative = 'MAJOR_SSL_SWEPT_WITH_REJECTION';
                signal = 'long';
                confidence += 85;
                majorSweepDetected = true;
            }

            // Bearish Sweep (Buy-Side Liquidity): price pierces majorHigh but rejects forming a bearish pin bar
            const isBearishPinBar = (current.high - current.close) >= tailThreshold && (current.high - current.open) >= tailThreshold;
            if (current.high > majorHigh && current.close < majorHigh && isBearishPinBar) {
                narrative = 'MAJOR_BSL_SWEPT_WITH_REJECTION';
                signal = 'short';
                confidence += 85;
                majorSweepDetected = true;
            }
        }

        if (!majorSweepDetected) {
            // Standard Liquidity Sweep (prev1)
            // Bullish Sweep: current goes below prev1 low but closes above it
            if (current.low < prev1.low && current.close > prev1.low) {
                if (narrative === 'NEUTRAL_LIQUIDITY') narrative = 'SELL_SIDE_LIQUIDITY_SWEPT';
                if (signal === 'flat') signal = 'long';
                confidence += 40;
            }
            // Bearish Sweep: current goes above prev1 high but closes below it
            if (current.high > prev1.high && current.close < prev1.high) {
                if (narrative === 'NEUTRAL_LIQUIDITY') narrative = 'BUY_SIDE_LIQUIDITY_SWEPT';
                if (signal === 'flat') signal = 'short';
                confidence += 40;
            }
        }

        // 3. Persistent Spatial Memory Interaction (Reaction to unmitigated zones)
        if (narrative === 'NEUTRAL_LIQUIDITY' && signal === 'flat') {
            const interaction = this.spatialIndex.checkInteraction(current);
            if (interaction) {
                if (interaction.direction === 'BULLISH' && interaction.type === 'TEST') {
                    narrative = interaction.level.type === 'OB'
                        ? 'BULLISH_OB_MITIGATION_REACTION'
                        : 'BULLISH_FVG_MITIGATION_REACTION';
                    signal = 'long';
                    confidence += 35;
                } else if (interaction.direction === 'BEARISH' && interaction.type === 'TEST') {
                    narrative = interaction.level.type === 'OB'
                        ? 'BEARISH_OB_MITIGATION_REACTION'
                        : 'BEARISH_FVG_MITIGATION_REACTION';
                    signal = 'short';
                    confidence += 35;
                }
            }
        }

        // Normalize confidence
        confidence = Math.min(100, Math.max(0, confidence));
        
        // If conflicting signals, confidence drops (internal divergence)
        if (confidence === 0) {
            signal = 'flat';
        }

        return {
            source: 'LIQUIDITY_RECONSTRUCTION',
            signal,
            confidence,
            narrative,
            spatialMemory: this.spatialIndex.getSummary()
        };
    }
}
```

---

### 4.3 Create `lyzer edge/tests/smc/spatialMemoryIndex.test.js`
Unit test suite verifying spatial memory retention across 500+ candles:

```javascript
import { describe, it, expect } from 'vitest';
import { SpatialMemoryIndex } from '../../../packages/lyzer-shared/src/smc/spatialMemoryIndex.js';
import { LiquidityReconstructionEngine } from '../../../packages/lyzer-shared/src/providers/v1_smc_ict.js';

function makeCandle(open, high, low, close, time = 1000) {
  return {
    openTime: time,
    timestamp: time,
    open,
    high,
    low,
    close,
    volume: 100,
    closed: true
  };
}

describe('R3: Temporal Spatial Memory Index Suite', () => {
  it('detects and stores Bullish FVG in unmitigated levels', () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(100, 101, 99, 100, 1000), // prev2
      makeCandle(101, 105, 100, 104, 2000), // prev1 (bullish expansion)
      makeCandle(106, 108, 105, 107, 3000)  // curr (low 105 > prev2 high 101)
    ];

    index.update(candles);
    const unmitigated = index.getUnmitigated();
    expect(unmitigated.length).toBeGreaterThanOrEqual(1);
    const fvg = unmitigated.find(l => l.type === 'FVG' && l.direction === 'BULLISH');
    expect(fvg).toBeDefined();
    expect(fvg.lower_bound).toBe(101);
    expect(fvg.upper_bound).toBe(105);
    expect(fvg.mitigated).toBe(false);
  });

  it('retains unmitigated levels over 300+ candles without sliding window amnesia', () => {
    const index = new SpatialMemoryIndex();
    // 1. Form FVG at candle 1-3
    const candles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(106, 108, 105, 107, 3000)
    ];
    index.update(candles);

    // 2. Add 300 candles fluctuating well above the FVG zone (price 150-200)
    let time = 4000;
    for (let i = 0; i < 300; i++) {
      index.update([makeCandle(150, 160, 145, 155, time)]);
      time += 1000;
    }

    // Assert: FVG formed at t=3000 is STILL in unmitigatedLevels!
    const unmitigated = index.getUnmitigated();
    const fvg = unmitigated.find(l => l.type === 'FVG' && l.direction === 'BULLISH');
    expect(fvg).toBeDefined();
    expect(fvg.mitigated).toBe(false);
  });

  it('transitions level to TESTED on zone test and MITIGATED on boundary breach', () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(106, 108, 105, 107, 3000) // Bullish FVG [101, 105]
    ];
    index.update(candles);

    // Test: candle low enters zone (103) without breaching 101
    index.update([makeCandle(110, 110, 103, 108, 4000)]);
    let active = index.getUnmitigated();
    let fvg = active.find(l => l.type === 'FVG');
    expect(fvg.test_count).toBeGreaterThanOrEqual(1);
    expect(fvg.mitigated).toBe(false);

    // Mitigation: candle breaches below 101
    index.update([makeCandle(105, 106, 98, 99, 5000)]);
    active = index.getUnmitigated();
    expect(active.find(l => l.type === 'FVG')).toBeUndefined();
    const mitigated = index.getMitigated();
    expect(mitigated.length).toBeGreaterThanOrEqual(1);
    expect(mitigated[0].mitigated).toBe(true);
  });

  it('Provider V1 generates mitigation reaction signal when price revisits unmitigated OB/FVG', () => {
    const v1 = new LiquidityReconstructionEngine();
    // 1. Initial 5 candles forming an OB/FVG
    const initialCandles = [
      makeCandle(100, 100, 99, 100, 1000),
      makeCandle(100, 101, 99, 100, 2000),
      makeCandle(100, 101, 99, 100, 3000),
      makeCandle(101, 105, 100, 104, 4000),
      makeCandle(106, 108, 105, 107, 5000)
    ];
    v1.reconstruct({ intermediate: initialCandles });

    // 2. Later candle revisits the zone
    const revisitCandles = [
      makeCandle(120, 122, 118, 120, 10000),
      makeCandle(118, 120, 115, 116, 11000),
      makeCandle(115, 116, 110, 112, 12000),
      makeCandle(110, 112, 106, 108, 13000),
      makeCandle(106, 108, 103, 106, 14000) // low (103) penetrates inside bullish zone [101, 105] and closes 106
    ];
    const res = v1.reconstruct({ intermediate: revisitCandles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toMatch(/BULLISH_(FVG|OB)_MITIGATION_REACTION/);
  });
});
```

---

## 5. Verification Method

### 5.1 Test Commands to Execute
1. Run full unit and integration suite:
   ```bash
   npm.cmd test
   ```
   **Expected**: 142+ test files passed, 574+ tests passed, 0 failures.
2. Run focused smoke tests:
   ```bash
   npm.cmd run test:verify
   ```
   **Expected**: 6 test files passed, 38+ tests passed, 0 failures.
3. Run E2E SMC test suite:
   ```bash
   npx.cmd vitest run tests/e2e_smc/e2e_suite.test.js
   ```
   **Expected**: 1 test file passed, 126 tests passed, 0 failures.
4. Run newly created spatial memory test suite:
   ```bash
   npx.cmd vitest run tests/smc/spatialMemoryIndex.test.js
   ```
   **Expected**: All spatial memory and retention tests pass with 100% green.

### 5.2 Invalidating Conditions
- Any regression or mismatch in `e2e_suite.test.js` (e.g. failing `Tier 1 - F2` or `Tier 2 - F2` tests).
- Any memory leak or unbounded array growth in `SpatialMemoryIndex` during 10,000-candle stress loops.
- Any discrepancy in `v1.reconstruct()` return signature properties (`signal`, `confidence`, `narrative`, `source`).

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
    if (candle.openTime !== undefined && candle.openTime !== null) return candle.openTime;
    if (candle.timestamp !== undefined && candle.timestamp !== null) return candle.timestamp;
    if (candle.time !== undefined && candle.time !== null) return candle.time;
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
    const closedTime = this._getCandleTime(lastClosedCandle, null);
    if (closedTime !== null) {
      this.lastProcessedTime = closedTime;
    }
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
      // Do not self-evaluate or test on the exact formation bar
      if (level.formed_at === candleTime && level.formed_at !== null) {
        remaining.push(level);
        continue;
      }

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
   * Checks if current candle is reacting to / testing a prior unmitigated zone
   */
  checkInteraction(currentCandle) {
    if (!currentCandle || this.unmitigatedLevels.length === 0) return null;
    const currentCandleTime = this._getCandleTime(currentCandle, null);

    // Check most recently formed or nearest active unmitigated levels (skip current bar formations)
    for (let i = this.unmitigatedLevels.length - 1; i >= 0; i--) {
      const level = this.unmitigatedLevels[i];
      if (currentCandleTime !== null && level.formed_at === currentCandleTime) {
        continue;
      }
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

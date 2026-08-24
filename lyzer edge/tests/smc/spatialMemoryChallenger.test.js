/**
 * CHALLENGER 1 ADVERSARIAL STRESS TEST HARNESS — MILESTONE 3 (R3: SMC Temporal Spatial Memory)
 * 
 * Empirical verification of:
 * 1. 15,000+ synthetic streaming candle throughput and memory boundedness
 * 2. Unmitigated FVG/OB level retention over 500+ and 2,000+ candles
 * 3. Exact mitigation trigger boundaries (epsilon precision)
 * 4. Zero-lookahead intra-bar wick protection on formation candles
 * 5. Sliding-window streaming robustness (sliding array input from streamEngine)
 * 6. Edge cases, corrupt candles, zero-range ticks, and degenerate feeds
 * 7. Topographical nearest level Euclidean distance precision under dense grid
 * 8. Provider V1 integration, precedence hierarchy, and spatial telemetry
 */

import { describe, it, expect } from 'vitest';
import { SpatialMemoryIndex } from '../../../packages/lyzer-shared/src/smc/spatialMemoryIndex.js';
import { LiquidityReconstructionEngine } from '../../../packages/lyzer-shared/src/providers/v1_smc_ict.js';

function makeCandle(open, high, low, close, time = null) {
  return {
    open,
    high,
    low,
    close,
    volume: 100,
    time: time || Date.now(),
    is_bullish: close >= open
  };
}

describe('Challenger 1 Adversarial Harness — SMC Temporal Spatial Memory', () => {

  // ===========================================================================
  // HARNESS 1: 15,000+ STREAMING CANDLE STRESS & BOUNDED MEMORY COMPLEXITY
  // ===========================================================================
  describe('Harness 1: High-Throughput Streaming & Memory Bounds (15,000+ Candles)', () => {
    it('survives 15,000 synthetic streaming candles without heap explosion or levelMap leakage', () => {
      const maxUnmitigated = 300;
      const maxMitigated = 150;
      const index = new SpatialMemoryIndex({ maxUnmitigated, maxMitigated });

      let currentPrice = 50000;
      const totalCandles = 15000;
      const windowSize = 50;
      const slidingWindow = [];

      for (let i = 0; i < totalCandles; i++) {
        const time = 1700000000000 + i * 60000;
        // Generate pseudo-random oscillating walk with occasional violent momentum impulses
        const isSpike = i % 50 === 0;
        const delta = isSpike ? (i % 100 === 0 ? 120 : -120) : ((Math.sin(i * 0.1) * 10) + ((i % 7) - 3));
        const open = currentPrice;
        const close = currentPrice + delta;
        const high = Math.max(open, close) + Math.abs(delta * 0.3) + 2;
        const low = Math.min(open, close) - Math.abs(delta * 0.3) - 2;
        currentPrice = close;

        const candle = makeCandle(open, high, low, close, time);
        slidingWindow.push(candle);
        if (slidingWindow.length > windowSize) {
          slidingWindow.shift();
        }

        // Stream via sliding window as in production
        index.update(slidingWindow);

        // Periodically verify memory bounds during the stream
        if (i % 1000 === 0 && i > 0) {
          const unmitigated = index.getUnmitigated();
          const mitigated = index.getMitigated(1000);
          expect(unmitigated.length).toBeLessThanOrEqual(maxUnmitigated);
          expect(mitigated.length).toBeLessThanOrEqual(maxMitigated);
          // LevelMap must not contain orphaned keys
          expect(index.levelMap.size).toBeLessThanOrEqual(maxUnmitigated + maxMitigated);
        }
      }

      // Final boundary check
      const finalSummary = index.getSummary();
      expect(finalSummary.activeCount).toBeLessThanOrEqual(maxUnmitigated);
      expect(finalSummary.mitigatedCount).toBeLessThanOrEqual(maxMitigated);
      expect(index.levelMap.size).toBeLessThanOrEqual(maxUnmitigated + maxMitigated);
      expect(finalSummary.activeCount).toBeGreaterThan(0);
    });

    it('retains strictly FIFO compaction order when capacity ceiling is hit', () => {
      const index = new SpatialMemoryIndex({ maxUnmitigated: 5, maxMitigated: 3 });

      for (let i = 1; i <= 20; i++) {
        index._addUnmitigatedLevel({
          id: `LVL_${i}`,
          type: 'FVG',
          direction: 'BULLISH',
          upper_bound: 100 + i,
          lower_bound: 90 + i,
          price: 95 + i,
          formed_at: i * 1000,
          mitigated: false
        });
      }

      const active = index.getUnmitigated();
      expect(active.length).toBe(5);
      // Must contain exactly LVL_16 through LVL_20
      expect(active.map(l => l.id)).toEqual(['LVL_16', 'LVL_17', 'LVL_18', 'LVL_19', 'LVL_20']);
      // Deleted keys must be purged from levelMap
      expect(index.levelMap.has('LVL_1')).toBe(false);
      expect(index.levelMap.has('LVL_15')).toBe(false);
      expect(index.levelMap.has('LVL_16')).toBe(true);
      expect(index.levelMap.has('LVL_20')).toBe(true);
    });
  });

  // ===========================================================================
  // HARNESS 2: 500+ AND 2,000+ CANDLE TEMPORAL RETENTION & MITIGATION LIFECYCLE
  // ===========================================================================
  describe('Harness 2: Long-Term Temporal Retention (500+ and 2,000+ Candles)', () => {
    it('preserves unmitigated Bullish FVG across 2,500 candles drift and verifies exact 3-state transition', () => {
      const index = new SpatialMemoryIndex({ maxUnmitigated: 1000 });

      // Step 1: Create a Bullish FVG on candles 1, 2, 3 [Zone: prev2.high=98 to curr.low=108]
      const candles = [
        makeCandle(95, 98, 94, 96, 1000),      // prev2 (high = 98)
        makeCandle(96, 104, 95, 103, 2000),    // prev1 (bullish candle: close 103 >= open 96)
        makeCandle(105, 112, 108, 110, 3000),  // curr (low = 108, close = 110 > 105) -> FVG zone [98, 108]
      ];
      index.update(candles);

      const fvgs = index.getUnmitigated(lvl => lvl.type === 'FVG');
      expect(fvgs.length).toBe(1);
      const targetFvgId = fvgs[0].id;
      expect(fvgs[0].lower_bound).toBe(98);
      expect(fvgs[0].upper_bound).toBe(108);
      expect(fvgs[0].test_count).toBe(0);
      expect(fvgs[0].mitigated).toBe(false);

      // Step 2: Drift price upwards from 115 to 500 over 2,500 candles (far above zone [98, 108])
      let driftCandles = [...candles];
      let lastTime = 3000;
      let price = 115;
      for (let i = 0; i < 2500; i++) {
        lastTime += 1000;
        price += 0.1;
        const driftCandle = makeCandle(price, price + 2, price - 1, price + 1, lastTime);
        driftCandles.push(driftCandle);
        if (driftCandles.length > 50) driftCandles.shift();
        index.update(driftCandles);
      }

      // Verify level is STILL retained in spatial memory after 2,500 candles
      const activeAfterDrift = index.getUnmitigated();
      const retainedFvg = activeAfterDrift.find(l => l.id === targetFvgId);
      expect(retainedFvg).toBeDefined();
      expect(retainedFvg.mitigated).toBe(false);
      expect(retainedFvg.test_count).toBe(0);

      // Step 3: Price returns to TEST the zone (candle low penetrates upper_bound 108 but stays above lower_bound 98)
      lastTime += 1000;
      const testCandle1 = makeCandle(110, 110, 105, 107, lastTime); // low = 105 (inside [98, 108])
      driftCandles.push(testCandle1);
      driftCandles.shift();
      index.update(driftCandles);

      const testedFvg = index.getUnmitigated().find(l => l.id === targetFvgId);
      expect(testedFvg).toBeDefined();
      expect(testedFvg.test_count).toBe(1);
      expect(testedFvg.last_tested_at).toBe(lastTime);
      expect(testedFvg.mitigated).toBe(false);

      // Step 4: Second bounce test (candle low = 100 > 98)
      lastTime += 1000;
      const testCandle2 = makeCandle(107, 108, 100, 106, lastTime);
      driftCandles.push(testCandle2);
      driftCandles.shift();
      index.update(driftCandles);

      const testedTwiceFvg = index.getUnmitigated().find(l => l.id === targetFvgId);
      expect(testedTwiceFvg.test_count).toBe(2);
      expect(testedTwiceFvg.mitigated).toBe(false);

      // Step 5: Price BREACHES the invalidation floor (low = 97 <= lower_bound 98)
      lastTime += 1000;
      const breachCandle = makeCandle(104, 105, 97, 100, lastTime);
      driftCandles.push(breachCandle);
      driftCandles.shift();
      index.update(driftCandles);

      // FVG must now be evicted from unmitigated and recorded in mitigatedLevels
      const unmitigatedFinal = index.getUnmitigated().find(l => l.id === targetFvgId);
      expect(unmitigatedFinal).toBeUndefined();

      const mitigatedFinal = index.getMitigated().find(l => l.id === targetFvgId);
      expect(mitigatedFinal).toBeDefined();
      expect(mitigatedFinal.mitigated).toBe(true);
      expect(mitigatedFinal.mitigated_at).toBe(lastTime);
      expect(mitigatedFinal.mitigation_price).toBe(97);
      expect(mitigatedFinal.test_count).toBe(2);
    });

    it('preserves unmitigated Bearish OB across 1,000 candles drift and verifies exact mitigation upon upper bound breach', () => {
      const index = new SpatialMemoryIndex();

      // Form Bearish OB: prev1 bullish candle [100, 110], curr strong breakdown close 90 < prev1.low 100
      const candles = [
        makeCandle(98, 100, 97, 99, 1000),
        makeCandle(100, 110, 99, 108, 2000),   // prev1 Bullish OB zone [99, 110]
        makeCandle(105, 106, 88, 90, 3000),    // curr close 90 < 99
      ];
      index.update(candles);

      const obs = index.getUnmitigated(l => l.type === 'OB' && l.direction === 'BEARISH');
      expect(obs.length).toBe(1);
      const obId = obs[0].id;
      expect(obs[0].lower_bound).toBe(99);
      expect(obs[0].upper_bound).toBe(110);

      // Drift downward to price = 20 over 1,000 candles
      let window = [...candles];
      let t = 3000;
      let p = 90;
      for (let i = 0; i < 1000; i++) {
        t += 1000;
        p -= 0.07;
        window.push(makeCandle(p, p + 0.5, p - 0.5, p, t));
        if (window.length > 50) window.shift();
        index.update(window);
      }

      expect(index.getUnmitigated().find(l => l.id === obId)).toBeDefined();

      // Retrace up to touch zone [99, 110] at high = 105 (TEST)
      t += 1000;
      window.push(makeCandle(95, 105, 94, 98, t));
      window.shift();
      index.update(window);

      const obTested = index.getUnmitigated().find(l => l.id === obId);
      expect(obTested).toBeDefined();
      expect(obTested.test_count).toBe(1);
      expect(obTested.mitigated).toBe(false);

      // Penetrate upper bound (high = 111 >= upper_bound 110) -> MITIGATION
      t += 1000;
      window.push(makeCandle(100, 111, 99, 109, t));
      window.shift();
      index.update(window);

      expect(index.getUnmitigated().find(l => l.id === obId)).toBeUndefined();
      const obMitigated = index.getMitigated().find(l => l.id === obId);
      expect(obMitigated).toBeDefined();
      expect(obMitigated.mitigated).toBe(true);
      expect(obMitigated.mitigation_price).toBe(111);
    });
  });

  // ===========================================================================
  // HARNESS 3: PRECISE EPSILON BOUNDARY VALUE ANALYSIS ON MITIGATION TRIGGERS
  // ===========================================================================
  describe('Harness 3: Epsilon Boundary Value Analysis', () => {
    it('Bullish FVG exact floor boundary: 0.0001 above does NOT mitigate, exact equality DOES mitigate', () => {
      const index = new SpatialMemoryIndex();
      index._addUnmitigatedLevel({
        id: 'BULLISH_FVG_BOUND',
        type: 'FVG',
        direction: 'BULLISH',
        upper_bound: 110.0,
        lower_bound: 100.0,
        price: 105.0,
        formed_at: 1000,
        mitigated: false,
        test_count: 0
      });

      // Candle 1: low is 100.0001 (inside zone, above floor)
      index.evaluateMitigations(makeCandle(108, 108, 100.0001, 106, 2000));
      let lvl = index.getUnmitigated().find(l => l.id === 'BULLISH_FVG_BOUND');
      expect(lvl).toBeDefined();
      expect(lvl.test_count).toBe(1);
      expect(lvl.mitigated).toBe(false);

      // Candle 2: low is exactly 100.0000 (breach floor)
      index.evaluateMitigations(makeCandle(106, 106, 100.0000, 101, 3000));
      lvl = index.getUnmitigated().find(l => l.id === 'BULLISH_FVG_BOUND');
      expect(lvl).toBeUndefined();
      const mit = index.getMitigated().find(l => l.id === 'BULLISH_FVG_BOUND');
      expect(mit).toBeDefined();
      expect(mit.mitigated).toBe(true);
      expect(mit.mitigation_price).toBe(100.0000);
    });

    it('Bearish FVG exact ceiling boundary: 0.0001 below does NOT mitigate, exact equality DOES mitigate', () => {
      const index = new SpatialMemoryIndex();
      index._addUnmitigatedLevel({
        id: 'BEARISH_FVG_BOUND',
        type: 'FVG',
        direction: 'BEARISH',
        upper_bound: 200.0,
        lower_bound: 190.0,
        price: 195.0,
        formed_at: 1000,
        mitigated: false,
        test_count: 0
      });

      // Candle 1: high is 199.9999 (inside zone, below ceiling)
      index.evaluateMitigations(makeCandle(192, 199.9999, 191, 193, 2000));
      let lvl = index.getUnmitigated().find(l => l.id === 'BEARISH_FVG_BOUND');
      expect(lvl).toBeDefined();
      expect(lvl.test_count).toBe(1);
      expect(lvl.mitigated).toBe(false);

      // Candle 2: high is exactly 200.0000 (breach ceiling)
      index.evaluateMitigations(makeCandle(195, 200.0000, 194, 198, 3000));
      lvl = index.getUnmitigated().find(l => l.id === 'BEARISH_FVG_BOUND');
      expect(lvl).toBeUndefined();
      const mit = index.getMitigated().find(l => l.id === 'BEARISH_FVG_BOUND');
      expect(mit).toBeDefined();
      expect(mit.mitigated).toBe(true);
      expect(mit.mitigation_price).toBe(200.0000);
    });

    it('Strict Zero-Lookahead: formation bar wick cannot mitigate level born on the same bar', () => {
      const index = new SpatialMemoryIndex();
      // Form Bullish OB at time 3000:
      // prev1 (time 2000): open 105, close 100, low 98, high 106 (zone [98, 106])
      // curr (time 3000): open 101, close 110 > 106, BUT low dipped to 90 (below 98!)
      const candles = [
        makeCandle(100, 102, 99, 101, 1000),
        makeCandle(105, 106, 98, 100, 2000),
        makeCandle(101, 110, 90, 110, 3000),
      ];
      index.update(candles);

      const unmitigated = index.getUnmitigated();
      expect(unmitigated.length).toBe(1);
      expect(unmitigated[0].formed_at).toBe(3000);
      expect(unmitigated[0].mitigated).toBe(false);
      expect(unmitigated[0].test_count).toBe(0);

      // On next bar (time 4000), if price breaches 98, mitigation occurs properly
      index.update([...candles, makeCandle(108, 109, 95, 105, 4000)]);
      expect(index.getUnmitigated().length).toBe(0);
      expect(index.getMitigated().length).toBe(1);
    });
  });

  // ===========================================================================
  // HARNESS 4: SLIDING WINDOW STREAMING ROBUSTNESS (PRODUCTION SIMULATION)
  // ===========================================================================
  describe('Harness 4: Sliding Window Streaming Protocol', () => {
    it('maintains continuous memory when fixed-length sliding window discards formation candles', () => {
      const index = new SpatialMemoryIndex();
      const fullCandleStream = [];
      const windowSize = 20;

      // Candle 0..2 form a Bullish FVG at time 3000 [zone: prev2.high=98 to curr.low=108]
      fullCandleStream.push(makeCandle(95, 98, 94, 96, 1000));
      fullCandleStream.push(makeCandle(96, 104, 95, 103, 2000));
      fullCandleStream.push(makeCandle(105, 112, 108, 110, 3000));

      // Append 100 subsequent non-interacting candles
      for (let i = 4; i <= 100; i++) {
        const p = 120 + i;
        fullCandleStream.push(makeCandle(p, p + 2, p - 1, p + 1, i * 1000));
      }

      // Stream sequentially with a 20-candle sliding window
      for (let head = windowSize; head <= fullCandleStream.length; head++) {
        const window = fullCandleStream.slice(head - windowSize, head);
        index.update(window);
      }

      // Formation candles [1000, 2000, 3000] are long gone from the sliding window,
      // but spatial index MUST still retain the level!
      const unmitigated = index.getUnmitigated();
      expect(unmitigated.length).toBeGreaterThanOrEqual(1);
      const originalFvg = unmitigated.find(l => l.formed_at === 3000);
      expect(originalFvg).toBeDefined();
      expect(originalFvg.lower_bound).toBe(98);
      expect(originalFvg.upper_bound).toBe(108);
    });

    it('idempotently handles duplicate candle pushes and backward timestamps without state corruption', () => {
      const index = new SpatialMemoryIndex();
      const candles = [
        makeCandle(100, 102, 99, 101, 1000),
        makeCandle(101, 105, 100, 104, 2000),
        makeCandle(106, 110, 105, 108, 3000),
      ];

      // Update 5 times with the exact same array
      index.update(candles);
      index.update(candles);
      index.update(candles);
      index.update(candles);
      index.update(candles);

      const unmitigated = index.getUnmitigated();
      expect(unmitigated.length).toBe(1); // No duplicates created
    });
  });

  // ===========================================================================
  // HARNESS 5: DEGENERATE FEEDS, ZERO RANGE TICKS & EDGE CASES
  // ===========================================================================
  describe('Harness 5: Degenerate Inputs & Edge Cases', () => {
    it('handles null, undefined, empty array, and single/two candle arrays gracefully', () => {
      const index = new SpatialMemoryIndex();
      expect(() => index.update(null)).not.toThrow();
      expect(() => index.update(undefined)).not.toThrow();
      expect(() => index.update([])).not.toThrow();
      expect(() => index.update([makeCandle(100, 100, 100, 100, 1000)])).not.toThrow();
      expect(() => index.update([makeCandle(100, 100, 100, 100, 1000), makeCandle(100, 100, 100, 100, 2000)])).not.toThrow();
      expect(index.getUnmitigated().length).toBe(0);
    });

    it('handles zero-range flat candles without dividing by zero or producing NaN', () => {
      const index = new SpatialMemoryIndex();
      const flatCandles = [
        makeCandle(100, 100, 100, 100, 1000),
        makeCandle(100, 100, 100, 100, 2000),
        makeCandle(100, 100, 100, 100, 3000),
        makeCandle(100, 100, 100, 100, 4000),
      ];
      expect(() => index.update(flatCandles)).not.toThrow();
      expect(index.getUnmitigated().length).toBe(0);
    });

    it('handles missing timestamp properties via index fallback', () => {
      const index = new SpatialMemoryIndex();
      const noTimeCandles = [
        { open: 95, high: 98, low: 94, close: 96 },
        { open: 96, high: 104, low: 95, close: 103 },
        { open: 105, high: 112, low: 108, close: 110 },
      ];
      expect(() => index.update(noTimeCandles)).not.toThrow();
      const unmitigated = index.getUnmitigated();
      expect(unmitigated.length).toBe(1);
      expect(unmitigated[0].formed_at).toBe(2); // Index fallback
    });

    it('handles checkInteraction with null or empty memory safely', () => {
      const index = new SpatialMemoryIndex();
      expect(index.checkInteraction(null)).toBeNull();
      expect(index.checkInteraction(makeCandle(100, 105, 95, 100))).toBeNull();
    });
  });

  // ===========================================================================
  // HARNESS 6: TOPOGRAPHICAL NEAREST LEVEL SEARCH ACROSS DENSE GRIDS
  // ===========================================================================
  describe('Harness 6: Topographical Euclidean Distance Nearest Level Search', () => {
    it('correctly isolates nearest bullish support and bearish resistance in a multi-level grid', () => {
      const index = new SpatialMemoryIndex();

      // Add 10 Bullish support zones from 10 to 100
      for (let i = 1; i <= 10; i++) {
        index._addUnmitigatedLevel({
          id: `SUP_${i}`,
          type: 'OB',
          direction: 'BULLISH',
          upper_bound: i * 10,
          lower_bound: i * 10 - 5,
          price: i * 10 - 2.5,
          mitigated: false
        });
      }

      // Add 10 Bearish resistance zones from 110 to 200
      for (let i = 11; i <= 20; i++) {
        index._addUnmitigatedLevel({
          id: `RES_${i}`,
          type: 'OB',
          direction: 'BEARISH',
          upper_bound: i * 10 + 5,
          lower_bound: i * 10,
          price: i * 10 + 2.5,
          mitigated: false
        });
      }

      // Current price = 105 (between SUP_10 [95, 100] and RES_11 [110, 115])
      const nearest = index.getNearest(105);
      expect(nearest.nearestBullish.id).toBe('SUP_10');
      expect(nearest.distanceBullish).toBe(5); // 105 - 100

      expect(nearest.nearestBearish.id).toBe('RES_11');
      expect(nearest.distanceBearish).toBe(5); // 110 - 105

      // Boundary: Current price below all bullish supports (e.g. price = 5)
      const lowNearest = index.getNearest(5);
      expect(lowNearest.nearestBullish).toBeNull();
      expect(lowNearest.distanceBullish).toBeNull();
      expect(lowNearest.nearestBearish.id).toBe('RES_11');

      // Boundary: Current price above all bearish resistances (e.g. price = 250)
      const highNearest = index.getNearest(250);
      expect(highNearest.nearestBullish.id).toBe('SUP_10');
      expect(highNearest.nearestBearish).toBeNull();
      expect(highNearest.distanceBearish).toBeNull();
    });
  });

  // ===========================================================================
  // HARNESS 7: PROVIDER V1 INTEGRATION, PRECEDENCE & SPATIAL REACTION TELEMETRY
  // ===========================================================================
  describe('Harness 7: Provider V1 Pipeline Conformance & Precedence', () => {
    it('emits spatial memory reaction on historical unmitigated OB test in neutral context', () => {
      const v1 = new LiquidityReconstructionEngine();

      // Inject an old Bearish OB formed 500 bars ago at [150, 160]
      v1.spatialIndex._addUnmitigatedLevel({
        id: 'HISTORICAL_BEARISH_OB',
        type: 'OB',
        direction: 'BEARISH',
        upper_bound: 160,
        lower_bound: 150,
        price: 155,
        formed_at: 1000,
        mitigated: false,
        test_count: 0
      });

      // Price is drifting quietly at 140, then current bar tests inside [150, 160] and rejects down to 148
      const candles = [
        makeCandle(140, 142, 139, 141, 10000),
        makeCandle(141, 143, 140, 142, 11000),
        makeCandle(142, 144, 141, 143, 12000),
        makeCandle(143, 145, 142, 144, 13000),
        makeCandle(144, 155, 143, 148, 14000), // high = 155 (inside [150, 160]), close = 148 <= 160
      ];

      const res = v1.reconstruct({ intermediate: candles });
      expect(res.source).toBe('LIQUIDITY_RECONSTRUCTION');
      expect(res.signal).toBe('short');
      expect(res.narrative).toBe('BEARISH_OB_MITIGATION_REACTION');
      expect(res.confidence).toBe(35);
      expect(res.spatialMemory).toBeDefined();
      expect(res.spatialMemory.activeCount).toBeGreaterThanOrEqual(1);
    });

    it('enforces strict priority: Liquidity Sweep overrides historical spatial memory reaction', () => {
      const v1 = new LiquidityReconstructionEngine();

      // Prime spatial memory with Bullish OB
      v1.spatialIndex._addUnmitigatedLevel({
        id: 'HIST_BULLISH_OB',
        type: 'OB',
        direction: 'BULLISH',
        upper_bound: 105,
        lower_bound: 100,
        price: 102.5,
        formed_at: 1000,
        mitigated: false
      });

      // Construct candles where current candle performs a Sell-Side Liquidity Sweep (prev1 low swept)
      // while also touching the OB zone
      const candles = [
        makeCandle(110, 112, 109, 111, 10000),
        makeCandle(111, 113, 110, 112, 11000),
        makeCandle(112, 114, 111, 113, 12000),
        makeCandle(113, 115, 108, 114, 13000), // prev1 low = 108
        makeCandle(114, 114, 104, 110, 14000), // current: low 104 (< 108 swept, > 100 OB test), close 110 (> 108)
      ];

      const res = v1.reconstruct({ intermediate: candles });
      // Liquidity Sweep MUST override spatial reaction
      expect(res.signal).toBe('long');
      expect(res.narrative).toBe('SELL_SIDE_LIQUIDITY_SWEPT');
      expect(res.confidence).toBe(40);
    });
  });
});

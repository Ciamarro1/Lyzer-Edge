import { describe, it, expect } from "vitest";
import { SpatialMemoryIndex } from "../../../packages/lyzer-shared/src/smc/spatialMemoryIndex.js";
import { LiquidityReconstructionEngine } from "../../../packages/lyzer-shared/src/providers/v1_smc_ict.js";

function makeCandle(open, high, low, close, time = 1000) {
  return {
    openTime: time,
    timestamp: time,
    open,
    high,
    low,
    close,
    volume: 100,
    closed: true,
  };
}

describe("R3: Temporal Spatial Memory Index Suite", () => {
  // ===========================================================================
  // DOMAIN 1: CORE DETECTION & FORMATION
  // ===========================================================================

  it("detects and stores Bullish FVG in unmitigated levels", () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(100, 101, 99, 100, 1000), // prev2
      makeCandle(101, 105, 100, 104, 2000), // prev1 (bullish expansion)
      makeCandle(106, 108, 105, 107, 3000), // curr (low 105 > prev2 high 101)
    ];

    index.update(candles);
    const unmitigated = index.getUnmitigated();
    expect(unmitigated.length).toBeGreaterThanOrEqual(1);
    const fvg = unmitigated.find(
      (l) => l.type === "FVG" && l.direction === "BULLISH",
    );
    expect(fvg).toBeDefined();
    expect(fvg.lower_bound).toBe(101);
    expect(fvg.upper_bound).toBe(105);
    expect(fvg.mitigated).toBe(false);
  });

  it("detects and stores Bearish FVG in unmitigated levels", () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(110, 111, 109, 110, 1000), // prev2 (low 109)
      makeCandle(109, 110, 102, 103, 2000), // prev1 (bearish expansion)
      makeCandle(103, 105, 100, 102, 3000), // curr (high 105 < prev2 low 109)
    ];

    index.update(candles);
    const unmitigated = index.getUnmitigated();
    expect(unmitigated.length).toBeGreaterThanOrEqual(1);
    const fvg = unmitigated.find(
      (l) => l.type === "FVG" && l.direction === "BEARISH",
    );
    expect(fvg).toBeDefined();
    expect(fvg.upper_bound).toBe(109);
    expect(fvg.lower_bound).toBe(105);
    expect(fvg.mitigated).toBe(false);
  });

  it("detects and stores Bullish and Bearish Order Blocks (OB)", () => {
    const index = new SpatialMemoryIndex();
    // 1. Bullish OB: prev1 bearish candle, curr breaks out above prev1 high
    const bullCandles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(102, 103, 98, 99, 2000), // prev1: open 102, close 99, high 103, low 98
      makeCandle(100, 106, 99, 105, 3000), // curr: close 105 > prev1 high 103
    ];
    index.update(bullCandles);
    const unmitigatedBull = index.getUnmitigated();
    const obBull = unmitigatedBull.find(
      (l) => l.type === "OB" && l.direction === "BULLISH",
    );
    expect(obBull).toBeDefined();
    expect(obBull.upper_bound).toBe(103);
    expect(obBull.lower_bound).toBe(98);

    // 2. Bearish OB: prev1 bullish candle, curr breaks down below prev1 low
    const indexBear = new SpatialMemoryIndex();
    const bearCandles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(100, 104, 99, 103, 2000), // prev1: open 100, close 103, high 104, low 99
      makeCandle(102, 102, 95, 96, 3000), // curr: close 96 < prev1 low 99
    ];
    indexBear.update(bearCandles);
    const unmitigatedBear = indexBear.getUnmitigated();
    const obBear = unmitigatedBear.find(
      (l) => l.type === "OB" && l.direction === "BEARISH",
    );
    expect(obBear).toBeDefined();
    expect(obBear.upper_bound).toBe(104);
    expect(obBear.lower_bound).toBe(99);
  });

  // ===========================================================================
  // DOMAIN 2: TEMPORAL HORIZON & MEMORY BOUNDS (ZERO AMNESIA)
  // ===========================================================================

  it("retains unmitigated levels over 300+ candles without sliding window amnesia", () => {
    const index = new SpatialMemoryIndex();
    // 1. Form FVG at candle 1-3
    const candles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(106, 108, 105, 107, 3000),
    ];
    index.update(candles);

    // 2. Add 350 candles fluctuating well above the FVG zone (price 150-200)
    let time = 4000;
    for (let i = 0; i < 350; i++) {
      index.update([makeCandle(150, 160, 145, 155, time)]);
      time += 1000;
    }

    // Assert: FVG formed at t=3000 is STILL in unmitigatedLevels after 350 candles
    const unmitigated = index.getUnmitigated();
    const fvg = unmitigated.find(
      (l) => l.type === "FVG" && l.direction === "BULLISH",
    );
    expect(fvg).toBeDefined();
    expect(fvg.mitigated).toBe(false);
    expect(index.getSummary().activeCount).toBeGreaterThanOrEqual(1);
  });

  it("T1.1: Retains unmitigated Bullish FVG over 500+ candles of distant drift", () => {
    const index = new SpatialMemoryIndex();
    // 1. Form FVG at t=1000..3000 at zone [101, 105]
    index.update([
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(106, 108, 105, 107, 3000),
    ]);

    // 2. Feed 500 candles oscillating far above at [200, 250]
    let t = 4000;
    for (let i = 0; i < 500; i++) {
      index.update([makeCandle(220, 250, 210, 230, t)]);
      t += 1000;
    }

    const unmitigated = index.getUnmitigated();
    const fvg = unmitigated.find(
      (l) => l.type === "FVG" && l.direction === "BULLISH",
    );
    expect(fvg).toBeDefined();
    expect(fvg.lower_bound).toBe(101);
    expect(fvg.upper_bound).toBe(105);
    expect(fvg.mitigated).toBe(false);
    expect(fvg.test_count).toBe(0);
    expect(index.getSummary().activeCount).toBeGreaterThanOrEqual(1);
  });

  it("T1.2: Accurately reacts to 1,000-candle old Order Block upon revisit", () => {
    const v1 = new LiquidityReconstructionEngine();
    // 1. Form Bullish OB at [98, 103]
    v1.reconstruct({
      intermediate: [
        makeCandle(100, 101, 99, 100, 1000),
        makeCandle(100, 101, 99, 100, 2000),
        makeCandle(100, 101, 99, 100, 3000),
        makeCandle(102, 103, 98, 99, 4000), // Bearish candle [98, 103]
        makeCandle(100, 108, 99, 106, 5000), // Bullish breakout close 106 > 103
      ],
    });

    // 2. Simulate 1,000 drifting candles
    let t = 6000;
    for (let i = 0; i < 1000; i++) {
      v1.spatialIndex.update([makeCandle(150, 160, 140, 155, t)]);
      t += 1000;
    }

    // 3. Revisit OB zone at candle 1001 (low enters 101, close bounces 104)
    const revisitCandles = [
      makeCandle(120, 122, 118, 120, t),
      makeCandle(115, 116, 112, 114, t + 1000),
      makeCandle(110, 112, 108, 110, t + 2000),
      makeCandle(106, 107, 104, 105, t + 3000),
      makeCandle(105, 105, 101, 104, t + 4000), // Low 101 tests OB [98, 103]
    ];
    const res = v1.reconstruct({ intermediate: revisitCandles });
    expect(res.signal).toBe("long");
    expect(res.narrative).toBe("BULLISH_OB_MITIGATION_REACTION");
    expect(res.confidence).toBe(35);
  });

  it("T1.3: Retains distinct levels across multiple timeframes without collision", () => {
    const index = new SpatialMemoryIndex();
    // 1m level
    index.update(
      [
        makeCandle(100, 101, 99, 100, 1000),
        makeCandle(101, 105, 100, 104, 2000),
        makeCandle(106, 108, 105, 107, 3000),
      ],
      "1m",
    );

    // 15m level
    index.update(
      [
        makeCandle(200, 202, 198, 200, 10000),
        makeCandle(201, 210, 200, 208, 20000),
        makeCandle(211, 215, 210, 214, 30000),
      ],
      "15m",
    );

    const m1Levels = index.getUnmitigated((l) => l.timeframe === "1m");
    const m15Levels = index.getUnmitigated((l) => l.timeframe === "15m");
    expect(m1Levels.length).toBe(1);
    expect(m15Levels.length).toBe(1);
    expect(m1Levels[0].upper_bound).toBe(105);
    expect(m15Levels[0].upper_bound).toBe(210);
  });

  it("T1.4: Enforces bounded compaction when level count exceeds maxUnmitigated", () => {
    const index = new SpatialMemoryIndex({
      maxUnmitigated: 50,
      maxMitigated: 20,
    });
    for (let i = 0; i < 100; i++) {
      index._addUnmitigatedLevel({
        id: `LEVEL_${i}`,
        type: "FVG",
        direction: "BULLISH",
        upper_bound: 100 + i,
        lower_bound: 90 + i,
        price: 95 + i,
        mitigated: false,
      });
    }
    expect(index.getUnmitigated().length).toBe(50);
    expect(index.getUnmitigated()[0].id).toBe("LEVEL_50");
    expect(index.getUnmitigated()[49].id).toBe("LEVEL_99");
    expect(index.levelMap.size).toBe(50);
  });

  // ===========================================================================
  // DOMAIN 3: MITIGATION LIFECYCLE & VOLATILE PRICE PATHS
  // ===========================================================================

  it("transitions Bullish level to TESTED on zone test and MITIGATED on boundary breach", () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(101, 105, 100, 104, 2000),
      makeCandle(106, 108, 105, 107, 3000), // Bullish FVG [101, 105]
    ];
    index.update(candles);

    // Test: candle low enters zone (103) without breaching lower bound (101)
    index.update([makeCandle(110, 110, 103, 108, 4000)]);
    let active = index.getUnmitigated();
    let fvg = active.find((l) => l.type === "FVG");
    expect(fvg.test_count).toBeGreaterThanOrEqual(1);
    expect(fvg.mitigated).toBe(false);

    // Mitigation: candle breaches below 101
    index.update([makeCandle(105, 106, 98, 99, 5000)]);
    active = index.getUnmitigated();
    expect(active.find((l) => l.type === "FVG")).toBeUndefined();
    const mitigated = index.getMitigated();
    expect(mitigated.length).toBeGreaterThanOrEqual(1);
    expect(mitigated[0].mitigated).toBe(true);
    expect(mitigated[0].mitigation_price).toBe(98);
  });

  it("transitions Bearish level to TESTED on zone test and MITIGATED on upper bound breach", () => {
    const index = new SpatialMemoryIndex();
    const candles = [
      makeCandle(110, 111, 109, 110, 1000),
      makeCandle(109, 110, 102, 103, 2000),
      makeCandle(103, 105, 100, 102, 3000), // Bearish FVG [105, 109]
    ];
    index.update(candles);

    // Test: candle high enters zone (107) without breaching upper bound (109)
    index.update([makeCandle(95, 107, 94, 96, 4000)]);
    let active = index.getUnmitigated();
    let fvg = active.find((l) => l.type === "FVG");
    expect(fvg.test_count).toBe(1);
    expect(fvg.mitigated).toBe(false);

    // Mitigation: candle high breaches above 109
    index.update([makeCandle(100, 112, 99, 111, 5000)]);
    active = index.getUnmitigated();
    expect(active.find((l) => l.type === "FVG")).toBeUndefined();
    const mitigated = index.getMitigated();
    expect(mitigated.length).toBeGreaterThanOrEqual(1);
    expect(mitigated[0].mitigated).toBe(true);
    expect(mitigated[0].mitigation_price).toBe(112);
  });

  it("T2.1: Increments test_count on wick touch and preserves UNMITIGATED status", () => {
    const index = new SpatialMemoryIndex();
    index._addUnmitigatedLevel({
      id: "TEST_FVG_BULL",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 105,
      lower_bound: 100,
      price: 102.5,
      formed_at: 1000,
      mitigated: false,
      test_count: 0,
    });

    // Touch 1: Low 103 (inside zone), High 110, Close 108
    index.evaluateMitigations(makeCandle(108, 110, 103, 108, 2000));
    let lvl = index.getUnmitigated().find((l) => l.id === "TEST_FVG_BULL");
    expect(lvl.test_count).toBe(1);
    expect(lvl.mitigated).toBe(false);

    // Touch 2: Low 101 (near bottom of zone), Close 107
    index.evaluateMitigations(makeCandle(107, 109, 101, 107, 3000));
    lvl = index.getUnmitigated().find((l) => l.id === "TEST_FVG_BULL");
    expect(lvl.test_count).toBe(2);
    expect(lvl.mitigated).toBe(false);
  });

  it("T2.2: Transitions to MITIGATED on 4th test when price breaks boundary", () => {
    const index = new SpatialMemoryIndex();
    index._addUnmitigatedLevel({
      id: "TEST_OB_BEAR",
      type: "OB",
      direction: "BEARISH",
      upper_bound: 155,
      lower_bound: 150,
      price: 152.5,
      formed_at: 1000,
      mitigated: false,
      test_count: 0,
    });

    // 3 tests without breach
    index.evaluateMitigations(makeCandle(145, 152, 144, 146, 2000));
    index.evaluateMitigations(makeCandle(146, 153, 145, 147, 3000));
    index.evaluateMitigations(makeCandle(147, 154.5, 146, 148, 4000));
    let lvl = index.getUnmitigated().find((l) => l.id === "TEST_OB_BEAR");
    expect(lvl.test_count).toBe(3);
    expect(lvl.mitigated).toBe(false);

    // 4th candle breaches above 155 (High 157)
    index.evaluateMitigations(makeCandle(150, 157, 149, 156, 5000));
    expect(
      index.getUnmitigated().find((l) => l.id === "TEST_OB_BEAR"),
    ).toBeUndefined();
    const mitigated = index.getMitigated();
    expect(mitigated.length).toBe(1);
    expect(mitigated[0].id).toBe("TEST_OB_BEAR");
    expect(mitigated[0].mitigated).toBe(true);
    expect(mitigated[0].mitigation_price).toBe(157);
    expect(mitigated[0].test_count).toBe(3);
  });

  it("T2.3: Single-candle flash crash / gap immediately mitigates Bullish level", () => {
    const index = new SpatialMemoryIndex();
    index._addUnmitigatedLevel({
      id: "FLASH_ZONE",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 105,
      lower_bound: 100,
      price: 102.5,
      formed_at: 1000,
      mitigated: false,
      test_count: 0,
    });

    // Flash candle: Open 110, High 111, Low 85, Close 88 (plunges straight through [100, 105])
    index.evaluateMitigations(makeCandle(110, 111, 85, 88, 2000));
    expect(index.getUnmitigated().length).toBe(0);
    const mitigated = index.getMitigated();
    expect(mitigated.length).toBe(1);
    expect(mitigated[0].mitigated).toBe(true);
    expect(mitigated[0].mitigation_price).toBe(85);
  });

  it("T2.4: Correctly resolves stacked multi-directional zones under whipsaw", () => {
    const index = new SpatialMemoryIndex();
    index._addUnmitigatedLevel({
      id: "BULL_1",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 95,
      lower_bound: 90,
      price: 92.5,
      formed_at: 1000,
      mitigated: false,
    });
    index._addUnmitigatedLevel({
      id: "BULL_2",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 105,
      lower_bound: 100,
      price: 102.5,
      formed_at: 1000,
      mitigated: false,
    });
    index._addUnmitigatedLevel({
      id: "BEAR_1",
      type: "FVG",
      direction: "BEARISH",
      upper_bound: 125,
      lower_bound: 120,
      price: 122.5,
      formed_at: 1000,
      mitigated: false,
    });
    index._addUnmitigatedLevel({
      id: "BEAR_2",
      type: "FVG",
      direction: "BEARISH",
      upper_bound: 135,
      lower_bound: 130,
      price: 132.5,
      formed_at: 1000,
      mitigated: false,
    });

    // 1. Plunge to 98: mitigates BULL_2 (low 98 <= 100), does not breach BULL_1 (upper 95)
    index.evaluateMitigations(makeCandle(110, 110, 98, 102, 2000));
    expect(index.getUnmitigated().map((l) => l.id)).toEqual([
      "BULL_1",
      "BEAR_1",
      "BEAR_2",
    ]);

    // 2. Spike to 126: mitigates BEAR_1 (high 126 >= 125), does not reach BEAR_2 (lower 130)
    index.evaluateMitigations(makeCandle(105, 126, 104, 124, 3000));
    expect(index.getUnmitigated().map((l) => l.id)).toEqual([
      "BULL_1",
      "BEAR_2",
    ]);
  });

  it("T2.5: Prevents formation bar self-mitigation (Zero Lookahead Guard)", () => {
    const index = new SpatialMemoryIndex();
    // Bullish OB formed at t=3000 (prev1 bearish at 2000, curr breakout at 3000 where curr.low breaches prev1.low)
    const candles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(102, 103, 98, 99, 2000), // Bearish OB zone [98, 103]
      makeCandle(100, 108, 96, 106, 3000), // Breakout close 106 > 103, but low is 96 (below 98 lower_bound)
    ];
    index.update(candles);
    // Level formed on bar 3000 must NOT be evaluated against bar 3000 itself
    const unmitigated = index.getUnmitigated();
    expect(unmitigated.length).toBeGreaterThanOrEqual(1);
    expect(unmitigated[0].mitigated).toBe(false);
  });

  // ===========================================================================
  // DOMAIN 4: TOPOGRAPHY, NEAREST LEVELS & UTILITIES
  // ===========================================================================

  it("getNearest accurately identifies closest support and resistance levels", () => {
    const index = new SpatialMemoryIndex();
    // Bullish level at [100, 105]
    // Bearish level at [120, 125]
    index._addUnmitigatedLevel({
      id: "SUPPORT_1",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 105,
      lower_bound: 100,
      price: 102.5,
      mitigated: false,
    });
    index._addUnmitigatedLevel({
      id: "RESISTANCE_1",
      type: "FVG",
      direction: "BEARISH",
      upper_bound: 125,
      lower_bound: 120,
      price: 122.5,
      mitigated: false,
    });

    const nearest = index.getNearest(110);
    expect(nearest.nearestBullish).toBeDefined();
    expect(nearest.nearestBullish.id).toBe("SUPPORT_1");
    expect(nearest.distanceBullish).toBe(5); // 110 - 105

    expect(nearest.nearestBearish).toBeDefined();
    expect(nearest.nearestBearish.id).toBe("RESISTANCE_1");
    expect(nearest.distanceBearish).toBe(10); // 120 - 110
  });

  it("enforces bounded capacity compaction without memory leaks", () => {
    const index = new SpatialMemoryIndex({
      maxUnmitigated: 10,
      maxMitigated: 5,
    });

    // Add 25 unmitigated levels
    for (let i = 0; i < 25; i++) {
      index._addUnmitigatedLevel({
        id: `LEVEL_${i}`,
        type: "FVG",
        direction: "BULLISH",
        upper_bound: 100 + i,
        lower_bound: 90 + i,
        price: 95 + i,
        mitigated: false,
      });
    }
    expect(index.getUnmitigated().length).toBe(10);
    expect(index.getUnmitigated()[0].id).toBe("LEVEL_15");
    expect(index.getUnmitigated()[9].id).toBe("LEVEL_24");
  });

  it("supports custom filter callbacks and reset", () => {
    const index = new SpatialMemoryIndex();
    index._addUnmitigatedLevel({
      id: "L1",
      type: "FVG",
      direction: "BULLISH",
      upper_bound: 100,
      lower_bound: 90,
      price: 95,
      mitigated: false,
    });
    index._addUnmitigatedLevel({
      id: "L2",
      type: "OB",
      direction: "BEARISH",
      upper_bound: 200,
      lower_bound: 190,
      price: 195,
      mitigated: false,
    });

    const fvgs = index.getUnmitigated((lvl) => lvl.type === "FVG");
    expect(fvgs.length).toBe(1);
    expect(fvgs[0].id).toBe("L1");

    index.reset();
    expect(index.getUnmitigated().length).toBe(0);
    expect(index.getSummary().activeCount).toBe(0);
  });

  // ===========================================================================
  // DOMAIN 5: PROVIDER V1 INTEGRATION & PRECEDENCE GUARANTEES
  // ===========================================================================

  it("Provider V1 generates mitigation reaction signal when price revisits unmitigated OB/FVG", () => {
    const v1 = new LiquidityReconstructionEngine();
    // 1. Initial 5 candles forming an FVG [101, 105]
    const initialCandles = [
      makeCandle(100, 100, 99, 100, 1000),
      makeCandle(100, 101, 99, 100, 2000),
      makeCandle(100, 101, 99, 100, 3000),
      makeCandle(101, 105, 100, 104, 4000),
      makeCandle(106, 108, 105, 107, 5000),
    ];
    v1.reconstruct({ intermediate: initialCandles });

    // 2. Later candles revisit the zone without immediate fresh FVG formation
    const revisitCandles = [
      makeCandle(112, 114, 110, 112, 10000),
      makeCandle(112, 114, 110, 112, 11000),
      makeCandle(112, 114, 110, 112, 12000),
      makeCandle(112, 114, 110, 112, 13000),
      makeCandle(108, 108, 103, 106, 14000), // low (103) tests inside bullish zone [101, 105] and closes 106
    ];
    const res = v1.reconstruct({ intermediate: revisitCandles });
    expect(res.signal).toBe("long");
    expect(res.narrative).toMatch(/BULLISH_(FVG|OB)_MITIGATION_REACTION/);
    expect(res.spatialMemory).toBeDefined();
    expect(res.spatialMemory.activeCount).toBeGreaterThanOrEqual(1);
  });

  it("Provider V1 preserves standard FVG and sweep detection signals without interference", () => {
    const v1 = new LiquidityReconstructionEngine();
    // Bullish FVG test
    const fvgCandles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(100, 100, 99, 100, 2000), // prev3
      makeCandle(101, 104, 101, 103, 3000), // prev2 (bullish: close 103 > open 101)
      makeCandle(105, 106, 103, 105, 4000), // prev1
      makeCandle(106, 107, 105, 106, 5000), // current
    ];
    const fvgRes = v1.reconstruct({ intermediate: fvgCandles });
    expect(fvgRes.signal).toBe("long");
    expect(fvgRes.narrative).toBe("BULLISH_FVG_DETECTED");

    // Sell-side sweep test
    const v1Sweep = new LiquidityReconstructionEngine();
    const sweepCandles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(100, 101, 99, 100, 2000),
      makeCandle(100, 101, 99, 100, 3000),
      makeCandle(100, 101, 99, 100, 4000), // prev1 (low 99, high 101)
      makeCandle(100, 100, 97, 100, 5000), // current (low 97 < 99, close 100 > 99, high 100 < 101)
    ];
    const sweepRes = v1Sweep.reconstruct({ intermediate: sweepCandles });
    expect(sweepRes.signal).toBe("long");
    expect(sweepRes.narrative).toBe("SELL_SIDE_LIQUIDITY_SWEPT");
  });

  it("T3.1: Fresh FVG and Sweep detection take strict precedence over historical spatial reaction", () => {
    const v1 = new LiquidityReconstructionEngine();
    // Prime spatial index with an active unmitigated level
    v1.spatialIndex._addUnmitigatedLevel({
      id: "OLD_BULLISH_OB",
      type: "OB",
      direction: "BULLISH",
      upper_bound: 105,
      lower_bound: 100,
      price: 102.5,
      formed_at: 500,
      mitigated: false,
    });

    // Provide 5 candles that simultaneously form a fresh Bearish FVG while touching old bullish OB
    const freshBearishFvgCandles = [
      makeCandle(100, 101, 99, 100, 1000),
      makeCandle(110, 111, 110, 110, 2000), // prev3 (low 110)
      makeCandle(109, 109, 105, 106, 3000), // prev2 (bearish close 106 < open 109)
      makeCandle(104, 105, 103, 104, 4000), // prev1 (high 105 < prev3 low 110)
      makeCandle(103, 104, 102, 103, 5000), // current (low 102 touches old OB [100, 105], but fresh FVG present)
    ];
    const res = v1.reconstruct({ intermediate: freshBearishFvgCandles });
    // Fresh FVG MUST take precedence
    expect(res.signal).toBe("short");
    expect(res.narrative).toBe("BEARISH_FVG_DETECTED");
  });

  it("T3.2: Handles synthetic minimal arrays (N=4, N=5) without throwing or returning undefined", () => {
    const v1 = new LiquidityReconstructionEngine();
    const res4 = v1.reconstruct({
      intermediate: [
        makeCandle(100, 101, 99, 100),
        makeCandle(100, 101, 99, 100),
        makeCandle(100, 101, 99, 100),
        makeCandle(100, 101, 99, 100),
      ],
    });
    expect(res4.signal).toBe("flat");
    expect(res4.narrative).toBe("INSUFFICIENT_DATA");

    const res5 = v1.reconstruct({
      intermediate: [
        makeCandle(100, 100, 100, 100),
        makeCandle(100, 100, 100, 100),
        makeCandle(100, 100, 100, 100),
        makeCandle(100, 100, 100, 100),
        makeCandle(100, 100, 100, 100),
      ],
    });
    expect(res5.signal).toBe("flat");
    expect(res5.narrative).toBe("NEUTRAL_LIQUIDITY");
  });
});

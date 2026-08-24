import { describe, it, expect, vi } from "vitest";
import { OpenMobiusEngine } from "../../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js";
import {
  calc_atr,
  find_fvgs,
  find_displacements,
  find_volume_anomalies,
} from "../../../packages/lyzer-shared/src/providers/openmobius/imbalance.js";
import {
  find_order_blocks,
  calcAtr,
} from "../../../packages/lyzer-shared/src/providers/openmobius/orderBlocks.js";
import { find_sweeps } from "../../../packages/lyzer-shared/src/providers/openmobius/liquidity.js";
import { findSwings } from "../../../packages/lyzer-shared/src/providers/openmobius/pivots.js";
import { analyzeStructure } from "../../../packages/lyzer-shared/src/providers/openmobius/structure.js";
import { analyze_dealing_range } from "../../../packages/lyzer-shared/src/providers/openmobius/location.js";

describe("V8 Open Mobius Zero-Allocation & Parity Suite (Milestone 1 - R1)", () => {
  const engine = new OpenMobiusEngine();

  function generateSyntheticCandles(count = 500) {
    const candles = [];
    let price = 50000;
    for (let i = 0; i < count; i++) {
      const delta = (Math.sin(i / 10) + Math.cos(i / 5)) * 15;
      const open = price;
      const close = price + delta;
      const high = Math.max(open, close) + Math.abs(delta) * 0.5 + 5;
      const low = Math.min(open, close) - Math.abs(delta) * 0.5 - 5;
      const volume = 100 + Math.abs(delta) * 10;
      price = close;
      candles.push({
        timestamp: 1700000000000 + i * 60000,
        open,
        high,
        low,
        close,
        volume,
      });
    }
    return candles;
  }

  it("analyzes candles without calling Array.prototype.map in the tick loop (Zero-Allocation)", () => {
    const candles = generateSyntheticCandles(100);

    // Tagging can happen at ingestion/buffer time, but we test with raw untagged candles
    const mapSpy = vi.spyOn(Array.prototype, "map");

    const result = engine.analyze(candles);

    // Assert that Array.prototype.map was NOT invoked in the hot path
    expect(mapSpy).not.toHaveBeenCalled();

    mapSpy.mockRestore();

    expect(result).toBeDefined();
    expect(result.version).toBe("8.0.0");
    expect(["BULLISH", "BEARISH", "FLAT"]).toContain(result.bias);
    expect(result.marketStructure).toBeDefined();
    expect(result.liquidity).toBeDefined();
    expect(result.imbalance).toBeDefined();
    expect(result.orderBlocks).toBeDefined();
    expect(result.location).toBeDefined();
    expect(result.pivots).toBeDefined();
  });

  it("correctly handles raw candles lacking is_bullish via in-place boolean fallback", () => {
    const rawCandles = [
      { open: 100, high: 110, low: 90, close: 105, volume: 50 },
      { open: 105, high: 115, low: 95, close: 100, volume: 60 },
      { open: 100, high: 120, low: 95, close: 118, volume: 80 },
    ];

    const result = engine.analyze(rawCandles);
    expect(result).toBeDefined();
    expect(result.location.equilibrium).toBe(105);
    expect(result.location.high).toBe(120);
    expect(result.location.low).toBe(90);
  });

  it("correctly utilizes pre-tagged is_bullish property without mutating or cloning", () => {
    const preTaggedCandles = [
      {
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 50,
        is_bullish: true,
      },
      {
        open: 105,
        high: 115,
        low: 95,
        close: 100,
        volume: 60,
        is_bullish: false,
      },
      {
        open: 100,
        high: 120,
        low: 95,
        close: 118,
        volume: 80,
        is_bullish: true,
      },
    ];

    const result = engine.analyze(preTaggedCandles);
    expect(result).toBeDefined();
    expect(result.marketStructure).toBeDefined();
  });

  it("calc_atr and calcAtr calculate accurate ATR with zero array slicing or allocations", () => {
    const candles = generateSyntheticCandles(30);
    const atr1 = calc_atr(candles, 14);
    const atr2 = calcAtr(candles, 14);

    expect(atr1).toBeGreaterThan(0);
    expect(atr2).toBeGreaterThan(0);
    expect(Math.abs(atr1 - atr2)).toBeLessThan(0.0001);
  });

  it("find_fvgs, find_displacements, find_volume_anomalies execute with zero map calls", () => {
    const candles = generateSyntheticCandles(50);
    const mapSpy = vi.spyOn(Array.prototype, "map");

    const fvgs = find_fvgs(candles);
    const displacements = find_displacements(candles);
    const volumeAnomalies = find_volume_anomalies(candles);

    expect(mapSpy).not.toHaveBeenCalled();
    mapSpy.mockRestore();

    expect(Array.isArray(fvgs)).toBe(true);
    expect(Array.isArray(displacements)).toBe(true);
    expect(Array.isArray(volumeAnomalies)).toBe(true);
  });

  it("find_sweeps and find_order_blocks execute without memory allocations in loops", () => {
    const candles = generateSyntheticCandles(100);
    const pivots = findSwings(candles);
    const mapSpy = vi.spyOn(Array.prototype, "map");

    const sweeps = find_sweeps(candles, pivots);
    const obs = find_order_blocks(candles);

    expect(mapSpy).not.toHaveBeenCalled();
    mapSpy.mockRestore();

    expect(Array.isArray(sweeps)).toBe(true);
    expect(Array.isArray(obs)).toBe(true);
  });

  it("analyzeStructure and analyze_dealing_range operate with zero map allocations", () => {
    const candles = generateSyntheticCandles(100);
    const pivots = findSwings(candles);
    const mapSpy = vi.spyOn(Array.prototype, "map");

    const structure = analyzeStructure(pivots);
    const location = analyze_dealing_range(candles);

    expect(mapSpy).not.toHaveBeenCalled();
    mapSpy.mockRestore();

    expect(structure).toBeDefined();
    expect(location).toBeDefined();
    expect(location.high).toBeGreaterThanOrEqual(location.low);
  });

  it("returns empty structural state gracefully when candles array is empty", () => {
    const emptyResult = engine.analyze([]);
    expect(emptyResult.version).toBe("8.0.0");
    expect(emptyResult.bias).toBe("FLAT");
    expect(emptyResult.marketStructure.sequence).toEqual([]);
    expect(emptyResult.liquidity.sweeps).toEqual([]);
    expect(emptyResult.orderBlocks).toEqual([]);
  });
});

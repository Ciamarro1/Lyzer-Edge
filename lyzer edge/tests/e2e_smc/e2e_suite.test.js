import { test, expect, beforeEach, describe } from 'vitest';
import { StreamEngine } from "../../backend/streamEngine.js";
import { TruthKernel } from "../../../packages/lyzer-shared/src/engine/kernel.js";
import { court } from "../../../packages/lyzer-constitution/src/eca/court.js";
import { ContinuousCLIST } from "../../../packages/lyzer-constitution/src/eca/c-clist.js";
import { MetaObservationLayer } from "../../../packages/lyzer-constitution/src/eca/mol.js";
import { LiquidityReconstructionEngine } from "../../../packages/lyzer-shared/src/providers/v1_smc_ict.js";
import { StructuralBoundaryEngine } from "../../../packages/lyzer-shared/src/providers/v2_snd_snr.js";
import { MomentumRsiEngine } from "../../../packages/lyzer-shared/src/providers/v3_momentum_rsi.js";
import { ScaleNormalizer } from "../../../packages/lyzer-shared/src/csrl/ScaleNormalizer.js";
import { ExecutionTriggerLayer } from "../../../packages/lyzer-shared/src/engine/executionTriggerLayer.js";
import { ledger } from "../../../packages/lyzer-constitution/src/eca/ledger.js";

// Helper functions for candles
function makeCandle(close, high = null, low = null, open = null, openTime = Date.now()) {
  const o = open !== null ? open : close;
  return {
    open: o,
    high: high !== null ? high : Math.max(o, close) + 0.1,
    low: low !== null ? low : Math.min(o, close) - 0.1,
    close: close,
    volume: 10,
    openTime,
    timestamp: openTime,
    closed: true
  };
}

function makeFlatCandles(n, p, startOpenTime = Date.now()) {
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push(makeCandle(p, p, p, p, startOpenTime + i * 60000));
  }
  return list;
}

function makeUpwardCandles(n, startPrice, startOpenTime = Date.now()) {
  const list = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const next = price + 1;
    list.push(makeCandle(next, next, price, price, startOpenTime + i * 60000));
    price = next;
  }
  return list;
}

function makeDownwardCandles(n, startPrice, startOpenTime = Date.now()) {
  const list = [];
  let price = startPrice;
  for (let i = 0; i < n; i++) {
    const next = price - 1;
    list.push(makeCandle(next, price, next, price, startOpenTime + i * 60000));
    price = next;
  }
  return list;
}

beforeEach(() => {
  // Reset court singleton state before each test to ensure test isolation
  court.configure({
    dvfFloor: 0.1,
    stressAccumulation: 0.002,
    lethalIllusionLimit: 0.9,
    stressRelease: 0.1
  }, {
    sclThreshold: 3
  });
  court.cclist.stressLevel = 0.0;
  court.mol.state = 'EXECUTE';
  court.mol.durationOfInaction = 0;
  court.mol.structuralCoherenceLock = 0;

  // Reset ledger singleton to prevent state leakage (e.g. VETO_EDGE_RIDING)
  ledger.entries = [];
  ledger.edgeRidingCounters.drawdownNearMisses = 0;
  ledger.edgeRidingCounters.slippageNearMisses = 0;
});

describe('StreamEngine SMC Transformation - Tier 1: Feature Coverage (55 tests)', () => {

  // --- Feature 1: Multi-Timeframe Ingestion & Alignment (MTF) ---
  test('Tier 1 - F1 (MTF) 1: Ingestion of 1m candle updates fast candles list', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    const candle = makeCandle(100, 105, 95, 100, 1000);
    engine.updateMtfCandles(candle);
    expect(engine.candles.length).toBe(1);
    expect(engine.candles[0].close).toBe(100);
  });

  test('Tier 1 - F1 (MTF) 2: Ingestion of 5m candle updates intermediate candles list', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.mtfCandles['5m'] = [{ openTime: 0, open: 100, high: 100, low: 100, close: 100, volume: 10 }];
    const candle = makeCandle(105, 110, 105, 105, 1000); // openTime = 1000, aligns with 5m bucket starting at 0
    engine.updateMtfCandles(candle);
    expect(engine.mtfCandles['5m'][0].close).toBe(105);
    expect(engine.mtfCandles['5m'][0].high).toBe(110);
    expect(engine.mtfCandles['5m'][0].volume).toBe(20);
  });

  test('Tier 1 - F1 (MTF) 3: Timeframe aliases correctly resolve to lists', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.mtfCandles['1m'] = [{ close: 1 }];
    engine.mtfCandles['15m'] = [{ close: 15 }];
    engine.mtfCandles['1h'] = [{ close: 60 }];
    expect(engine.mtfCandles.fast[0].close).toBe(1);
    expect(engine.mtfCandles.intermediate[0].close).toBe(15);
    expect(engine.mtfCandles.slow[0].close).toBe(60);
  });

  test('Tier 1 - F1 (MTF) 4: Warmup synthetic candles populates candles history', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.warmupSyntheticCandles();
    expect(engine.candles.length).toBe(110);
  });

  test('Tier 1 - F1 (MTF) 5: Ingesting newer candles correctly pushes to the list', () => {
    const engine = new StreamEngine({ mode: 'SIMULATION' });
    engine.mtfCandles['1m'] = makeFlatCandles(5, 100);
    const newCandle = makeCandle(105, 106, 104, 105, Date.now());
    engine.updateMtfCandles(newCandle);
    expect(engine.candles.length).toBe(6);
    expect(engine.candles[5].close).toBe(105);
  });

  // --- Feature 2: Provider V1 (SMC/ICT) ---
  test('Tier 1 - F2 (V1 SMC) 1: Bullish FVG signal detection', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 101, 99, 100), // dummy for length >= 5
      makeCandle(100, 100, 99, 100), // prev3
      makeCandle(102, 104, 101, 101), // prev2
      makeCandle(105, 106, 103, 105), // prev1
      makeCandle(106, 107, 105, 106), // current
    ];
    // Bullish FVG: prev3.high (100) < prev1.low (103) && prev2.close > prev2.open
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('BULLISH_FVG_DETECTED');
  });

  test('Tier 1 - F2 (V1 SMC) 2: Bearish FVG signal detection', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 101, 99, 100), // dummy for length >= 5
      makeCandle(110, 111, 110, 110), // prev3
      makeCandle(108, 109, 105, 109), // prev2 (bearish)
      makeCandle(104, 105, 103, 104), // prev1
      makeCandle(103, 104, 102, 103), // current
    ];
    // Bearish FVG: prev3.low (110) > prev1.high (105) && prev2.close < prev2.open
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('BEARISH_FVG_DETECTED');
  });

  test('Tier 1 - F2 (V1 SMC) 3: Sell-side liquidity sweep signal detection', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100), // prev1
      makeCandle(101, 102, 97, 98), // current: low (97) < prev1.low (99), close (101) > prev1.low (99)
    ];
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('SELL_SIDE_LIQUIDITY_SWEPT');
  });

  test('Tier 1 - F2 (V1 SMC) 4: Buy-side liquidity sweep signal detection', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100), // prev1
      makeCandle(99, 103, 98, 102), // current: high (103) > prev1.high (101), close (99) < prev1.high (101)
    ];
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('BUY_SIDE_LIQUIDITY_SWEPT');
  });

  test('Tier 1 - F2 (V1 SMC) 5: Neutral/flat market reconstruction', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = makeFlatCandles(5, 100);
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('flat');
    expect(res.narrative).toBe('NEUTRAL_LIQUIDITY');
  });

  // --- Feature 3: Provider V2 (Structural Boundary) ---
  test('Tier 1 - F3 (V2 SNR) 1: Support bounce signal detection', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 100);
    candles[3] = makeCandle(50, 51, 50, 50); // Set support zone to 50
    candles.push(makeCandle(50.05, 51, 50, 50.05)); // close (50.05) is near support (50), close >= support
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('SUPPORT_BOUNCE');
  });

  test('Tier 1 - F3 (V2 SNR) 2: Resistance rejection signal detection', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 50);
    candles[4] = makeCandle(100, 100, 99, 100); // Set resistance zone to 100
    candles.push(makeCandle(99.9, 100, 99, 99.9)); // close (99.9) is near resistance (100), close <= resistance
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('RESISTANCE_REJECTION');
  });

  test('Tier 1 - F3 (V2 SNR) 3: Resistance breakout signal detection', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 50);
    candles[5] = makeCandle(100, 100, 99, 100); // Set resistance zone to 100
    candles.push(makeCandle(100.1, 101, 100, 100.1)); // close (100.1) > resistance (100)
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('RESISTANCE_BREAKOUT');
  });

  test('Tier 1 - F3 (V2 SNR) 4: Support breakdown signal detection', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 100);
    candles[2] = makeCandle(50, 51, 50, 50); // Set support zone to 50
    candles.push(makeCandle(49.95, 50, 49, 49.95)); // close (49.95) < support (50)
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('SUPPORT_BREAKDOWN');
  });

  test('Tier 1 - F3 (V2 SNR) 5: Trending to supply/demand neutral zones', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 100);
    candles.push(makeCandle(105, 106, 104, 100)); // Far from boundaries (min 100, max 100), close > prev1.close
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('TRENDING_TO_SUPPLY');
  });

  // --- Feature 4: Provider V3 (Momentum RSI) ---
  test('Tier 1 - F4 (V3 RSI) 1: Oversold with bullish momentum signal', () => {
    const engine = new MomentumRsiEngine();
    // Generate 15 downward candles
    const candles = makeDownwardCandles(15, 100);
    // Generate 6 upward candles to turn 5-period momentum positive
    let last = candles[candles.length - 1];
    for (let i = 0; i < 6; i++) {
      const nextClose = last.close + 0.5;
      const c = makeCandle(nextClose, nextClose + 0.1, last.close, last.close);
      candles.push(c);
      last = c;
    }
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('OVERSOLD_WITH_BULLISH_MOMENTUM');
  });

  test('Tier 1 - F4 (V3 RSI) 2: Overbought with bearish momentum signal', () => {
    const engine = new MomentumRsiEngine();
    // Generate 15 upward candles
    const candles = makeUpwardCandles(15, 100);
    // Generate 6 downward candles to turn 5-period momentum negative
    let last = candles[candles.length - 1];
    for (let i = 0; i < 6; i++) {
      const nextClose = last.close - 0.5;
      const c = makeCandle(nextClose, last.close, nextClose, last.close);
      candles.push(c);
      last = c;
    }
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('OVERBOUGHT_WITH_BEARISH_MOMENTUM');
  });

  test('Tier 1 - F4 (V3 RSI) 3: Strong bullish momentum breakout signal', () => {
    const engine = new MomentumRsiEngine();
    const candles = [];
    let p = 100;
    // Generate 15 neutral flat candles
    for (let i = 0; i < 15; i++) {
      p += (i % 2 === 0 ? 0.2 : -0.2);
      candles.push(makeCandle(p, p + 0.1, p - 0.1, p));
    }
    // Make last 6 candles trend up strongly but not overbought
    let last = candles[candles.length - 1];
    for (let i = 0; i < 6; i++) {
      const nextClose = last.close + 0.1;
      const c = makeCandle(nextClose, nextClose + 0.1, last.close, last.close);
      candles.push(c);
      last = c;
    }
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBe('long');
    expect(res.narrative).toBe('STRONG_BULLISH_MOMENTUM_BREAKOUT');
  });

  test('Tier 1 - F4 (V3 RSI) 4: Strong bearish momentum breakout signal', () => {
    const engine = new MomentumRsiEngine();
    const candles = [];
    let p = 100;
    // Generate 15 neutral flat candles
    for (let i = 0; i < 15; i++) {
      p += (i % 2 === 0 ? 0.2 : -0.2);
      candles.push(makeCandle(p, p + 0.1, p - 0.1, p));
    }
    // Make last 6 candles trend down strongly but not oversold
    let last = candles[candles.length - 1];
    for (let i = 0; i < 6; i++) {
      const nextClose = last.close - 0.1;
      const c = makeCandle(nextClose, last.close, nextClose, last.close);
      candles.push(c);
      last = c;
    }
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBe('short');
    expect(res.narrative).toBe('STRONG_BEARISH_MOMENTUM_BREAKOUT');
  });

  test('Tier 1 - F4 (V3 RSI) 5: Neutral momentum and RSI', () => {
    const engine = new MomentumRsiEngine();
    const candles = makeFlatCandles(25, 100);
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBe('flat');
    expect(res.narrative).toBe('MOMENTUM_NEUTRAL');
  });

  // --- Feature 5: Streaming Consensus Residualization (SCD) ---
  test('Tier 1 - F5 (SCD) 1: Consensus destruction when signals match', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.1 });
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'long', confidence: 80 },
      v3: { signal: 'long', confidence: 80 }
    };
    // If they all match exactly, divergence is 0, directionalTension = 2.4.
    // consensusLimit > 0 && divergence < 0.1 && tension > 1.0 -> consensus destroyed, DVF = 0
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(true);
    expect(res.dvf).toBe(0);
  });

  test('Tier 1 - F5 (SCD) 2: No consensus destruction when signals diverge', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.1 });
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'short', confidence: 80 },
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
    expect(res.dvf).toBeGreaterThan(0.1);
  });

  test('Tier 1 - F5 (SCD) 3: Correct calculation of directional tension', () => {
    const kernel = new TruthKernel();
    const providers = {
      v1: { signal: 'long', confidence: 50 }, // vec = 0.5
      v2: { signal: 'long', confidence: 50 }, // vec = 0.5
      v3: { signal: 'short', confidence: 30 } // vec = -0.3
    };
    const res = kernel.evaluate(providers);
    expect(res.tension).toBeCloseTo(0.7); // 0.5 + 0.5 - 0.3 = 0.7
  });

  test('Tier 1 - F5 (SCD) 4: High divergence is preserved as positive DVF', () => {
    const kernel = new TruthKernel();
    const providers = {
      v1: { signal: 'long', confidence: 90 }, // vec = 0.9
      v2: { signal: 'short', confidence: 90 }, // vec = -0.9
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers);
    expect(res.dvf).toBeCloseTo(1.8); // max(1.8, 0.9, 0.9)
  });

  test('Tier 1 - F5 (SCD) 5: High tension (> 1.0) required to trigger consensus destruction', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 30 }, // vec = 0.3
      v2: { signal: 'long', confidence: 30 }, // vec = 0.3
      v3: { signal: 'long', confidence: 30 }  // vec = 0.3
    };
    // divergence = 0, tension = 0.9 <= 1.0
    // consensus checked: tension must be > 1.0. Thus not consensus.
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
    expect(res.dvf).toBe(0);
  });

  // --- Feature 6: Execution Eligibility Trigger (TRG Threshold) ---
  test('Tier 1 - F6 (ETT) 1: Authorizes execution when TRG >= threshold', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.4 });
    const providers = {
      v1: { signal: 'long', confidence: 80 }, // vec = 0.8
      v2: { signal: 'short', confidence: 80 }, // vec = -0.8
      v3: { signal: 'flat', confidence: 0 }
    }; // divergence = 1.6 -> trg = 1.6^2 = 2.56
    const res = kernel.evaluate(providers);
    expect(res.trg).toBeGreaterThanOrEqual(0.4);
    expect(res.eef).toBe(true);
    expect(res.reason_codes[0]).toBe('EXECUTION_TRIGGERED_BY_ASYMMETRY');
  });

  test('Tier 1 - F6 (ETT) 2: Blocks execution when TRG < threshold', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.9 });
    const providers = {
      v1: { signal: 'long', confidence: 40 },
      v2: { signal: 'short', confidence: 40 },
      v3: { signal: 'flat', confidence: 0 }
    }; // div = 0.8 -> trg = 0.64 < 0.9
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(false);
    expect(res.reason_codes[0]).toBe('NO_ACTION_GEOMETRY_FLAT');
  });

  test('Tier 1 - F6 (ETT) 3: Vetoes execution under consensus destruction', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.1, consensusLimit: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'long', confidence: 80 },
      v3: { signal: 'long', confidence: 80 }
    }; // consensus destroyed -> DVF = 0, TRG = 0, isConsensus = true
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(false);
    expect(res.reason_codes[0]).toBe('BLOCKED_BY_FALSE_CONSENSUS');
  });

  test('Tier 1 - F6 (ETT) 4: Correct reason code assignment for geometry flat', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.5 });
    const providers = {
      v1: { signal: 'flat', confidence: 0 },
      v2: { signal: 'flat', confidence: 0 },
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers);
    expect(res.reason_codes).toContain('NO_ACTION_GEOMETRY_FLAT');
  });

  test('Tier 1 - F6 (ETT) 5: Correct reason code for false consensus block', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.2 });
    const providers = {
      v1: { signal: 'short', confidence: 90 },
      v2: { signal: 'short', confidence: 90 },
      v3: { signal: 'short', confidence: 90 }
    };
    const res = kernel.evaluate(providers);
    expect(res.reason_codes).toContain('BLOCKED_BY_FALSE_CONSENSUS');
  });

  // --- Feature 7: Truth Kernel Reality Divergence (LHDS Veto) ---
  test('Tier 1 - F7 (LHDS) 1: Reality divergence veto when LHDS exceeds limit', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
    const providers = {
      v1: { signal: 'long', confidence: 90 },
      v2: { signal: 'short', confidence: 90 },
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers, { lhds: 0.9 }); // LHDS = 0.9 > 0.8
    expect(res.epistemic_authority).toBe('VETO');
    expect(res.eef).toBe(false);
    expect(res.reason_codes).toContain('VETO_REALITY_DIVERGENCE');
  });

  test('Tier 1 - F7 (LHDS) 2: Normal observed state when LHDS is low and SDS < 0.3', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.1 });
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'short', confidence: 80 }
    };
    const res = kernel.evaluate(providers, { lhds: 0.1, scaleDivergence: 0.2 });
    expect(res.epistemic_authority).toBe('OBSERVED');
    expect(res.eef).toBe(true);
  });

  test('Tier 1 - F7 (LHDS) 3: Epistemic authority INFERRED when SDS is intermediate', () => {
    const kernel = new TruthKernel();
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'short', confidence: 80 }
    };
    const res = kernel.evaluate(providers, { lhds: 0.1, scaleDivergence: 0.5 });
    expect(res.epistemic_authority).toBe('INFERRED');
  });

  test('Tier 1 - F7 (LHDS) 4: Veto reality divergence overrides normal EEF triggers', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.1, lhdsVetoLimit: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 90 },
      v2: { signal: 'short', confidence: 90 }
    }; // Normal TRG is extremely high (3.24), but LHDS is higher than limit
    const res = kernel.evaluate(providers, { lhds: 0.6 });
    expect(res.eef).toBe(false);
    expect(res.reason_codes).toContain('VETO_REALITY_DIVERGENCE');
  });

  test('Tier 1 - F7 (LHDS) 5: Veto reason code is correctly set to VETO_REALITY_DIVERGENCE', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.4 });
    const providers = { v1: { signal: 'long', confidence: 80 } };
    const res = kernel.evaluate(providers, { lhds: 0.5 });
    expect(res.reason_codes[0]).toBe('VETO_REALITY_DIVERGENCE');
  });

  // --- Feature 8: Truth Kernel Ontological Collapse ---
  test('Tier 1 - F8 (Collapse) 1: Veto ontological collapse when SDS > 0.7 and TRG >= limit', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 90 }, // vec = 0.9
      v2: { signal: 'short', confidence: 90 }, // vec = -0.9
      v3: { signal: 'flat', confidence: 0 }
    }; // trg = (1.8)^2 = 3.24 >= 0.5
    const res = kernel.evaluate(providers, { scaleDivergence: 0.8 }); // SDS = 0.8 > 0.7
    expect(res.epistemic_authority).toBe('VETO');
    expect(res.eef).toBe(false);
    expect(res.reason_codes).toContain('VETO_ONTOLOGICAL_COLLAPSE');
  });

  test('Tier 1 - F8 (Collapse) 2: No veto when SDS > 0.7 but TRG < limit', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.9 });
    const providers = {
      v1: { signal: 'long', confidence: 40 },
      v2: { signal: 'short', confidence: 40 }
    }; // trg = 0.64 < 0.9
    const res = kernel.evaluate(providers, { scaleDivergence: 0.8 });
    expect(res.epistemic_authority).toBe('INFERRED');
    expect(res.reason_codes).not.toContain('VETO_ONTOLOGICAL_COLLAPSE');
  });

  test('Tier 1 - F8 (Collapse) 3: Epistemic authority set to VETO during collapse', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.1 });
    const providers = { v1: { signal: 'long', confidence: 50 }, v2: { signal: 'short', confidence: 50 } };
    const res = kernel.evaluate(providers, { scaleDivergence: 0.9 });
    expect(res.epistemic_authority).toBe('VETO');
  });

  test('Tier 1 - F8 (Collapse) 4: Veto reason code is VETO_ONTOLOGICAL_COLLAPSE', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.1 });
    const providers = { v1: { signal: 'long', confidence: 50 }, v2: { signal: 'short', confidence: 50 } };
    const res = kernel.evaluate(providers, { scaleDivergence: 0.9 });
    expect(res.reason_codes[0]).toBe('VETO_ONTOLOGICAL_COLLAPSE');
  });

  test('Tier 1 - F8 (Collapse) 5: Authority set to INFERRED when SDS > 0.7 but TRG is low', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.8 });
    const providers = { v1: { signal: 'long', confidence: 30 } }; // low TRG
    const res = kernel.evaluate(providers, { scaleDivergence: 0.8 });
    expect(res.epistemic_authority).toBe('INFERRED');
  });

  // --- Feature 9: Constitutional Axiom Check ---
  test('Tier 1 - F9 (Axiom) 1: Court vetoes if rawState contains confidence', () => {
    const rawState = { trg: 0.5, confidence: 90 };
    const payload = { eef: true, reason: 'OK', epistemic_authority: 'OBSERVED' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    expect(token.granted).toBe(false);
    expect(token.reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 1 - F9 (Axiom) 2: Court vetoes if requestPayload contains prediction', () => {
    const rawState = { trg: 0.5 };
    const payload = { eef: true, reason: 'OK', prediction: 'UP', epistemic_authority: 'OBSERVED' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    expect(token.granted).toBe(false);
    expect(token.reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 1 - F9 (Axiom) 3: Valid permission request passes axiom check', () => {
    const rawState = { trg: 0.5, dvf: 0.5 };
    const payload = { eef: true, reason: 'OK', epistemic_authority: 'OBSERVED' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    // Under default constraint engine, rawState must pass ConstraintEngine checks
    expect(token.reason).not.toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 1 - F9 (Axiom) 4: Veto reason code is VETO_CONFIDENCE_ARROGANCE', () => {
    const rawState = { confidence: 0.5 };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true });
    expect(token.reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 1 - F9 (Axiom) 5: Permission check logs record to ledger', () => {
    const rawState = { trg: 0.5 };
    const payload = { eef: true, prediction: 'UP' };
    court.requestPermission('EXECUTE_TRADE', rawState, payload);
    const history = ledger.exportLedger();
    expect(history.length).toBeGreaterThan(0);
    expect(history[history.length - 1].reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  // --- Feature 10: C-CLIST Stress Oracle ---
  test('Tier 1 - F10 (C-CLIST) 1: Stress level increases when DVF < dvfFloor', () => {
    const cclist = new ContinuousCLIST({ dvfFloor: 0.5, stressAccumulation: 0.05 });
    cclist.evaluateStress(0.2, 0.1); // DVF (0.1) < Floor (0.5)
    expect(cclist.stressLevel).toBe(0.05);
  });

  test('Tier 1 - F10 (C-CLIST) 2: Stress level decreases when DVF >= dvfFloor', () => {
    const cclist = new ContinuousCLIST({ dvfFloor: 0.1, stressRelease: 0.05 });
    cclist.stressLevel = 0.2;
    cclist.evaluateStress(0.2, 0.3); // DVF (0.3) >= Floor (0.1)
    expect(cclist.stressLevel).toBeCloseTo(0.15);
  });

  test('Tier 1 - F10 (C-CLIST) 3: Lethal illusion veto triggered when stress reaches limit', () => {
    court.cclist = new ContinuousCLIST({ lethalIllusionLimit: 0.5, dvfFloor: 1.0, stressAccumulation: 0.6 });
    const rawState = { trg: 0.5, dvf: 0.1 }; // dvf < floor, stress will jump by 0.6
    const payload = { eef: true, reason: 'OK', epistemic_authority: 'OBSERVED' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    expect(token.granted).toBe(false);
    expect(token.reason).toBe('VETO_LETHAL_STABILITY_ILLUSION');
  });

  test('Tier 1 - F10 (C-CLIST) 4: Instant maximal stress on TRG explosion (> 2.0)', () => {
    const cclist = new ContinuousCLIST();
    const res = cclist.evaluateStress(2.5, 0.5); // TRG > 2.0
    expect(res.stressLevel).toBe(1.0);
    expect(res.isLethalIllusion).toBe(true);
  });

  test('Tier 1 - F10 (C-CLIST) 5: Stress release bounded to 0.0 floor', () => {
    const cclist = new ContinuousCLIST({ stressRelease: 0.5 });
    cclist.stressLevel = 0.2;
    const res = cclist.evaluateStress(0.5, 0.8);
    expect(res.stressLevel).toBe(0.0);
  });

  // --- Feature 11: MOL Recovery Lock ---
  test('Tier 1 - F11 (MOL) 1: Kernel veto moves MOL to VETO state', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 3 });
    const res = mol.evaluateState({ scale_divergence: 0.1 }, { epistemic_authority: 'VETO' });
    expect(res.molState).toBe('VETO');
    expect(res.canExecute).toBe(false);
  });

  test('Tier 1 - F11 (MOL) 2: Shift to RECOVERY state when kernel recovering', () => {
    const mol = new MetaObservationLayer();
    mol.state = 'VETO';
    const res = mol.evaluateState({ scale_divergence: 0.5 }, { epistemic_authority: 'OBSERVED' });
    expect(res.molState).toBe('RECOVERY');
    expect(res.canExecute).toBe(false);
  });

  test('Tier 1 - F11 (MOL) 3: SCL increments when SDS <= 0.7 in recovery', () => {
    const mol = new MetaObservationLayer();
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 1;
    const res = mol.evaluateState({ scale_divergence: 0.4 }, { epistemic_authority: 'OBSERVED' });
    expect(res.scl).toBe(2);
  });

  test('Tier 1 - F11 (MOL) 4: Resetting SCL to 0 when SDS > 0.7 in recovery', () => {
    const mol = new MetaObservationLayer();
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 2;
    const res = mol.evaluateState({ scale_divergence: 0.8 }, { epistemic_authority: 'OBSERVED' });
    expect(res.scl).toBe(0);
    expect(res.molState).toBe('RECOVERY');
  });

  test('Tier 1 - F11 (MOL) 5: Awakening and shifting to EXECUTE after threshold met', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 2 });
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 1;
    const res = mol.evaluateState({ scale_divergence: 0.3 }, { epistemic_authority: 'OBSERVED' });
    expect(res.molState).toBe('EXECUTE');
    expect(res.canExecute).toBe(true);
  });
});

describe('StreamEngine SMC Transformation - Tier 2: Boundary Value Analysis (55 tests)', () => {

  // --- Feature 1 BVA: Multi-Timeframe Ingestion & Alignment ---
  test('Tier 2 - F1 (MTF) BVA 1: Empty lists handled safely', () => {
    const scaleNormalizer = new ScaleNormalizer();
    const res = scaleNormalizer.alignScales({});
    expect(res).toBeDefined();
  });

  test('Tier 2 - F1 (MTF) BVA 2: Shift limit checks', () => {
    const engine = new StreamEngine();
    engine.mtfCandles['1m'] = new Array(3000).fill(makeCandle(100));
    engine.updateMtfCandles(makeCandle(101));
    expect(engine.mtfCandles['1m'].length).toBe(3000);
    expect(engine.mtfCandles['1m'][2999].close).toBe(101);
  });

  test('Tier 2 - F1 (MTF) BVA 3: Future timestamp ingestion', () => {
    const engine = new StreamEngine();
    engine.mtfCandles['5m'] = [{ openTime: 0, open: 100, high: 100, low: 100, close: 100 }];
    const futureCandle = makeCandle(100, 100, 100, 100, 100000000000);
    engine.updateMtfCandles(futureCandle);
    expect(engine.mtfCandles['5m'].length).toBe(2);
  });

  test('Tier 2 - F1 (MTF) BVA 4: ScaleNormalizer handles single candle lists', () => {
    const scaleNormalizer = new ScaleNormalizer();
    const res = scaleNormalizer.normalize([makeCandle(100)]);
    expect(res).toBeDefined();
  });

  test('Tier 2 - F1 (MTF) BVA 5: Bucket updates on matching timestamps', () => {
    const engine = new StreamEngine();
    engine.mtfCandles['15m'] = [{ openTime: 900000, open: 100, high: 100, low: 100, close: 100, volume: 1 }];
    const matchingCandle = { openTime: 900000, open: 100, high: 105, low: 95, close: 102, volume: 2 };
    engine.updateMtfCandles(matchingCandle);
    expect(engine.mtfCandles['15m'].length).toBe(1);
    expect(engine.mtfCandles['15m'][0].high).toBe(105);
    expect(engine.mtfCandles['15m'][0].low).toBe(95);
  });

  // --- Feature 2 BVA: Provider V1 (SMC/ICT) ---
  test('Tier 2 - F2 (V1 SMC) BVA 1: Less than 5 candles returns insufficient data', () => {
    const engine = new LiquidityReconstructionEngine();
    const res = engine.reconstruct({ intermediate: makeFlatCandles(4, 100) });
    expect(res.signal).toBe('flat');
    expect(res.narrative).toBe('INSUFFICIENT_DATA');
  });

  test('Tier 2 - F2 (V1 SMC) BVA 2: Conflicting FVG and Sweep signals drops confidence', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 100, 99, 100), // extra candle to make length = 5
      makeCandle(100, 100, 99, 100), // prev3
      makeCandle(102, 104, 101, 101), // prev2
      makeCandle(105, 106, 103, 105), // prev1 (high = 106, low = 103)
      makeCandle(104, 107, 105, 104), // current (close = 104, high = 107 > 106 -> Bearish sweep)
    ]; // Bullish FVG check: prev3.high (100) < prev1.low (103) && prev2.close > prev2.open
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.confidence).toBeGreaterThan(0);
  });

  test('Tier 2 - F2 (V1 SMC) BVA 3: Normalization of confidence to max 100', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 100, 99, 100), // extra candle to make length = 5
      makeCandle(100, 100, 99, 100), // prev3
      makeCandle(102, 104, 101, 101), // prev2
      makeCandle(105, 106, 103, 105), // prev1 (low = 103, high = 106)
      makeCandle(104, 100, 95, 104), // current (low = 95 < 103, close = 104 > 103 -> Bullish sweep)
    ]; // Bullish FVG (+30) + Bullish Sweep (+40) = 70.
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.confidence).toBeLessThanOrEqual(100);
  });

  test('Tier 2 - F2 (V1 SMC) BVA 4: Extreme price spikes', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = [
      makeCandle(100, 10000, 1, 100),
      makeCandle(100, 10000, 1, 100),
      makeCandle(100, 10000, 1, 100),
      makeCandle(100, 10000, 1, 100),
      makeCandle(100, 10000, 1, 100)
    ];
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBeDefined();
  });

  test('Tier 2 - F2 (V1 SMC) BVA 5: Zero volume candles', () => {
    const engine = new LiquidityReconstructionEngine();
    const candles = makeFlatCandles(5, 100);
    candles.forEach(c => c.volume = 0);
    const res = engine.reconstruct({ intermediate: candles });
    expect(res.signal).toBe('flat');
  });

  // --- Feature 3 BVA: Provider V2 (Structural Boundary) ---
  test('Tier 2 - F3 (V2 SNR) BVA 1: Less than 10 candles returns insufficient data', () => {
    const engine = new StructuralBoundaryEngine();
    const res = engine.reconstruct({ slow: makeFlatCandles(9, 100) });
    expect(res.signal).toBe('flat');
    expect(res.narrative).toBe('INSUFFICIENT_DATA');
  });

  test('Tier 2 - F3 (V2 SNR) BVA 2: Support equal to resistance boundary', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(10, 100); // Max = Min = 100
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBeDefined();
  });

  test('Tier 2 - F3 (V2 SNR) BVA 3: Breakout threshold boundary check', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 100);
    // Resistance zone = 100. Let's make current.close exactly 100.2 (dist = 0.002)
    candles.push(makeCandle(100.2, 101, 100, 100.2));
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBeDefined();
  });

  test('Tier 2 - F3 (V2 SNR) BVA 4: Extreme price gap', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(9, 100);
    candles.push(makeCandle(10000, 10000, 100, 100)); // Price jumps 100x
    const res = engine.reconstruct({ slow: candles });
    expect(res.signal).toBeDefined();
  });

  test('Tier 2 - F3 (V2 SNR) BVA 5: Flat price breakouts check', () => {
    const engine = new StructuralBoundaryEngine();
    const candles = makeFlatCandles(15, 100);
    const res = engine.reconstruct({ slow: candles });
    // Should be near support/resistance since it is flat
    expect(res.narrative).toBeDefined();
  });

  // --- Feature 4 BVA: Provider V3 (Momentum RSI) ---
  test('Tier 2 - F4 (V3 RSI) BVA 1: Less than 20 candles returns insufficient data', () => {
    const engine = new MomentumRsiEngine();
    const res = engine.reconstruct({ fast: makeFlatCandles(19, 100) });
    expect(res.signal).toBe('flat');
    expect(res.narrative).toBe('INSUFFICIENT_DATA');
  });

  test('Tier 2 - F4 (V3 RSI) BVA 2: RSI at absolute boundary 0', () => {
    const engine = new MomentumRsiEngine();
    // Strictly decreasing prices gives rsi = 0
    const candles = makeDownwardCandles(25, 100);
    const rsi = engine.calculateRSI(candles);
    expect(rsi).toBe(0);
  });

  test('Tier 2 - F4 (V3 RSI) BVA 3: RSI at absolute boundary 100', () => {
    const engine = new MomentumRsiEngine();
    // Strictly increasing prices gives rsi = 100
    const candles = makeUpwardCandles(25, 100);
    const rsi = engine.calculateRSI(candles);
    expect(rsi).toBe(100);
  });

  test('Tier 2 - F4 (V3 RSI) BVA 4: Momentum ROC exactly at 0.05 threshold', () => {
    const engine = new MomentumRsiEngine();
    const candles = makeDownwardCandles(20, 100);
    const prev = candles[candles.length - 1];
    // We want momentum = ((current.close - prevMom.close) / prevMom.close) * 100 to be exactly 0.05
    const prevMom = candles[candles.length - 1 - 5];
    const targetClose = prevMom.close * 1.0005;
    candles.push(makeCandle(targetClose, targetClose + 0.1, targetClose - 0.1, targetClose));
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBeDefined();
  });

  test('Tier 2 - F4 (V3 RSI) BVA 5: Momentum ROC exactly at -0.05 threshold', () => {
    const engine = new MomentumRsiEngine();
    const candles = makeUpwardCandles(20, 100);
    const prev = candles[candles.length - 1];
    // We want momentum to be exactly -0.05
    const prevMom = candles[candles.length - 1 - 5];
    const targetClose = prevMom.close * 0.9995;
    candles.push(makeCandle(targetClose, targetClose + 0.1, targetClose - 0.1, targetClose));
    const res = engine.reconstruct({ fast: candles });
    expect(res.signal).toBeDefined();
  });

  // --- Feature 5 BVA: Streaming Consensus Residualization ---
  test('Tier 2 - F5 (SCD) BVA 1: consensusLimit = 0 disables residualization', () => {
    const kernel = new TruthKernel({ consensusLimit: 0 });
    const providers = {
      v1: { signal: 'long', confidence: 90 },
      v2: { signal: 'long', confidence: 90 },
      v3: { signal: 'long', confidence: 90 }
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
  });

  test('Tier 2 - F5 (SCD) BVA 2: Extremely large consensusLimit', () => {
    const kernel = new TruthKernel({ consensusLimit: 5.0 });
    const providers = {
      v1: { signal: 'long', confidence: 50 },
      v2: { signal: 'long', confidence: 50 },
      v3: { signal: 'long', confidence: 50 }
    }; // agrees, divergenceScalar = 0 < 5.0, tension = 1.5 > 1.0 -> consensus destroyed
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(true);
    expect(res.dvf).toBe(0);
  });

  test('Tier 2 - F5 (SCD) BVA 3: Tension exactly at 1.0 threshold', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 50 }, // vec = 0.5
      v2: { signal: 'long', confidence: 50 }, // vec = 0.5
      v3: { signal: 'flat', confidence: 0 }  // vec = 0.0 -> tension = 1.0 <= 1.0
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
  });

  test('Tier 2 - F5 (SCD) BVA 4: Max divergence with opposite signals', () => {
    const kernel = new TruthKernel();
    const providers = {
      v1: { signal: 'long', confidence: 100 },
      v2: { signal: 'short', confidence: 100 },
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers);
    expect(res.dvf).toBe(2.0);
  });

  test('Tier 2 - F5 (SCD) BVA 5: Neutral flat signals consensus checks', () => {
    const kernel = new TruthKernel();
    const providers = {
      v1: { signal: 'flat', confidence: 0 },
      v2: { signal: 'flat', confidence: 0 },
      v3: { signal: 'flat', confidence: 0 }
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
    expect(res.dvf).toBe(0);
  });

  // --- Feature 6 BVA: Execution Trigger Layer ---
  test('Tier 2 - F6 (ETT) BVA 1: TRG threshold set to 0.0', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.0 });
    const providers = { v1: { signal: 'long', confidence: 10 } }; // low but positive TRG
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(true);
  });

  test('Tier 2 - F6 (ETT) BVA 2: TRG threshold set to 1.0', () => {
    const kernel = new TruthKernel({ trgThreshold: 1.0 });
    const providers = { v1: { signal: 'long', confidence: 99 }, v2: { signal: 'short', confidence: 0 } }; // trg = 0.99^2 < 1.0
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(false);
  });

  test('Tier 2 - F6 (ETT) BVA 3: TRG exactly at threshold', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.64 });
    const providers = { v1: { signal: 'long', confidence: 80 }, v2: { signal: 'flat', confidence: 0 } }; // trg = 0.64
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(true);
  });

  test('Tier 2 - F6 (ETT) BVA 4: Negative TRG simulation', () => {
    const layer = new ExecutionTriggerLayer(0.5);
    const res = layer.evaluate({ trg: -0.1, destroyedConsensus: false });
    expect(res.eef).toBe(false);
  });

  test('Tier 2 - F6 (ETT) BVA 5: Very high TRG values', () => {
    const layer = new ExecutionTriggerLayer(0.5);
    const res = layer.evaluate({ trg: 100.0, destroyedConsensus: false });
    expect(res.eef).toBe(true);
  });

  // --- Feature 7 BVA: Truth Kernel Reality Divergence ---
  test('Tier 2 - F7 (LHDS) BVA 1: LHDS exactly at veto limit', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.8 });
    const providers = { v1: { signal: 'long', confidence: 50 } };
    const res = kernel.evaluate(providers, { lhds: 0.8 }); // Should not veto (needs > limit)
    expect(res.epistemic_authority).not.toBe('VETO');
  });

  test('Tier 2 - F7 (LHDS) BVA 2: LHDS at 0.0 does not veto', () => {
    const kernel = new TruthKernel();
    const res = kernel.evaluate({}, { lhds: 0.0 });
    expect(res.epistemic_authority).not.toBe('VETO');
  });

  test('Tier 2 - F7 (LHDS) BVA 3: LHDS at 1.0 always vetoes', () => {
    const kernel = new TruthKernel();
    const res = kernel.evaluate({}, { lhds: 1.0 });
    expect(res.epistemic_authority).toBe('VETO');
    expect(res.eef).toBe(false);
  });

  test('Tier 2 - F7 (LHDS) BVA 4: Invalid/missing LHDS defaults to 0.0', () => {
    const kernel = new TruthKernel();
    const res = kernel.evaluate({});
    expect(res.epistemic_authority).not.toBe('VETO');
  });

  test('Tier 2 - F7 (LHDS) BVA 5: Dynamic adjustment of lhdsVetoLimit at instantiation', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.1 });
    const res = kernel.evaluate({}, { lhds: 0.15 });
    expect(res.epistemic_authority).toBe('VETO');
  });

  // --- Feature 8 BVA: Truth Kernel Ontological Collapse ---
  test('Tier 2 - F8 (Collapse) BVA 1: SDS exactly at 0.7 boundary', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.5 });
    const providers = { v1: { signal: 'long', confidence: 90 }, v2: { signal: 'short', confidence: 90 } };
    const res = kernel.evaluate(providers, { scaleDivergence: 0.7 }); // Should be INFERRED since it is <= 0.7
    expect(res.epistemic_authority).toBe('INFERRED');
  });

  test('Tier 2 - F8 (Collapse) BVA 2: TRG exactly at ontologicalCollapseTrg', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.64 });
    const providers = { v1: { signal: 'long', confidence: 80 }, v2: { signal: 'flat', confidence: 0 } }; // trg = 0.64
    const res = kernel.evaluate(providers, { scaleDivergence: 0.9 });
    expect(res.epistemic_authority).toBe('VETO');
  });

  test('Tier 2 - F8 (Collapse) BVA 3: Maximal boundaries SDS=1.0 and TRG=1.0', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.5 });
    const providers = { v1: { signal: 'long', confidence: 100 }, v2: { signal: 'short', confidence: 100 } };
    const res = kernel.evaluate(providers, { scaleDivergence: 1.0 });
    expect(res.epistemic_authority).toBe('VETO');
  });

  test('Tier 2 - F8 (Collapse) BVA 4: OntologicalCollapseTrg set to 0.0 always vetoes high SDS', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.0 });
    const res = kernel.evaluate({ v1: { signal: 'long', confidence: 10 } }, { scaleDivergence: 0.8 });
    expect(res.epistemic_authority).toBe('VETO');
  });

  test('Tier 2 - F8 (Collapse) BVA 5: OntologicalCollapseTrg set to 10.0 never vetoes', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 10.0 });
    const providers = { v1: { signal: 'long', confidence: 90 }, v2: { signal: 'short', confidence: 90 } };
    const res = kernel.evaluate(providers, { scaleDivergence: 0.9 });
    expect(res.epistemic_authority).toBe('INFERRED');
  });

  // --- Feature 9 BVA: Constitutional Axiom Check ---
  test('Tier 2 - F9 (Axiom) BVA 1: Confidence set to null/undefined passes', () => {
    const rawState = { trg: 0.5, confidence: undefined };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true });
    expect(token.reason).not.toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 2 - F9 (Axiom) BVA 2: Nested confidence inside other objects pass', () => {
    const rawState = { trg: 0.5, metrics: { confidence: 0.9 } };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true });
    expect(token.reason).not.toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 2 - F9 (Axiom) BVA 3: Empty prediction string vetoes', () => {
    const rawState = { trg: 0.5 };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true, prediction: '' });
    expect(token.reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 2 - F9 (Axiom) BVA 4: Valid payload with normal metrics passes axiom check', () => {
    const rawState = { trg: 0.6, dvf: 0.2 };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, { eef: true });
    expect(token.reason).not.toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 2 - F9 (Axiom) BVA 5: Multiple successive valid requests logged in ledger', () => {
    const initialLength = ledger.exportLedger().length;
    court.requestPermission('EXECUTE_TRADE', { trg: 0.5 }, { eef: true });
    court.requestPermission('EXECUTE_TRADE', { trg: 0.6 }, { eef: true });
    expect(ledger.exportLedger().length).toBe(initialLength + 2);
  });

  // --- Feature 10 BVA: C-CLIST Stress Oracle ---
  test('Tier 2 - F10 (C-CLIST) BVA 1: dvfFloor set to 0.0 means stress never accumulates under normal flat market', () => {
    const cclist = new ContinuousCLIST({ dvfFloor: 0.0, stressAccumulation: 0.1 });
    cclist.evaluateStress(0.5, 0.0); // DVF (0.0) is not < Floor (0.0), so stress decreases
    expect(cclist.stressLevel).toBe(0.0);
  });

  test('Tier 2 - F10 (C-CLIST) BVA 2: stressAccumulation set to max 1.0', () => {
    const cclist = new ContinuousCLIST({ dvfFloor: 0.5, stressAccumulation: 1.0 });
    cclist.evaluateStress(0.5, 0.1);
    expect(cclist.stressLevel).toBe(1.0);
  });

  test('Tier 2 - F10 (C-CLIST) BVA 3: Lethal limit set to 0.0 blocks immediately', () => {
    court.cclist = new ContinuousCLIST({ lethalIllusionLimit: 0.0, dvfFloor: 0.5, stressAccumulation: 0.1 });
    court.cclist.stressLevel = 0.01;
    const token = court.requestPermission('EXECUTE_TRADE', { trg: 0.5, dvf: 0.1 }, { eef: true });
    expect(token.granted).toBe(false);
  });

  test('Tier 2 - F10 (C-CLIST) BVA 4: stressRelease set to 0.0 prevents recovery', () => {
    const cclist = new ContinuousCLIST({ dvfFloor: 0.5, stressRelease: 0.0 });
    cclist.stressLevel = 0.5;
    cclist.evaluateStress(0.5, 0.8); // DVF >= Floor, release stress
    expect(cclist.stressLevel).toBe(0.5);
  });

  test('Tier 2 - F10 (C-CLIST) BVA 5: TRG exactly at 2.0 does not trigger instant max stress', () => {
    const cclist = new ContinuousCLIST();
    cclist.evaluateStress(2.0, 0.5);
    expect(cclist.stressLevel).toBeLessThan(1.0);
  });

  // --- Feature 11 BVA: MOL Recovery Lock ---
  test('Tier 2 - F11 (MOL) BVA 1: sclThreshold set to 0 awakens instantly', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 0 });
    mol.state = 'RECOVERY';
    const res = mol.evaluateState({ scale_divergence: 0.5 }, { epistemic_authority: 'OBSERVED' });
    expect(res.molState).toBe('EXECUTE');
    expect(res.canExecute).toBe(true);
  });

  test('Tier 2 - F11 (MOL) BVA 2: sclThreshold set to very high', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 100 });
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 50;
    const res = mol.evaluateState({ scale_divergence: 0.5 }, { epistemic_authority: 'OBSERVED' });
    expect(res.molState).toBe('RECOVERY');
    expect(res.canExecute).toBe(false);
  });

  test('Tier 2 - F11 (MOL) BVA 3: SDS exactly at 0.7', () => {
    const mol = new MetaObservationLayer({ sclThreshold: 3 });
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 0;
    const res = mol.evaluateState({ scale_divergence: 0.7 }, { epistemic_authority: 'OBSERVED' });
    expect(res.scl).toBe(1);
  });

  test('Tier 2 - F11 (MOL) BVA 4: Authority shifts back to VETO during recovery', () => {
    const mol = new MetaObservationLayer();
    mol.state = 'RECOVERY';
    mol.structuralCoherenceLock = 2;
    const res = mol.evaluateState({ scale_divergence: 0.1 }, { epistemic_authority: 'VETO' });
    expect(res.molState).toBe('VETO');
    expect(res.scl).toBe(0);
  });

  test('Tier 2 - F11 (MOL) BVA 5: DOI duration of inaction tracking correctness', () => {
    const mol = new MetaObservationLayer();
    mol.evaluateState({}, { epistemic_authority: 'VETO' });
    mol.evaluateState({}, { epistemic_authority: 'VETO' });
    const res = mol.evaluateState({ scale_divergence: 0.5 }, { epistemic_authority: 'OBSERVED' }); // recovery tick
    expect(res.doi).toBe(3);
  });
});

describe('StreamEngine SMC Transformation - Tier 3: Pairwise Cross-Feature Combinations (11 tests)', () => {

  test('Tier 3 - Pairwise 1: MTF Ingestion aligns multi-scale data which feeds Provider V1 FVG', () => {
    const engine = new StreamEngine();
    // Feed 5 candles into 1m (FVG requires at least 5 candles)
    const candles = [
      makeCandle(100, 100, 99, 100, 0), // prev4
      makeCandle(100, 100, 99, 100, 60000), // prev3
      makeCandle(102, 104, 101, 101, 120000), // prev2
      makeCandle(105, 106, 103, 105, 180000), // prev1
      makeCandle(106, 107, 105, 106, 240000), // current
    ];
    candles.forEach(c => engine.updateMtfCandles(c));
    const v1Narrative = engine.v1.reconstruct(engine.mtfCandles);
    expect(v1Narrative.signal).toBe('long');
    expect(v1Narrative.narrative).toBe('BULLISH_FVG_DETECTED');
  });

  test('Tier 3 - Pairwise 2: Provider V1 Sweep triggers Streaming Consensus (SCD) check', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.2 });
    // Let's create matching buy-side sweeps for V1, V2, and V3
    const providers = {
      v1: { signal: 'short', confidence: 60 },
      v2: { signal: 'short', confidence: 60 },
      v3: { signal: 'short', confidence: 60 }
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(true);
    expect(res.dvf).toBe(0); // Consensus destroyed
  });

  test('Tier 3 - Pairwise 3: Provider V2 Bounce feeds TRG which crosses Execution Trigger threshold', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.1 });
    // V2 support bounce: long signal, confidence: 50. V1: short, confidence: 50
    // tension = 0.5 - 0.5 = 0. divergence = |0.5 - -0.5| = 1.0 -> TRG = 1.0 >= 0.1
    const providers = {
      v1: { signal: 'short', confidence: 50 },
      v2: { signal: 'long', confidence: 50 }
    };
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(true);
    expect(res.reason_codes[0]).toBe('EXECUTION_TRIGGERED_BY_ASYMMETRY');
  });

  test('Tier 3 - Pairwise 4: Provider V3 RSI Extremes and Truth Kernel LHDS Divergence Veto', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.5 });
    // Provider V3 signals overbought (short). LHDS is 0.6.
    const providers = {
      v3: { signal: 'short', confidence: 70 }
    };
    const res = kernel.evaluate(providers, { lhds: 0.6 });
    expect(res.epistemic_authority).toBe('VETO');
    expect(res.eef).toBe(false);
  });

  test('Tier 3 - Pairwise 5: Streaming Consensus (SCD) reduces DVF to 0, which accelerates C-CLIST Stress accumulation', () => {
    // If consensus is destroyed, kernel outputs dvf = 0.
    // When court receives dvf = 0, C-CLIST evaluateStress accumulates stress because dvf < dvfFloor (0.1).
    const kernel = new TruthKernel({ consensusLimit: 0.5 });
    const providers = {
      v1: { signal: 'long', confidence: 80 },
      v2: { signal: 'long', confidence: 80 },
      v3: { signal: 'long', confidence: 80 }
    };
    const kernelResult = kernel.evaluate(providers);
    expect(kernelResult.isConsensus).toBe(true);
    expect(kernelResult.dvf).toBe(0);

    const stressResult = court.cclist.evaluateStress(kernelResult.trg, kernelResult.dvf);
    expect(stressResult.stressLevel).toBeGreaterThan(0.0);
  });

  test('Tier 3 - Pairwise 6: Execution Trigger Layer authorises execution (EEF=true) but MOL Recovery Lock blocks it', () => {
    // MOL is in RECOVERY state. SCL is 1 (threshold is 3).
    // The kernel reports eef = true, but MOL blocks the request because recovery is pending.
    court.mol.state = 'RECOVERY';
    court.mol.structuralCoherenceLock = 1;
    const rawState = { trg: 0.5, dvf: 0.5, scale_divergence: 0.2 };
    const payload = { eef: true, reason: 'OK', epistemic_authority: 'OBSERVED' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    expect(token.granted).toBe(false);
    expect(token.reason).toBe('VETO_MOL_RECOVERY_PENDING');
  });

  test('Tier 3 - Pairwise 7: Truth Kernel Ontological Collapse triggers MOL Veto state, resetting SCL', () => {
    const kernel = new TruthKernel({ ontologicalCollapseTrg: 0.5 });
    const providers = { v1: { signal: 'long', confidence: 90 }, v2: { signal: 'short', confidence: 90 } };
    const kernelResult = kernel.evaluate(providers, { scaleDivergence: 0.8 }); // Triggers ontological collapse veto
    expect(kernelResult.epistemic_authority).toBe('VETO');

    court.mol.state = 'RECOVERY';
    court.mol.structuralCoherenceLock = 2;
    const rawState = { trg: kernelResult.trg, dvf: kernelResult.dvf, scale_divergence: 0.8 };
    court.requestPermission('EXECUTE_TRADE', rawState, kernelResult);
    expect(court.mol.state).toBe('VETO');
    expect(court.mol.structuralCoherenceLock).toBe(0);
  });

  test('Tier 3 - Pairwise 8: Constitutional Axiom Check overrides C-CLIST stress checks', () => {
    // If a request contains a confidence leak, it is vetoed immediately by VETO_CONFIDENCE_ARROGANCE,
    // even if C-CLIST stress is lethal (which would trigger VETO_LETHAL_STABILITY_ILLUSION).
    court.cclist.stressLevel = 1.0; // stress is lethal
    const rawState = { trg: 0.5, dvf: 0.1, confidence: 90 }; // confidence leak present
    const payload = { eef: true, reason: 'OK' };
    const token = court.requestPermission('EXECUTE_TRADE', rawState, payload);
    expect(token.granted).toBe(false);
    expect(token.reason).toBe('VETO_CONFIDENCE_ARROGANCE');
  });

  test('Tier 3 - Pairwise 9: LHDS Reality Divergence Veto overrides Ontological Collapse check in Truth Kernel', () => {
    const kernel = new TruthKernel({ lhdsVetoLimit: 0.5, ontologicalCollapseTrg: 0.5 });
    const providers = { v1: { signal: 'long', confidence: 90 }, v2: { signal: 'short', confidence: 90 } };
    // Trigger both LHDS veto and ontological collapse veto conditions:
    // LHDS = 0.9 > 0.5. SDS = 0.8 > 0.7, TRG = 3.24 >= 0.5.
    const res = kernel.evaluate(providers, { lhds: 0.9, scaleDivergence: 0.8 });
    expect(res.epistemic_authority).toBe('VETO');
    expect(res.reason_codes).toContain('VETO_REALITY_DIVERGENCE');
    expect(res.reason_codes).not.toContain('VETO_ONTOLOGICAL_COLLAPSE'); // LHDS takes priority in step 3
  });

  test('Tier 3 - Pairwise 10: Provider V3 Trend Breakout generates TRG values that trigger Execution Layer', () => {
    const kernel = new TruthKernel({ trgThreshold: 0.1 });
    // V3 signals long with high confidence, V1 signals short with high confidence
    const providers = {
      v3: { signal: 'long', confidence: 80 },
      v1: { signal: 'short', confidence: 80 }
    }; // div = 1.6 -> trg = 2.56 >= 0.1
    const res = kernel.evaluate(providers);
    expect(res.eef).toBe(true);
    expect(res.reason_codes).toContain('EXECUTION_TRIGGERED_BY_ASYMMETRY');
  });

  test('Tier 3 - Pairwise 11: Provider V1 FVG and Provider V2 breakout interaction on residualization', () => {
    const kernel = new TruthKernel({ consensusLimit: 0.2 });
    // V1 FVG: long (confidence 30)
    // V2 breakout: long (confidence 70)
    // divergenceScalar = |0.7 - 0.3| = 0.4 > consensusLimit (0.2).
    // Not consensus, so divergence is preserved.
    const providers = {
      v1: { signal: 'long', confidence: 30 },
      v2: { signal: 'long', confidence: 70 },
      v3: { signal: 'long', confidence: 30 } // Keep max divergence at 0.4
    };
    const res = kernel.evaluate(providers);
    expect(res.isConsensus).toBe(false);
    expect(res.dvf).toBeCloseTo(0.4);
  });
});

describe('StreamEngine SMC Transformation - Tier 4: Real-World Workloads (5 tests)', () => {

  test('Tier 4 - Scenario 1: Translucent Consensus (Quiet Normal Market)', async () => {
    // Under quiet normal market conditions:
    // - Providers generate some divergent signals (medium tension, low consensus)
    // - TRG exceeds threshold, EEF becomes true
    // - LHDS is low, SDS is low
    // - C-CLIST stress is low, MOL is EXECUTE
    // - Court authorizes execution
    const engine = new StreamEngine();
    engine.dualMonitor = {
      calculateDivergence: async () => 0.0
    };
    engine.divergenceDetector = {
      detect: () => 0.1
    };
    engine.mtfCandles['1m'] = makeFlatCandles(25, 100);
    // Populate intermediate (15m) with candles triggering Bullish Sweep for V1 (+40 conf, signal long)
    engine.mtfCandles['15m'] = [
      makeCandle(100, 101, 99, 100), // dummy
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(100, 101, 99, 100),
      makeCandle(101, 102, 97, 98), // Sell-side sweep (long)
    ];
    // Populate slow (1h) with candles triggering Support Breakdown for V2 (+70 conf, signal short)
    engine.mtfCandles['1h'] = makeFlatCandles(9, 100);
    engine.mtfCandles['1h'][2] = makeCandle(50, 51, 50, 50);
    engine.mtfCandles['1h'].push(makeCandle(49.95, 50, 49, 49.95)); // Support breakdown (short)

    // This creates divergence: V1 long (40) vs V2 short (70) -> div = 1.1 -> TRG = 1.21 >= 0.4
    // Set low LHDS and SDS
    const candle = makeCandle(100, 100, 100, 100, Date.now());
    await engine.processCandle(candle, 1);

    expect(engine.activePosition).toBeDefined();
    expect(engine.activePosition.governanceDecision).toBe('ALLOW');
  });

  test('Tier 4 - Scenario 2: Stability Illusion (Flat Market)', async () => {
    // Under a flat market:
    // - Price remains perfectly flat
    // - DVF drops to 0, C-CLIST stress builds up rapidly
    // - Stress crosses lethalIllusionLimit
    // - Court vetoes all execution requests with VETO_LETHAL_STABILITY_ILLUSION
    court.configure({
      dvfFloor: 0.8,
      stressAccumulation: 0.4, // Fast build up
      lethalIllusionLimit: 0.7,
      stressRelease: 0.1
    });

    const engine = new StreamEngine();
    engine.mtfCandles['1m'] = makeFlatCandles(25, 100);
    engine.mtfCandles['5m'] = makeFlatCandles(10, 100);
    engine.mtfCandles['15m'] = makeFlatCandles(15, 100);

    // Process a few flat candles to accumulate stress
    const candle = makeCandle(100, 100, 100, 100, Date.now());
    await engine.processCandle(candle, 1);
    await engine.processCandle(candle, 2);

    expect(court.cclist.stressLevel).toBeGreaterThanOrEqual(0.7);

    // Try to trigger a trade with synthetic EEF = true
    const permissionToken = court.requestPermission('EXECUTE_TRADE', { trg: 0.5, dvf: 0.0 }, { eef: true });
    expect(permissionToken.granted).toBe(false);
    expect(permissionToken.reason).toBe('VETO_LETHAL_STABILITY_ILLUSION');
  });

  test('Tier 4 - Scenario 3: Temporal Reality Divergence (HFT Desync)', async () => {
    // In HFT desync:
    // - Systems diverge, leading to a high LHDS score
    // - Truth Kernel detects the divergence and vetoes execution (epistemic authority VETO)
    // - Court rejects trade execution
    const engine = new StreamEngine();
    // Force dualMonitor mock to return high LHDS
    engine.dualMonitor = {
      calculateDivergence: async () => 0.95
    };
    engine.mtfCandles['1m'] = makeFlatCandles(25, 100);
    engine.mtfCandles['5m'] = makeFlatCandles(10, 100);
    engine.mtfCandles['15m'] = makeFlatCandles(15, 100);

    const candle = makeCandle(100, 100, 100, 100, Date.now());
    // Simulate high divergence
    await engine.processCandle(candle, 1);

    expect(engine.activePosition).toBeNull();
  });

  test('Tier 4 - Scenario 4: Structural Collapse & MOL Recovery Walk', async () => {
    // Sequence:
    // 1. High SDS/TRG triggers Ontological Collapse VETO -> MOL enters VETO state
    // 2. Market stabilizes, SDS drops to low level -> MOL enters RECOVERY state
    // 3. Trade requests are vetoed by MOL (False Awakening)
    // 4. After 3 consecutive stable ticks (SDS <= 0.7), MOL awakens to EXECUTE state
    court.configure({}, { sclThreshold: 3 });

    // Step 1: Veto tick
    const kernelResult1 = { epistemic_authority: 'VETO', eef: false };
    const rawState1 = { scale_divergence: 0.9, trg: 0.8 };
    const token1 = court.requestPermission('EXECUTE_TRADE', rawState1, kernelResult1);
    expect(token1.granted).toBe(false);
    expect(court.mol.state).toBe('VETO');

    // Step 2: Stability returns, first recovery tick
    const kernelResult2 = { epistemic_authority: 'OBSERVED', eef: true };
    const rawState2 = { scale_divergence: 0.2, trg: 0.2 };
    const token2 = court.requestPermission('EXECUTE_TRADE', rawState2, kernelResult2);
    expect(token2.granted).toBe(false); // blocked by recovery pending
    expect(token2.reason).toBe('VETO_MOL_RECOVERY_PENDING');
    expect(court.mol.state).toBe('RECOVERY');
    expect(court.mol.structuralCoherenceLock).toBe(1);

    // Step 3: Second recovery tick
    const token3 = court.requestPermission('EXECUTE_TRADE', rawState2, kernelResult2);
    expect(token3.granted).toBe(false);
    expect(court.mol.structuralCoherenceLock).toBe(2);

    // Step 4: Third recovery tick -> Should awaken
    const token4 = court.requestPermission('EXECUTE_TRADE', rawState2, kernelResult2);
    expect(token4.granted).toBe(true);
    expect(court.mol.state).toBe('EXECUTE');
    expect(court.mol.structuralCoherenceLock).toBe(0);
  });

  test('Tier 4 - Scenario 5: Daily Capital Safeguard Limit in Live Trading', async () => {
    // When StreamEngine is running in LIVE mode:
    // - Check daily capital limit
    // - If daily capital used + order cost exceeds MAX_DAILY_CAPITAL, order placement is blocked
    const engine = new StreamEngine({ mode: 'LIVE' });
    engine.liveTradingEnabled = true;
    engine.maxDailyCapital = 50.0;
    engine.dailyCapitalUsed = 49.95; // Almost used up

    // Setup execution mock to verify order placement
    let orderPlaced = false;
    engine.execution = {
      placeOrder: async () => {
        orderPlaced = true;
        return { orderId: 12345 };
      }
    };

    // Synthesize a positive EEF / allowed permission token
    engine.mtfCandles['1m'] = makeFlatCandles(25, 100);
    // Force court token to grant execution
    const originalRequestPermission = court.requestPermission;
    court.requestPermission = () => ({ granted: true });

    // Process a candle at price 100
    // Estimated cost = price (100) * quantity (0.001) = 0.1
    // Used (49.95) + 0.1 = 50.05 > Max (50.0) -> Blocks placement
    const candle = makeCandle(100, 100, 100, 100, Date.now());
    await engine.processCandle(candle, 1);

    expect(orderPlaced).toBe(false);

    // Restore court function
    court.requestPermission = originalRequestPermission;
  });
});

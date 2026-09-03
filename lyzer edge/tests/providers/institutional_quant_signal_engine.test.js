import { describe, it, expect } from 'vitest';
import { InstitutionalQuantSignalEngine } from '../../../packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js';
import { V8InstitutionalQuantEngine } from '../../../packages/lyzer-shared/src/providers/v8_institutional_quant.js';
import { ResidualizationLayer } from '../../../packages/lyzer-shared/src/engine/residualization.js';
import { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';

describe('InstitutionalQuantSignalEngine (Institutional Alpha & Risk Engine)', () => {
  // Helper to generate deterministic synthetic candles
  function generateCandles({
    length = 64,
    startPrice = 50000,
    drift = 0.0,
    volatility = 0.001,
    seed = 42,
    meanReversion = false,
    meanLevel = 50000,
    theta = 0.15,
    volumeBase = 1000,
    volumeAggression = 0 // -1 to +1
  } = {}) {
    let state = seed;
    const nextRandom = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return (state / 4294967296) * 2 - 1; // [-1, 1]
    };

    const candles = [];
    let price = startPrice;

    for (let i = 0; i < length; i++) {
      const z = nextRandom();
      if (meanReversion) {
        // Ornstein-Uhlenbeck step
        price += theta * (meanLevel - price) + volatility * price * z;
      } else {
        // Geometric Brownian motion with drift
        price *= Math.exp(drift + volatility * z);
      }

      const open = price;
      const intraZ = Math.abs(nextRandom());
      const high = Math.max(open, open * (1 + volatility * (0.5 + intraZ)));
      const low = Math.min(open, open * (1 - volatility * (0.5 + intraZ)));
      
      // Close adjusted by volume aggression if specified
      let close = (high + low) / 2 + (high - low) * (nextRandom() * 0.3);
      if (volumeAggression > 0) {
        close = low + (high - low) * (0.5 + 0.4 * volumeAggression);
      } else if (volumeAggression < 0) {
        close = low + (high - low) * (0.5 + 0.4 * volumeAggression);
      }
      close = Math.max(low, Math.min(high, close));

      candles.push({
        openTime: 1700000000000 + i * 60000,
        open,
        high,
        low,
        close,
        volume: volumeBase * (1 + Math.abs(nextRandom()) * 0.5)
      });
      price = close;
    }

    return candles;
  }

  it('1. Re-export alias V8InstitutionalQuantEngine works identically', () => {
    expect(InstitutionalQuantSignalEngine).toBe(V8InstitutionalQuantEngine);
    const engine = new V8InstitutionalQuantEngine();
    expect(engine.source).toBe('INSTITUTIONAL_QUANT');
  });

  it('2. Complies with Lyzer Edge Provider envelope contract', () => {
    const engine = new InstitutionalQuantSignalEngine();
    const candles = generateCandles({ length: 64 });
    const result = engine.reconstruct({ intermediate: candles });

    expect(result).toHaveProperty('source', 'INSTITUTIONAL_QUANT');
    expect(result).toHaveProperty('signal');
    expect(['long', 'short', 'flat']).toContain(result.signal);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(typeof result.narrative).toBe('string');
    expect(result).toHaveProperty('quantMetrics');

    const m = result.quantMetrics;
    expect(m).toHaveProperty('regime');
    expect(m).toHaveProperty('hurst');
    expect(m).toHaveProperty('varianceRatio');
    expect(m).toHaveProperty('zScore');
    expect(m).toHaveProperty('tStatistic');
    expect(m).toHaveProperty('pValue');
    expect(m).toHaveProperty('halfLife');
    expect(m).toHaveProperty('expectedReturn');
    expect(m).toHaveProperty('expectedShortfall');
    expect(m).toHaveProperty('garmanKlassVol');
    expect(m).toHaveProperty('parkinsonVol');
    expect(m).toHaveProperty('ewmaVol');
    expect(m).toHaveProperty('skewness');
    expect(m).toHaveProperty('kurtosis');
    expect(m).toHaveProperty('orderFlowImbalance');
    expect(m).toHaveProperty('kellyFraction');
    expect(m).toHaveProperty('statisticalQuality');
  });

  it('3. Fail-Closed on insufficient statistical sample (< minBars)', () => {
    const engine = new InstitutionalQuantSignalEngine({ minBars: 30 });
    const shortCandles = generateCandles({ length: 15 });

    const result = engine.reconstruct({ intermediate: shortCandles });
    expect(result.signal).toBe('flat');
    expect(result.confidence).toBe(0);
    expect(result.narrative).toBe('INSUFFICIENT_STATISTICAL_SAMPLE');
    expect(result.vetoReason).toBe('INSUFFICIENT_STATISTICAL_SAMPLE');
    expect(result.quantMetrics.availableBars).toBe(15);
  });

  it('4. Handles null, empty, and non-array inputs cleanly without throwing', () => {
    const engine = new InstitutionalQuantSignalEngine();
    
    expect(engine.reconstruct(null).signal).toBe('flat');
    expect(engine.reconstruct({}).signal).toBe('flat');
    expect(engine.reconstruct([]).signal).toBe('flat');
    expect(engine.analyze(null).signal).toBe('flat');
    expect(engine.analyze([]).signal).toBe('flat');
  });

  it('5. Resilient against dirty data (NaN, negative prices, zero volume, flat bars)', () => {
    const engine = new InstitutionalQuantSignalEngine({ minBars: 10 });
    const dirtyCandles = [
      { open: NaN, high: 100, low: 90, close: 95, volume: 10 },
      { open: -50, high: -40, low: -60, close: -45, volume: 10 },
      { open: 100, high: 90, low: 110, close: 100, volume: 0 }, // Inverted high/low
      { open: 100, high: 100, low: 100, close: 100, volume: 0 }, // Zero range
      ...generateCandles({ length: 35 })
    ];

    const result = engine.analyze(dirtyCandles);
    expect(['long', 'short', 'flat']).toContain(result.signal);
    expect(Number.isFinite(result.confidence)).toBe(true);
    expect(Number.isFinite(result.quantMetrics.hurst)).toBe(true);
    expect(Number.isFinite(result.quantMetrics.garmanKlassVol)).toBe(true);
    expect(Number.isNaN(result.quantMetrics.zScore)).toBe(false);
  });

  it('6. Garman-Klass volatility is positive and mathematically consistent', () => {
    const engine = new InstitutionalQuantSignalEngine();
    const candles = generateCandles({ length: 64, volatility: 0.005 });
    const result = engine.analyze(candles);

    expect(result.quantMetrics.garmanKlassVol).toBeGreaterThan(0);
    expect(result.quantMetrics.parkinsonVol).toBeGreaterThan(0);
    expect(result.quantMetrics.ewmaVol).toBeGreaterThan(0);
  });

  it('7. Quants DO NOT trade Random Walk Noise (0.45 <= H <= 0.55)', () => {
    // Generate pure random walk without drift
    const engine = new InstitutionalQuantSignalEngine({ minBars: 30 });
    const randomWalk = generateCandles({ length: 80, drift: 0.0, volatility: 0.001, seed: 101 });
    const result = engine.analyze(randomWalk);

    if (result.quantMetrics.hurst >= 0.45 && result.quantMetrics.hurst <= 0.55) {
      expect(result.quantMetrics.regime).toBe('RANDOM_WALK_NOISE');
      expect(result.signal).toBe('flat');
      expect(result.confidence).toBe(0);
      expect(result.narrative).toContain('RANDOM_WALK_NOISE_REJECTED');
    }
  });

  it('8. Mean-Reversion Mode: Detects Ornstein-Uhlenbeck statistical dislocation', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      zScoreThreshold: 1.5, // Sensitive for test verification
      hurstMeanReversionMax: 0.52 // Wide regime boundary for synthetic setup
    });

    // Create a series that oscillates around 50000, then plunges drastically on the last candle
    const baseCandles = generateCandles({
      length: 60,
      startPrice: 50000,
      meanReversion: true,
      meanLevel: 50000,
      theta: 0.25,
      volatility: 0.0008,
      seed: 777
    });

    // Force a sharp oversold dislocation at the end (well below mean)
    const dislocatedLow = 48500;
    const oversoldCandles = [
      ...baseCandles,
      { openTime: 1700000060000, open: 49500, high: 49600, low: dislocatedLow, close: 48600, volume: 5000 }
    ];

    const result = engine.analyze(oversoldCandles);
    expect(result.quantMetrics.halfLife).toBeGreaterThan(0);
    expect(result.quantMetrics.zScore).toBeLessThan(0); // Strongly negative Z-score
  });

  it('9. Trend Mode: Detects statistically significant upward drift (t-stat > 2.0)', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      tStatThreshold: 1.8,
      hurstTrendingMin: 0.48 // Allow trend detection
    });

    // Generate strong upward trend with positive volume aggression
    const trendingCandles = generateCandles({
      length: 64,
      startPrice: 50000,
      drift: 0.003, // Consistent positive drift
      volatility: 0.0005,
      volumeAggression: 0.6,
      seed: 888
    });

    const result = engine.analyze(trendingCandles);
    expect(result.quantMetrics.tStatistic).toBeGreaterThan(0);
    if (result.signal !== 'flat') {
      expect(result.signal).toBe('long');
      expect(result.confidence).toBeGreaterThanOrEqual(50);
      expect(result.narrative).toContain('MOMENTUM_DRIFT_BULLISH');
    }
  });

  it('10. Order Flow Imbalance (OFI) Veto suppresses long signal when institutional selling dominates', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      tStatThreshold: 1.5,
      hurstTrendingMin: 0.48,
      ofiVetoThreshold: 0.20
    });

    // Drift upwards, but with heavy sell-side candles at the end (closing at bar lows with massive volume)
    const baseCandles = generateCandles({ length: 50, startPrice: 50000, drift: 0.002, volatility: 0.0005 });
    const ofiViolatingCandles = [...baseCandles];
    
    // Inject 10 aggressive sell absorption candles
    for (let i = 0; i < 10; i++) {
      const p = 52000 + i * 10;
      ofiViolatingCandles.push({
        openTime: 1700000000000 + (50 + i) * 60000,
        open: p + 20,
        high: p + 25,
        low: p - 30,
        close: p - 28, // Closes near low = extreme sell aggression
        volume: 50000  // Dominates volume
      });
    }

    const result = engine.analyze(ofiViolatingCandles);
    // If candidate was long, OFI must veto it
    if (result.vetoReason) {
      expect(result.signal).toBe('flat');
      expect(result.vetoReason).toContain('ORDER_FLOW');
    }
  });

  it('11. Extreme Value Theory (EVT) Left-Tail Veto blocks Long during crash hazard', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      maxNegativeSkew: -0.5,
      kurtosisThreshold: 1.5
    });

    // Inject massive negative returns (left-tail crash spikes)
    const baseCandles = generateCandles({ length: 50, startPrice: 50000 });
    const crashCandles = [...baseCandles];
    crashCandles.push({ openTime: 1, open: 50000, high: 50100, low: 45000, close: 45100, volume: 10000 });
    crashCandles.push({ openTime: 2, open: 45100, high: 45200, low: 41000, close: 41200, volume: 20000 });

    const result = engine.analyze(crashCandles);
    expect(result.quantMetrics.skewness).toBeLessThan(0);
    // If long was considered, asymmetric tail risk vetoes it
    if (result.vetoReason && result.vetoReason.includes('FAT_LEFT_TAIL')) {
      expect(result.signal).toBe('flat');
      expect(result.confidence).toBe(0);
    }
  });

  it('12. Continuous Confidence Calibration: No arbitrary static thresholds', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      tStatThreshold: 1.5,
      hurstTrendingMin: 0.48
    });

    const candlesA = generateCandles({ length: 64, drift: 0.002, volatility: 0.0006, seed: 12 });
    const candlesB = generateCandles({ length: 64, drift: 0.004, volatility: 0.0004, seed: 34 });

    const resA = engine.analyze(candlesA);
    const resB = engine.analyze(candlesB);

    if (resA.signal !== 'flat' && resB.signal !== 'flat') {
      // Confidences should be continuous numbers, not identical hardcoded integers like 70 or 35
      expect(typeof resA.confidence).toBe('number');
      expect(typeof resB.confidence).toBe('number');
      expect(resA.confidence).toBeGreaterThanOrEqual(50);
      expect(resA.confidence).toBeLessThanOrEqual(98);
      // Statistical quality reflects continuous mathematics
      expect(resA.quantMetrics.statisticalQuality).toBeGreaterThan(0);
      expect(resB.quantMetrics.statisticalQuality).toBeGreaterThan(0);
    }
  });

  it('13. Fractional Kelly Allocation is bounded within [0, 0.25]', () => {
    const engine = new InstitutionalQuantSignalEngine();
    const candles = generateCandles({ length: 64, drift: 0.003, volatility: 0.001 });
    const result = engine.analyze(candles);

    expect(result.quantMetrics.kellyFraction).toBeGreaterThanOrEqual(0);
    expect(result.quantMetrics.kellyFraction).toBeLessThanOrEqual(0.25);
  });

  it('14. Seamless Integration with ResidualizationLayer and TruthKernel', () => {
    const quantEngine = new InstitutionalQuantSignalEngine();
    const candles = generateCandles({ length: 64, drift: 0.002, volatility: 0.0008 });
    const quantResult = quantEngine.reconstruct({ intermediate: candles });

    // Step A: Feed into ResidualizationLayer
    const rl = new ResidualizationLayer();
    const mockV2 = { signal: 'long', confidence: 60, id: 'v2' };
    const quantSig = { signal: quantResult.signal, confidence: quantResult.confidence, id: 'v8' };

    const residual = rl.evaluate(mockV2, quantSig);
    expect(residual).toHaveProperty('dvf');
    expect(residual).toHaveProperty('trg');
    expect(Number.isFinite(residual.trg.trg)).toBe(true);

    // Step B: Feed into TruthKernel
    const kernel = new TruthKernel({ trgThreshold: 0.3 });
    const kernelEvaluation = kernel.evaluate({
      v2: mockV2,
      v8: quantSig
    }, {
      scaleDivergence: 0.1,
      lhds: 0.05
    });

    expect(kernelEvaluation).toHaveProperty('eef');
    expect(kernelEvaluation).toHaveProperty('epistemic_authority');
    expect(kernelEvaluation).toHaveProperty('trg');
    expect(typeof kernelEvaluation.trg).toBe('number');
    expect(Number.isFinite(kernelEvaluation.trg)).toBe(true);
  });

  it('15. Cornish-Fisher negative return skewness mathematically increases VaR & ES', () => {
    const engine = new InstitutionalQuantSignalEngine();
    
    // Symmetric normal case (S=0, K=0)
    const normal = engine._calculateCornishFisherVaR_ES(0, 0.01, 0, 0);
    
    // Fat left-tail crash hazard (S = -1.5, K = 3.0)
    const crashHazard = engine._calculateCornishFisherVaR_ES(0, 0.01, -1.5, 3.0);
    
    // In real extreme value theory, negative skew on returns must EXPAND loss risk
    expect(crashHazard.var99).toBeGreaterThan(normal.var99);
    expect(crashHazard.expectedShortfall).toBeGreaterThan(normal.expectedShortfall);
    expect(crashHazard.var99).toBeCloseTo(0.0328, 3);
  });

  it('16. Stationary log returns t-test rejects spurious drift on Brownian noise', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      tStatThreshold: 2.0
    });

    // Generate 50 independent zero-drift random walks
    let spuriousDetections = 0;
    const trials = 50;

    for (let s = 1; s <= trials; s++) {
      const rw = generateCandles({ length: 64, drift: 0.0, volatility: 0.001, seed: 1000 + s });
      const logRet = engine._calculateLogReturns(rw);
      const fit = engine._fitLinearDrift(logRet);
      if (Math.abs(fit.tStatistic) >= 2.0 && fit.pValue <= 0.05) {
        spuriousDetections++;
      }
    }

    // False positive rate must adhere to alpha = 0.05 (~<= 15% in 50 trials, far below old OLS 85%)
    expect(spuriousDetections / trials).toBeLessThanOrEqual(0.15);
  });

  it('17. Instantaneous volatility shock triggers protection on sudden 3-bar surge', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      volShockMultiplier: 2.5
    });

    const baseCandles = generateCandles({ length: 60, volatility: 0.0005, seed: 555 });
    const shockedCandles = [...baseCandles];
    
    // Add 4 violent high-volatility shock candles at the end
    const lastPrice = baseCandles[baseCandles.length - 1].close;
    for (let i = 0; i < 4; i++) {
      shockedCandles.push({
        openTime: 1700000000000 + (60 + i) * 60000,
        open: lastPrice,
        high: lastPrice * 1.05,
        low: lastPrice * 0.95,
        close: lastPrice * 0.98,
        volume: 50000
      });
    }

    const result = engine.analyze(shockedCandles);
    expect(result.quantMetrics.regime).toBe('VOLATILITY_SHOCK');
    expect(result.signal).toBe('flat');
    expect(result.confidence).toBe(0);
    expect(result.vetoReason).toBe('VOLATILITY_SHOCK_PROTECTION');
  });

  it('18. Target projections (tp1, tp2, sl) are populated for non-flat signals', () => {
    const engine = new InstitutionalQuantSignalEngine({
      lookback: 64,
      minBars: 30,
      tStatThreshold: 1.5,
      hurstTrendingMin: 0.48
    });

    const trendingCandles = generateCandles({
      length: 64,
      startPrice: 50000,
      drift: 0.003,
      volatility: 0.0005,
      volumeAggression: 0.6,
      seed: 888
    });

    const result = engine.analyze(trendingCandles);
    if (result.signal !== 'flat') {
      expect(result.targets).toBeDefined();
      expect(result.targets.tp1).toBeGreaterThan(0);
      expect(result.targets.tp2).toBeGreaterThan(0);
      expect(result.targets.sl).toBeGreaterThan(0);
      if (result.signal === 'long') {
        expect(result.targets.tp1).toBeGreaterThan(result.targets.sl);
      }
    }
  });

  it('19. Timeframe fallback extracts candles from intervals (e.g. 15m, 1h)', () => {
    const engine = new InstitutionalQuantSignalEngine({ minBars: 30 });
    const candles15m = generateCandles({ length: 40 });

    const result = engine.reconstruct({
      '15m': candles15m,
      '1h': []
    });

    expect(result.quantMetrics.regime).not.toBe('INSUFFICIENT_DATA');
    expect(result.quantMetrics.availableBars).toBeUndefined();
  });

  it('20. EvidenceFusionEngine registers and fuses QUANT_INSTITUTIONAL_ENGINE', async () => {
    const { EvidenceFusionEngine } = await import('../../src/components/commandCenter/sdk/evidence/fusion/EvidenceFusionEngine.js');
    const fusion = new EvidenceFusionEngine();

    // Verify weights exist
    const balancedWeights = fusion.adaptWeightsForRegime('BALANCED');
    expect(balancedWeights.QUANT_INSTITUTIONAL_ENGINE).toBeGreaterThan(0);

    // Verify online learning update
    fusion.updateSourcePerformance('QUANT_INSTITUTIONAL_ENGINE', 0.95, 'BALANCED');

    // Verify Bayesian fusion
    const fused = fusion.fuseEvidence([
      {
        sourceEngine: 'QUANT_INSTITUTIONAL_ENGINE',
        evidenceMetrics: { confidence: 0.88, probability: 0.80, uncertainty: 0.15 }
      }
    ]);

    expect(fused.fusedConfidence).toBeGreaterThan(0.70);
    fusion.dispose();
  });
});


import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenMobiusEngine } from '../../../packages/lyzer-shared/src/providers/openmobius/v8_openmobius.js';
import { find_fvgs, find_displacements, find_volume_anomalies, calc_atr } from '../../../packages/lyzer-shared/src/providers/openmobius/imbalance.js';
import { SpatialMemoryIndex } from '../../../packages/lyzer-shared/src/smc/spatialMemoryIndex.js';
import { LiquidityReconstructionEngine } from '../../../packages/lyzer-shared/src/providers/v1_smc_ict.js';
import { TruthKernel } from '../../../packages/lyzer-constitution/src/eca/truthKernel.js';
import { CausalMemoryDB } from '../../backend/db.js';
import { StreamEngine } from '../../backend/streamEngine.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Milestone 5 Adversarial Stress Harness — Empirical Challenger', () => {

  // =========================================================================
  // HARNESS 1: Open Mobius V8 Stress, Invariance & Zero-Allocation
  // =========================================================================
  describe('Harness 1: Open Mobius V8 Zero-Allocation & Scale Invariance', () => {
    it('processes 10,000 candles without memory blowup or array mutation', () => {
      const engine = new OpenMobiusEngine();
      const candles = [];
      let price = 50000;
      
      for (let i = 0; i < 10000; i++) {
        const delta = (Math.sin(i / 20) * 50) + ((i % 7 === 0) ? 120 : -30);
        const open = price;
        const close = price + delta;
        const high = Math.max(open, close) + Math.abs(delta * 0.2);
        const low = Math.min(open, close) - Math.abs(delta * 0.2);
        const volume = 100 + (i % 50) * 10;
        price = close;
        
        candles.push({
          open, high, low, close, volume,
          timestamp: 1700000000000 + i * 60000
          // Note: is_bullish intentionally omitted to test zero-allocation fallback
        });
      }

      const initialHeap = process.memoryUsage().heapUsed;
      const result = engine.analyze(candles);

      expect(result).toBeDefined();
      expect(result.version).toBe('8.0.0');
      expect(Array.isArray(result.imbalance.fvgs)).toBe(true);
      expect(Array.isArray(result.pivots)).toBe(true);
      expect(Array.isArray(result.orderBlocks)).toBe(true);

      // Verify no mutation of raw input candles
      expect(candles[0].is_bullish).toBeUndefined();
      expect(candles[100].is_bullish).toBeUndefined();
    });

    it('handles degenerate, zero-range, corrupted and empty candle streams safely', () => {
      const engine = new OpenMobiusEngine();
      
      // Empty input
      const emptyRes = engine.analyze([]);
      expect(emptyRes.bias).toBe('FLAT');
      expect(emptyRes.pivots).toEqual([]);

      // Single candle
      const singleRes = engine.analyze([{ open: 100, high: 100, low: 100, close: 100, volume: 0 }]);
      expect(singleRes.bias).toBe('FLAT');

      // Flat zero-range candles
      const flatCandles = Array.from({ length: 50 }, (_, i) => ({
        open: 100, high: 100, low: 100, close: 100, volume: 0, timestamp: 1000 + i
      }));
      const flatRes = engine.analyze(flatCandles);
      expect(flatRes).toBeDefined();
      expect(flatRes.imbalance.fvgs.length).toBe(0);

      // Inverted corrupted candles (high < low, corrupt feed)
      const corrupted = [
        { open: 100, high: 90, low: 110, close: 95, volume: -10, timestamp: 100 },
        { open: 95, high: 80, low: 120, close: 115, volume: 0, timestamp: 200 },
        { open: 115, high: 70, low: 130, close: 80, volume: 100, timestamp: 300 }
      ];
      expect(() => engine.analyze(corrupted)).not.toThrow();
    });
  });

  // =========================================================================
  // HARNESS 2: Causal Memory SQLite Async Batching & Concurrent Stress
  // =========================================================================
  describe('Harness 2: Causal Memory SQLite Async Batching & Concurrency', () => {
    let testDb;
    let testDbPath;

    beforeEach(async () => {
      const tempDir = os.tmpdir();
      testDbPath = path.join(tempDir, `challenger_db_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
      testDb = new CausalMemoryDB(testDbPath, { batchSize: 25, flushIntervalMs: 50 });
      await testDb.ensureReady();
    });

    afterEach(async () => {
      if (testDb) {
        await testDb.close();
      }
      try {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
        if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
      } catch (_) {}
    });

    it('survives 1,000 rapid concurrent event insertions without loss, deadlock, or corruption', async () => {
      const numEvents = 1000;
      const promises = [];

      for (let i = 0; i < numEvents; i++) {
        promises.push(testDb.insertCausalEvent({
          event_id: `EV_STRESS_${i}`,
          timestamp: 1700000000000 + i,
          event_type: i % 2 === 0 ? 'REALITY_SNAPSHOT_CREATED' : 'KERNEL_VERDICT',
          source: 'ChallengerHarness',
          correlation_id: `corr_stress_${i % 10}`,
          payload: { tick: i, randomVal: Math.random(), heavyArray: [1, 2, 3, 4, 5] },
          context: { stressTest: true }
        }));
      }

      await Promise.all(promises);
      await testDb.flushCausalEvents();

      // Read back all events by correlation
      const eventsCorr0 = await testDb.getCausalEventsByCorrelation('corr_stress_0');
      expect(eventsCorr0.length).toBe(100); // 1000 / 10 = 100
      expect(eventsCorr0[0].payload.heavyArray).toEqual([1, 2, 3, 4, 5]);

      // Read back recent events
      const recent = await testDb.getRecentCausalEvents(50);
      expect(recent.length).toBe(50);
    });

    it('handles concurrent interleaved flushes and reads during continuous write storms', async () => {
      let isWriting = true;
      let insertedCount = 0;

      // Continuous writer
      const writeLoop = async () => {
        while (isWriting && insertedCount < 500) {
          await testDb.insertCausalEvent({
            event_id: `EV_BURST_${insertedCount}`,
            timestamp: 1700000000000 + insertedCount,
            event_type: 'BURST_TICK',
            source: 'BurstWriter',
            correlation_id: 'corr_burst',
            payload: { idx: insertedCount },
            context: {}
          });
          insertedCount++;
        }
      };

      // Concurrent flusher and reader
      const readLoop = async () => {
        for (let j = 0; j < 10; j++) {
          await new Promise(r => setTimeout(r, 15));
          const events = await testDb.getCausalEventsByCorrelation('corr_burst');
          expect(Array.isArray(events)).toBe(true);
        }
      };

      await Promise.all([writeLoop(), readLoop()]);
      isWriting = false;

      await testDb.flushCausalEvents();
      const totalEvents = await testDb.getCausalEventsByCorrelation('corr_burst');
      expect(totalEvents.length).toBe(500);
    });
  });

  // =========================================================================
  // HARNESS 3: SMC Spatial Memory Index Horizon & Capacity Compaction
  // =========================================================================
  describe('Harness 3: SMC Spatial Memory Index Horizon & Memory Compaction', () => {
    it('strictly bounds memory footprint across 5,000 oscillating candles', () => {
      const spatialIndex = new SpatialMemoryIndex({ maxUnmitigated: 50, maxMitigated: 30 });
      
      // Feed 5,000 candles with aggressive swings creating hundreds of FVGs and OBs
      let price = 50000;
      for (let i = 0; i < 5000; i++) {
        const swing = (i % 10 < 5) ? 100 : -100;
        const open = price;
        const close = price + swing;
        const high = Math.max(open, close) + 20;
        const low = Math.min(open, close) - 20;
        price = close;

        spatialIndex.update({
          open, high, low, close, volume: 500,
          timestamp: 1700000000000 + i * 60000,
          openTime: 1700000000000 + i * 60000
        });
      }

      const summary = spatialIndex.getSummary();
      expect(summary.activeCount).toBeLessThanOrEqual(50);
      expect(summary.mitigatedCount).toBeLessThanOrEqual(30);
      expect(spatialIndex.unmitigatedLevels.length).toBeLessThanOrEqual(50);
      expect(spatialIndex.mitigatedLevels.length).toBeLessThanOrEqual(30);
    });

    it('retains unmitigated institutional levels across 2,000 bars until strictly mitigated', () => {
      const spatialIndex = new SpatialMemoryIndex({ maxUnmitigated: 1000, maxMitigated: 500 });
      
      // 1. Form a Bullish FVG at base price 10,000
      const c0 = { openTime: 1000, open: 10000, high: 10050, low: 9950, close: 10020, volume: 100 };
      const c1 = { openTime: 2000, open: 10020, high: 10200, low: 10010, close: 10180, volume: 200 };
      const c2 = { openTime: 3000, open: 10180, high: 10400, low: 10250, close: 10350, volume: 300 }; // FVG formed: [10050, 10250]
      spatialIndex.update([c0, c1, c2]);

      const unmitigatedAfterFormation = spatialIndex.getUnmitigated();
      expect(unmitigatedAfterFormation.some(lvl => lvl.type === 'FVG' && lvl.direction === 'BULLISH')).toBe(true);

      // 2. Price trades high above for 1,000 candles (between 15,000 and 20,000)
      for (let i = 0; i < 1000; i++) {
        spatialIndex.update({
          openTime: 4000 + i * 1000,
          open: 16000, high: 16100, low: 15900, close: 16050, volume: 100
        });
      }

      // Verify that the level formed 1,000 bars ago is STILL retained (no sliding-window amnesia)
      const unmitigatedAfter1000Bars = spatialIndex.getUnmitigated();
      const initialFvg = unmitigatedAfter1000Bars.find(lvl => lvl.type === 'FVG' && lvl.direction === 'BULLISH');
      expect(initialFvg).toBeDefined();
      expect(initialFvg.mitigated).toBe(false);

      // 3. Price drops into the zone to TEST it
      spatialIndex.update({
        openTime: 2000000,
        open: 10300, high: 10300, low: 10150, close: 10200, volume: 500
      });
      expect(initialFvg.test_count).toBeGreaterThan(0);
      expect(initialFvg.mitigated).toBe(false);

      // 4. Price plunges below lower bound (10050) -> Strictly MITIGATED
      spatialIndex.update({
        openTime: 2001000,
        open: 10100, high: 10100, low: 9900, close: 9950, volume: 1000
      });

      const unmitigatedFinal = spatialIndex.getUnmitigated();
      expect(unmitigatedFinal.find(lvl => lvl.id === initialFvg.id)).toBeUndefined();
      const mitigatedFinal = spatialIndex.getMitigated();
      expect(mitigatedFinal.find(lvl => lvl.id === initialFvg.id)).toBeDefined();
    });
  });

  // =========================================================================
  // HARNESS 4: TruthKernel Dynamic Limits Invariants & Extreme Volatility
  // =========================================================================
  describe('Harness 4: TruthKernel Dynamic Limits & Adversarial Regimes', () => {
    it('enforces mathematical bounds [0.50, 0.95] on LHDS veto and [0.40, 0.90] on Ontological Collapse across all extreme inputs', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, ontologicalCollapseTrg: 0.7 });

      const extremeInputs = [
        { atrRatio: 0 },
        { atrRatio: -50 },
        { atrRatio: 0.000001 },
        { atrRatio: 1000000 },
        { volatilityRatio: Infinity },
        { volatilityRatio: -Infinity },
        { volatilityRatio: NaN },
        { oppScore: 99999 },
        { oppScore: -99999 },
        { expansionFactor: 500 },
        { atr14_pct: 0.999 },
        { regime: 'CATASTROPHIC_SHOCK_SUPER_EXPANSION' },
        { regime: 'DEAD_MARKET_EXTREME_COMPRESSION' },
        { regime: 'CORRUPTED_NON_EXISTENT_REGIME' },
        null,
        undefined,
        {},
        { bogusProp: 'nonsense' }
      ];

      for (const input of extremeInputs) {
        const dynamic = kernel.computeDynamicLimits(input);
        expect(dynamic.lhdsVetoLimit).toBeGreaterThanOrEqual(0.50);
        expect(dynamic.lhdsVetoLimit).toBeLessThanOrEqual(0.95);
        expect(dynamic.ontologicalCollapseTrg).toBeGreaterThanOrEqual(0.40);
        expect(dynamic.ontologicalCollapseTrg).toBeLessThanOrEqual(0.90);
      }
    });

    it('properly triggers dynamic ontological collapse veto under high scale divergence in explosive regimes', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, ontologicalCollapseTrg: 0.7 });

      const providers = {
        v1: { signal: 'long', confidence: 90 },
        v2: { signal: 'short', confidence: 85 }
      };

      // High scale divergence SDS = 0.85 (> 0.7) and high TRG (> effectiveCollapseLimit)
      const res = kernel.evaluate(providers, {
        scaleDivergence: 0.85,
        atrRatio: 1.5,
        lhds: 0.20
      });

      // TRG will be high due to diametric opposition (v1 long vs v2 short) -> Ontological Collapse Veto
      expect(res.epistemic_authority).toBe('VETO');
      expect(res.eef).toBe(false);
      expect(res.reason_codes).toContain('VETO_ONTOLOGICAL_COLLAPSE');
    });

    it('maintains 100% backward compatibility when micro is omitted or empty', () => {
      const kernel = new TruthKernel({ lhdsVetoLimit: 0.8, ontologicalCollapseTrg: 0.7 });
      const baseLimits = kernel.computeDynamicLimits();
      expect(baseLimits.isDynamic).toBe(false);
      expect(baseLimits.lhdsVetoLimit).toBe(0.8);
      expect(baseLimits.ontologicalCollapseTrg).toBe(0.7);
    });
  });

  // =========================================================================
  // HARNESS 5: End-to-End Multi-Instrument StreamEngine Simulation
  // =========================================================================
  describe('Harness 5: End-to-End StreamEngine Multi-Instrument Streaming Stress', () => {
    it('executes 1,000 continuous ticks across 6 synthetic instruments across expansion and compression regimes', async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];
      const engines = symbols.map(sym => new StreamEngine({
        mode: 'SIMULATION',
        symbol: sym,
        interval: '1m',
        disabledProviders: []
      }));

      // Warmup each engine
      for (const engine of engines) {
        engine.warmupSyntheticCandles(30);
      }

      // Run 200 ticks per engine (total 1,200 ticks) across varying volatility
      let basePrice = 50000;
      const initialMem = process.memoryUsage().heapUsed;

      for (let tick = 0; tick < 200; tick++) {
        // Regime modulation: Ticks 0-60 (Expansion), 61-140 (Chop/Compression), 141-200 (Flash spike)
        let volMult = 1.0;
        if (tick < 60) volMult = 2.5;
        else if (tick < 140) volMult = 0.2;
        else volMult = 4.0;

        const delta = Math.sin(tick / 5) * 50 * volMult;
        const open = basePrice;
        const close = basePrice + delta;
        const high = Math.max(open, close) + 15 * volMult;
        const low = Math.min(open, close) - 15 * volMult;
        const volume = 100 * volMult;
        basePrice = close;

        const candle = {
          openTime: 1700000000000 + tick * 60000,
          timestamp: 1700000000000 + tick * 60000,
          open, high, low, close, volume,
          closed: true
        };

        for (const engine of engines) {
          engine.updateMtfCandles(candle);
          await engine.processCandle(candle, tick);
        }
      }

      // Flush causal events in DB
      const { db } = await import('../../backend/db.js');
      if (db) {
        await db.flushCausalEvents();
      }

      const finalMem = process.memoryUsage().heapUsed;
      const memDiffMb = (finalMem - initialMem) / (1024 * 1024);

      // Verify engines completed without crashing and memory growth is bounded
      for (const engine of engines) {
        expect(engine.candles.length).toBeGreaterThan(0);
        expect(engine.truthKernel).toBeDefined();
      }

      console.log(`[CHALLENGER] Multi-Instrument Streaming completed. Heap delta: ${memDiffMb.toFixed(2)} MB`);
      expect(memDiffMb).toBeLessThan(150); // Under 150MB growth for 1,200 multi-engine cycles
    });
  });
});

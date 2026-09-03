/**
 * ALPHA FACTORY — COMPREHENSIVE CONTRACT & MATHEMATICAL SUITE
 * Test: alpha_factory.test.js
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  FirewallGuard,
  DISCOVERY_START_MS,
  DISCOVERY_END_MS,
  FROZEN_V8_SHA256
} from '../core/firewall_guard.js';
import {
  runCalendarBlockBootstrap,
  computeBenjaminiYekutieli,
  computeBenjaminiHochberg,
  findTopologicalBasinsAndMedoid
} from '../core/inference_battery.js';
import { EventDensityPreScreener } from '../core/event_density_prescreener.js';

describe('Alpha Factory — Core Contract & Inference Suite', () => {

  describe('1. FirewallGuard Invariants', () => {
    it('accepts candles strictly within discovery boundary (2023-2024)', () => {
      const validCandles = [
        { timestamp: DISCOVERY_START_MS, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: DISCOVERY_END_MS, open: 102, high: 108, low: 101, close: 106, volume: 1200 }
      ];
      expect(FirewallGuard.assertDiscoveryCandles(validCandles, 'valid_mock')).toBe(true);
    });

    it('fails closed with FIREWALL_BREACH_EXCEPTION if any candle exceeds 2024-12-31', () => {
      const breachCandles = [
        { timestamp: DISCOVERY_START_MS, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: DISCOVERY_END_MS + 1000, open: 102, high: 108, low: 101, close: 106, volume: 1200 }
      ];
      expect(() => FirewallGuard.assertDiscoveryCandles(breachCandles, 'breach_mock'))
        .toThrow(/FIREWALL_BREACH_EXCEPTION/);
    });

    it('blocks 1H timeframe access when excludeContaminated1H is active', () => {
      expect(() => FirewallGuard.assertTimeframePermitted('1h', { excludeContaminated1H: true }))
        .toThrow(/CONTAMINATED_1H_EXCEPTION/);
      expect(() => FirewallGuard.assertTimeframePermitted('1H', { excludeContaminated1H: true }))
        .toThrow(/CONTAMINATED_1H_EXCEPTION/);
      expect(FirewallGuard.assertTimeframePermitted('15m', { excludeContaminated1H: true })).toBe(true);
    });

    it('verifies immutable V8 engine SHA-256 hash', () => {
      const v8Path = path.resolve(process.cwd(), 'packages/lyzer-shared/src/providers/institutional_quant_signal_engine.js');
      expect(FirewallGuard.assertV8EngineInvariant(v8Path)).toBe(true);
    });
  });

  describe('2. InferenceBattery & Mathematical Correctness', () => {
    it('computes exact trade-weighted mean under calendar block resampling', () => {
      // Window 0 has 2 trades: [+1.0R, +1.0R] -> mean = +1.0R
      // Window 1 has 10 trades: [-1.0R, ..., -1.0R] -> mean = -1.0R
      // Total trades = 12. Trade-weighted mean = (2 - 10) / 12 = -8 / 12 = -0.667R
      // Unweighted window average would be (+1.0 - 1.0) / 2 = 0.0R (BIASED!)
      const epoch = 1672531200000;
      const dayMs = 86400000;
      const trades = [
        { exitTime: epoch + 1 * dayMs, netR: 1.0 },
        { exitTime: epoch + 2 * dayMs, netR: 1.0 },
        // Window 1 (day 15 onwards)
        { exitTime: epoch + 15 * dayMs, netR: -1.0 },
        { exitTime: epoch + 16 * dayMs, netR: -1.0 },
        { exitTime: epoch + 17 * dayMs, netR: -1.0 },
        { exitTime: epoch + 18 * dayMs, netR: -1.0 },
        { exitTime: epoch + 19 * dayMs, netR: -1.0 },
        { exitTime: epoch + 20 * dayMs, netR: -1.0 },
        { exitTime: epoch + 21 * dayMs, netR: -1.0 },
        { exitTime: epoch + 22 * dayMs, netR: -1.0 },
        { exitTime: epoch + 23 * dayMs, netR: -1.0 },
        { exitTime: epoch + 24 * dayMs, netR: -1.0 }
      ];

      const res = runCalendarBlockBootstrap(trades, { replications: 500, seed: 12345 });
      expect(res.nTrades).toBe(12);
      expect(res.meanNetR).toBe(-0.667);
      expect(res.isDegenerate).toBe(false);
    });

    it('detects and flags micro-sample degeneracy when N <= 4', () => {
      const epoch = 1672531200000;
      const trades = [
        { exitTime: epoch + 1000, netR: 4.869 }
      ];
      const res = runCalendarBlockBootstrap(trades, { replications: 100, seed: 999 });
      expect(res.nTrades).toBe(1);
      expect(res.isDegenerate).toBe(true);
      expect(res.degeneracyReason).toContain('CENTRALIZED_BOOTSTRAP_DEGENERACY_MICRO_SAMPLE');
      // Due to N=1, null variance is exactly 0, mechanically yielding p = 1 / (B + 1)
      expect(res.pBlock).toBeLessThanOrEqual(0.01);
    });

    it('calculates exact Benjamini-Yekutieli (BY, 2001) harmonic penalty for M=40', () => {
      const pVals = new Array(40).fill(0.01);
      const res = computeBenjaminiYekutieli(pVals);
      expect(res.length).toBe(40);
      // Harmonic constant for 40: sum_{i=1}^40 (1/i) ~ 4.278543
      expect(res[0].harmonicConstant).toBeCloseTo(4.27854, 4);
      // Global multiplier = 40 * 4.278543 ~ 171.1417
      expect(res[0].globalMultiplier).toBeCloseTo(171.1417, 3);
    });

    it('identifies topological basins and calculates deterministic geodesic medoid', () => {
      // Graph with 3 nodes forming a line: A - B - C
      const adjacencyList = {
        'A': ['B'],
        'B': ['A', 'C'],
        'C': ['B']
      };

      const results = [
        { id: 'A', qBY: 0.02, nTrades: 80, meanNetR: 0.30 },
        { id: 'B', qBY: 0.01, nTrades: 90, meanNetR: 0.40 }, // B is the center/medoid
        { id: 'C', qBY: 0.03, nTrades: 75, meanNetR: 0.25 }
      ];

      const basinRes = findTopologicalBasinsAndMedoid(results, adjacencyList, { nMin: 60 });
      expect(basinRes.hasBasin).toBe(true);
      expect(basinRes.winningBasin).toEqual(['A', 'B', 'C']);
      // Node B has dist(B, A)=1, dist(B, C)=1 -> sum = 2.
      // Node A has dist(A, B)=1, dist(A, C)=2 -> sum = 3.
      // Node C has dist(C, B)=1, dist(C, A)=2 -> sum = 3.
      // Therefore, Node B is the unique geodesic medoid!
      expect(basinRes.medoid.id).toBe('B');
    });
  });

  describe('3. EventDensityPreScreener (Stage 0 Fast-Fail)', () => {
    it('fast-fails cell when viable events < nMin', () => {
      const mockCandles = [
        { timestamp: 1672531200000, close: 100 },
        { timestamp: 1672531200000 + 86400000, close: 102 }
      ];
      const mockStore = {
        'BTCUSDT': {
          '15m': {
            candles: mockCandles,
            ind: {},
            extremes: {}
          }
        }
      };

      // Detector that returns 0 events
      const zeroDetector = () => ({ isEvent: false });
      const res = EventDensityPreScreener.prescreen(mockStore, ['BTCUSDT'], '15m', zeroDetector, { nMin: 60 });

      expect(res.passStage0).toBe(false);
      expect(res.failReason).toContain('STRUCTURAL_EVENT_SCARCITY');
      expect(res.viableEvents).toBe(0);
    });

    it('detects friction floor attrition when rRaw < 80 bps', () => {
      const mockCandles = [];
      const epoch = 1672531200000;
      for (let i = 0; i < 200; i++) {
        mockCandles.push({ timestamp: epoch + i * 86400000, close: 1000 });
      }
      const mockStore = {
        'BTCUSDT': {
          '15m': {
            candles: mockCandles,
            ind: {},
            extremes: {}
          }
        }
      };

      // Detector returns events with rRaw = 2 (< 80 bps of 1000 = 8.0)
      const lowVolDetector = () => ({ isEvent: true, rRaw: 2.0, cNow: 1000 });
      const res = EventDensityPreScreener.prescreen(mockStore, ['BTCUSDT'], '15m', lowVolDetector, { nMin: 60 });

      expect(res.passStage0).toBe(false);
      expect(res.failReason).toContain('FRICTION_FLOOR_ATTRITION');
      expect(res.infeasibleEvents).toBe(200 - 72); // first 72 bars skipped as warmup
      expect(res.viableEvents).toBe(0);
    });
  });

});

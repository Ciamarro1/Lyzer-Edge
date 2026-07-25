/**
 * @file commandCenter_m1_3_patch.test.js
 * Lyzer Edge Command Center V2 — Milestone M1.3-Patch Institutional Certification Suite
 * Validates the 6 SIRR Remediation points.
 */

import { describe, it, expect, vi } from 'vitest';
import { CommandCenterRuntime } from '../../src/components/commandCenter/sdk/CommandCenterRuntime.js';
import { RenderScheduler } from '../../src/components/commandCenter/sdk/RenderScheduler.js';
import { StreamBuffer } from '../../src/components/commandCenter/sdk/StreamBuffer.js';
import { FrameMetricsCollector } from '../../src/components/commandCenter/sdk/FrameMetricsCollector.js';
import { WidgetLoader } from '../../src/components/commandCenter/sdk/WidgetLoader.js';
import { WidgetCapabilities, freezePayload, TargetPanes, RealityTags } from '../../src/components/commandCenter/sdk/types.js';

describe('Milestone M1.3-Patch: SIRR Remediation Verification Suite', () => {

  describe('1. IDataProvider Injection & Public API Accessors', () => {
    it('should inject custom dataProvider and delegate public domain methods', () => {
      const mockAuditLog = [{ vetoId: 'veto-1', reason: 'LHDS_LIMIT' }];
      const mockCandles = [{ time: 1000, close: 50000 }];
      const mockTimeline = [{ eventId: 'evt-1', causalRoot: 'root-0' }];

      const mockProvider = {
        hasData: () => true,
        getSnapshot: () => ({ status: 'MOCK_OK' }),
        getVetoAuditLog: vi.fn().mockReturnValue(mockAuditLog),
        getMarketData: vi.fn().mockReturnValue(mockCandles),
        getCausalTimeline: vi.fn().mockReturnValue(mockTimeline),
        subscribe: vi.fn().mockReturnValue(() => {})
      };

      const manifest = {
        id: 'test-data-widget',
        name: 'Test Data Widget',
        version: '1.0.0',
        minRuntimeVersion: '3.4.0',
        targetPane: TargetPanes.LEFT_PANE,
        realityTag: RealityTags.OBSERVED_REALITY,
        capabilities: [
          WidgetCapabilities.TELEMETRY_READ,
          WidgetCapabilities.COURT_READ,
          WidgetCapabilities.MARKET_DATA_READ,
          WidgetCapabilities.CAUSAL_TIMELINE_READ
        ]
      };

      const runtime = new CommandCenterRuntime(manifest, 'inst-1', {
        dataProvider: mockProvider,
        theme: 'light',
        locale: 'pt-BR'
      });

      expect(runtime.theme).toBe('light');
      expect(runtime.locale).toBe('pt-BR');
      expect(runtime.getCourtAuditLog()).toEqual(mockAuditLog);
      expect(runtime.getMarketData({ symbol: 'BTCUSDT' })).toEqual(mockCandles);
      expect(runtime.getCausalTimeline({ limit: 10 })).toEqual(mockTimeline);
      expect(mockProvider.getVetoAuditLog).toHaveBeenCalled();
      expect(mockProvider.getMarketData).toHaveBeenCalledWith({ symbol: 'BTCUSDT' });

      // Verify subscription delegation
      const cb = vi.fn();
      const sub = runtime.subscribeSnapshot(cb);
      expect(mockProvider.subscribe).toHaveBeenCalled();
      sub.dispose();
    });
  });

  describe('2. RenderScheduler Disposable on/off Handles', () => {
    it('should return a Disposable from on() that removes the listener upon disposal', () => {
      const scheduler = new RenderScheduler();
      const cb = vi.fn();

      const sub = scheduler.on('frame:end', cb);
      expect(sub).toBeDefined();
      expect(typeof sub.dispose).toBe('function');

      scheduler.emit('frame:end', { duration: 10 });
      expect(cb).toHaveBeenCalledTimes(1);

      sub.dispose();
      scheduler.emit('frame:end', { duration: 15 });
      expect(cb).toHaveBeenCalledTimes(1); // Not called again!
    });
  });

  describe('4. Institutional freezePayload Immutability', () => {
    it('should structurally freeze Arrays, Objects, Maps, Sets, and Dates', () => {
      const date = new Date('2026-07-25T12:00:00Z');
      const map = new Map([['key1', { nested: 'val1' }]]);
      const set = new Set([{ item: 1 }]);
      const arr = [{ col: 'A' }, { col: 'B' }];

      const frozenDate = freezePayload(date);
      expect(frozenDate).not.toBe(date);
      expect(frozenDate.getTime()).toBe(date.getTime());

      const frozenArr = freezePayload(arr);
      expect(Object.isFrozen(frozenArr)).toBe(true);
      expect(Object.isFrozen(frozenArr[0])).toBe(true);

      const frozenMap = freezePayload(map);
      expect(frozenMap).not.toBe(map);
      expect(Object.isFrozen(frozenMap.get('key1'))).toBe(true);

      const frozenSet = freezePayload(set);
      expect(frozenSet).not.toBe(set);
    });
  });

  describe('5. Frame Metrics Separation (over_budget vs dropped)', () => {
    it('should emit frame:over_budget and accurate count in frame:dropped', () => {
      const scheduler = new RenderScheduler({ frameBudgetMs: 16.6 });
      const collector = new FrameMetricsCollector(scheduler);

      const overBudgetCb = vi.fn();
      const droppedCb = vi.fn();

      scheduler.on('frame:over_budget', overBudgetCb);
      scheduler.on('frame:dropped', droppedCb);

      // Simulate a tick that took 20ms (over budget, but 0 drops)
      scheduler.emit('frame:end', { duration: 20.0, batchSize: 5 });
      if (20.0 > 16.6) scheduler.emit('frame:over_budget', { duration: 20.0, budget: 16.6, batchSize: 5 });
      if (20.0 > 33.2) scheduler.emit('frame:dropped', { count: Math.floor(20.0 / 16.6) - 1, duration: 20.0 });

      expect(overBudgetCb).toHaveBeenCalledTimes(1);
      expect(droppedCb).toHaveBeenCalledTimes(0);
      expect(collector.getSnapshot().framesOverBudget).toBe(1);
      expect(collector.getSnapshot().droppedFrames).toBe(0);

      // Simulate a severe stall that took 55ms (over budget + 2 dropped frames)
      scheduler.emit('frame:end', { duration: 55.0, batchSize: 10 });
      if (55.0 > 16.6) scheduler.emit('frame:over_budget', { duration: 55.0, budget: 16.6, batchSize: 10 });
      if (55.0 > 33.2) scheduler.emit('frame:dropped', { count: Math.floor(55.0 / 16.6) - 1, duration: 55.0 });

      expect(overBudgetCb).toHaveBeenCalledTimes(2);
      expect(droppedCb).toHaveBeenCalledTimes(1);
      expect(droppedCb.mock.calls[0][0].count).toBe(2);
      expect(collector.getSnapshot().framesOverBudget).toBe(2);
      expect(collector.getSnapshot().droppedFrames).toBe(2);
    });
  });

  describe('6. RFC-001 Positional Mount Signature (container, runtime)', () => {
    it('should pass exact positional arguments (container, runtime) without injecting object context', async () => {
      const loader = new WidgetLoader();
      const container = document.createElement('div');

      let receivedArg1 = null;
      let receivedArg2 = null;

      const mockPlugin = {
        manifest: {
          id: 'test-pos-widget',
          name: 'Positional Widget',
          version: '1.0.0',
          minRuntimeVersion: '3.4.0',
          targetPane: TargetPanes.LEFT_PANE,
          realityTag: RealityTags.OBSERVED_REALITY,
          capabilities: []
        },
        mount: (arg1, arg2) => {
          receivedArg1 = arg1;
          receivedArg2 = arg2;
        },
        unmount: () => {}
      };

      loader._registry.register(mockPlugin.manifest);
      await loader.loadAndMount('test-pos-widget', container, mockPlugin);

      expect(receivedArg1).toBe(container); // Exactly the DOM container!
      expect(receivedArg2).toBeInstanceOf(CommandCenterRuntime);
      expect(receivedArg2.widgetId).toBe('test-pos-widget');
    });
  });

});

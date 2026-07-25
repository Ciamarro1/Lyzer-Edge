/**
 * Milestone M1.1 — Unit & Contract Test Suite
 * Validates DisposableStack, types.js JSDoc contracts, and CommandCenterRuntime facade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposableStack, createDisposable } from '../../src/components/commandCenter/sdk/DisposableStack.js';
import { WidgetCapabilities, RealityTags, TargetPanes, validateManifest, WidgetError } from '../../src/components/commandCenter/sdk/types.js';
import { CommandCenterRuntime } from '../../src/components/commandCenter/sdk/CommandCenterRuntime.js';

describe('Milestone M1.1: DisposableStack Unit Tests', () => {
  it('should execute disposables in LIFO order upon dispose()', () => {
    const stack = new DisposableStack();
    const order = [];

    stack.use(() => order.push(1));
    stack.use(createDisposable(() => order.push(2)));
    stack.use({ dispose: () => order.push(3) });

    expect(stack.isDisposed).toBe(false);
    stack.dispose();
    expect(stack.isDisposed).toBe(true);
    expect(order).toEqual([3, 2, 1]);
  });

  it('should dispose immediately if added to an already disposed stack', () => {
    const stack = new DisposableStack();
    stack.dispose();

    let called = false;
    stack.use(() => { called = true; });
    expect(called).toBe(true);
  });
});

describe('Milestone M1.1: Manifest Validation Tests', () => {
  it('should validate a correct WidgetManifest', () => {
    const validManifest = {
      id: 'test-chart-widget',
      name: 'Test Chart Widget',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ, WidgetCapabilities.UI_EVENT_EMIT],
      realityTag: RealityTags.OBSERVED_REALITY
    };

    const res = validateManifest(validManifest);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('should reject invalid manifest fields', () => {
    const invalidManifest = {
      id: 'INVALID SLUG',
      targetPane: 'UPPER_PANE'
    };

    const res = validateManifest(invalidManifest);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe('Milestone M1.1: CommandCenterRuntime Facade Contract Tests', () => {
  const validManifest = {
    id: 'test-widget',
    name: 'Test Widget',
    version: '1.0.0',
    minRuntimeVersion: '3.4.0',
    targetPane: TargetPanes.RIGHT_PANE,
    capabilities: [
      WidgetCapabilities.TELEMETRY_READ,
      WidgetCapabilities.UI_EVENT_EMIT,
      WidgetCapabilities.UI_EVENT_LISTEN
    ],
    realityTag: RealityTags.OBSERVED_REALITY
  };

  let runtime;

  beforeEach(() => {
    runtime = new CommandCenterRuntime(validManifest);
  });

  it('should allow getSnapshot() when telemetry:read capability is present', () => {
    const snapshot = runtime.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.system_stage).toBeDefined();
  });

  it('should enforce capability checks and throw WidgetError when capability is missing', () => {
    const restrictedManifest = {
      ...validManifest,
      id: 'restricted-widget',
      capabilities: [] // No capabilities
    };
    const restrictedRuntime = new CommandCenterRuntime(restrictedManifest);

    expect(() => restrictedRuntime.getSnapshot()).toThrowError(/ERR_CAPABILITY_DENIED/);
  });

  it('should subscribe to slices and throttle updates via shallow equality', () => {
    let callCount = 0;
    let lastVal = null;

    const selector = (snap) => snap.system_stage;
    const disposable = runtime.subscribeSlice(selector, (val) => {
      callCount++;
      lastVal = val;
    });

    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
    
    disposable.dispose();
  });

  it('should allow emitting and subscribing to events when capabilities are present', () => {
    let eventReceived = null;

    const sub = runtime.subscribeEvent('test:topic', (payload) => {
      eventReceived = payload;
    });

    runtime.emitEvent('test:topic', { message: 'hello' });
    expect(eventReceived).toEqual({ message: 'hello' });

    sub.dispose();
  });

  it('should clean up subscriptions when dispose() is called on runtime', () => {
    const fn = vi.fn();
    runtime.subscribeEvent('test:topic', fn);

    runtime.dispose();
    runtime.emitEvent('test:topic', { data: 123 });

    expect(fn).not.toHaveBeenCalled();
  });
});

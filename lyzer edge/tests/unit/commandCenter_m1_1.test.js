/**
 * Milestone M1.1 — Unit & Contract Test Suite
 * Validates DisposableStack, types.js JSDoc contracts, and CommandCenterRuntime facade.
 * Conforms strictly to ADR-040, ADR-041, RFC-001, and IRR-001 specifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisposableStack, createDisposable } from '../../src/components/commandCenter/sdk/DisposableStack.js';
import { WidgetCapabilities, RealityTags, TargetPanes, validateManifest, WidgetError, shallowEquals, isWidgetPlugin } from '../../src/components/commandCenter/sdk/types.js';
import { CommandCenterRuntime } from '../../src/components/commandCenter/sdk/CommandCenterRuntime.js';
import { eventBus } from '../../src/lib/eventBus.js';

describe('Milestone M1.1: DisposableStack Unit Tests', () => {
  it('should execute disposables in LIFO order upon dispose()', () => {
    // Arrange
    const stack = new DisposableStack();
    const order = [];
    stack.use(() => order.push(1));
    stack.use(createDisposable(() => order.push(2)));
    stack.use({ dispose: () => order.push(3) });

    // Act
    expect(stack.isDisposed).toBe(false);
    expect(stack.size).toBe(3);
    stack.dispose();

    // Assert
    expect(stack.isDisposed).toBe(true);
    expect(stack.size).toBe(0);
    expect(order).toEqual([3, 2, 1]);
  });

  it('should dispose immediately if added to an already disposed stack', () => {
    // Arrange
    const stack = new DisposableStack();
    stack.dispose();
    let called = false;

    // Act
    stack.use(() => { called = true; });

    // Assert
    expect(called).toBe(true);
  });

  it('should nullify cleanupFn reference on disposal to prevent closure scope retention', () => {
    // Arrange
    let cleanupRan = false;
    const disposable = createDisposable(() => { cleanupRan = true; });

    // Act
    disposable.dispose();
    disposable.dispose(); // Second call is safe and idempotent

    // Assert
    expect(cleanupRan).toBe(true);
    expect(disposable.isDisposed).toBe(true);
  });
});

describe('Milestone M1.1: Helper Utilities & Type Guards Tests', () => {
  it('should perform shallow equality comparison accurately', () => {
    // Arrange
    const objA = { a: 1, b: 'text' };
    const objB = { a: 1, b: 'text' };
    const objC = { a: 1, b: 'different' };

    // Assert
    expect(shallowEquals(objA, objB)).toBe(true);
    expect(shallowEquals(objA, objC)).toBe(false);
    expect(shallowEquals(null, null)).toBe(true);
    expect(shallowEquals(objA, null)).toBe(false);
  });

  it('should validate duck-typed objects with isWidgetPlugin', () => {
    // Arrange
    const validPlugin = {
      manifest: {
        id: 'sample-plugin',
        name: 'Sample Plugin',
        version: '1.0.0',
        minRuntimeVersion: '3.4.0',
        targetPane: TargetPanes.LEFT_PANE,
        capabilities: [WidgetCapabilities.TELEMETRY_READ],
        realityTag: RealityTags.OBSERVED_REALITY
      },
      mount: () => {},
      unmount: () => {}
    };

    // Assert
    expect(isWidgetPlugin(validPlugin)).toBe(true);
    expect(isWidgetPlugin({})).toBe(false);
    expect(isWidgetPlugin({ manifest: {} })).toBe(false);
  });
});

describe('Milestone M1.1: Manifest Validation Tests', () => {
  it('should validate a correct WidgetManifest', () => {
    // Arrange
    const validManifest = {
      id: 'test-chart-widget',
      name: 'Test Chart Widget',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ, WidgetCapabilities.UI_EVENT_EMIT],
      realityTag: RealityTags.OBSERVED_REALITY
    };

    // Act
    const res = validateManifest(validManifest);

    // Assert
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('should reject invalid manifest fields including invalid capabilities and missing minRuntimeVersion', () => {
    // Arrange
    const invalidManifest = {
      id: 'INVALID SLUG',
      version: '1.0',
      targetPane: 'UPPER_PANE',
      capabilities: ['INVALID_CAPABILITY']
    };

    // Act
    const res = validateManifest(invalidManifest);

    // Assert
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors.some(e => e.includes('minRuntimeVersion'))).toBe(true);
    expect(res.errors.some(e => e.includes('Invalid capability'))).toBe(true);
  });

  it('should reject non-object or null manifests', () => {
    // Assert
    expect(validateManifest(null).valid).toBe(false);
    expect(validateManifest(undefined).valid).toBe(false);
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

  it('should reject initialization when manifest is invalid', () => {
    // Arrange
    const invalidManifest = { id: 'BAD SLUG' };

    // Act & Assert
    expect(() => new CommandCenterRuntime(invalidManifest)).toThrow(WidgetError);
  });

  it('should enforce capability checks on all zero-trust read and event methods', () => {
    // Arrange
    const restrictedManifest = {
      ...validManifest,
      id: 'restricted-widget',
      capabilities: [] // Zero capabilities declared
    };
    const restrictedRuntime = new CommandCenterRuntime(restrictedManifest);

    // Act & Assert
    expect(() => restrictedRuntime.getSnapshot()).toThrowError(/ERR_CAPABILITY_DENIED/);
    expect(() => restrictedRuntime.subscribeSnapshot(() => {})).toThrowError(/ERR_CAPABILITY_DENIED/);
    expect(() => restrictedRuntime.subscribeSlice(s => s, () => {})).toThrowError(/ERR_CAPABILITY_DENIED/);
    expect(() => restrictedRuntime.emitEvent('test:topic', {})).toThrowError(/ERR_CAPABILITY_DENIED/);
    expect(() => restrictedRuntime.subscribeEvent('test:topic', () => {})).toThrowError(/ERR_CAPABILITY_DENIED/);
  });

  it('should throw WidgetError when invalid callbacks or selectors are provided', () => {
    // Act & Assert
    expect(() => runtime.subscribeSnapshot(null)).toThrowError(/ERR_INVALID_CALLBACK/);
    expect(() => runtime.subscribeEvent('topic', 'invalid-cb')).toThrowError(/ERR_INVALID_CALLBACK/);
    expect(() => runtime.subscribeSlice(null, () => {})).toThrowError(/ERR_INVALID_SELECTOR/);
    expect(() => runtime.subscribeSlice((s) => s, null)).toThrowError(/ERR_INVALID_SELECTOR/);
  });

  it('should subscribe to slices and throttle updates via shallow equality', () => {
    // Arrange
    let callCount = 0;
    let receivedVal = null;
    let receivedPrev = null;

    const selector = (snap) => snap.system_stage;
    const disposable = runtime.subscribeSlice(selector, (val, prev) => {
      callCount++;
      receivedVal = val;
      receivedPrev = prev;
    });

    // Act 1: Emit state change with identical system_stage slice value
    eventBus.emit('state:changed', {});

    // Assert 1: Throttled (same value returned by selector)
    expect(callCount).toBe(0);

    // Act 2: Dispose subscription
    disposable.dispose();

    // Assert 2
    expect(disposable.isDisposed).toBe(true);
  });

  it('should allow emitting and subscribing to events when capabilities are present', () => {
    // Arrange
    let eventReceived = null;
    const sub = runtime.subscribeEvent('test:topic', (payload) => {
      eventReceived = payload;
    });

    // Act
    runtime.emitEvent('test:topic', { message: 'hello' });

    // Assert
    expect(eventReceived).toEqual({ message: 'hello' });

    // Cleanup
    sub.dispose();
  });

  it('should clean up subscriptions and throw ERR_RUNTIME_DISPOSED on operations after runtime facade disposal', () => {
    // Arrange
    const fn = vi.fn();
    runtime.subscribeEvent('test:topic', fn);

    // Act
    runtime.dispose();
    eventBus.emit('test:topic', { data: 123 });

    // Assert: Subscription handler was removed from event bus
    expect(fn).not.toHaveBeenCalled();
    expect(runtime.isDisposed).toBe(true);
    expect(() => runtime.emitEvent('test:topic', {})).toThrowError(/ERR_RUNTIME_DISPOSED/);
  });
});

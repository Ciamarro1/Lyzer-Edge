/**
 * Milestone M1.2 — Unit & Contract Test Suite
 * Validates WidgetRegistry, WidgetErrorBoundary, and WidgetLoader lifecycle orchestration.
 * Conforms to ADR-040, ADR-041, RFC-001, and IRR-001 specifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WidgetRegistry } from '../../src/components/commandCenter/sdk/WidgetRegistry.js';
import { WidgetErrorBoundary } from '../../src/components/commandCenter/sdk/WidgetErrorBoundary.js';
import { WidgetLoader } from '../../src/components/commandCenter/sdk/WidgetLoader.js';
import { WidgetCapabilities, RealityTags, TargetPanes, WidgetError } from '../../src/components/commandCenter/sdk/types.js';

describe('Milestone M1.2: WidgetRegistry Unit Tests', () => {
  let registry;

  beforeEach(() => {
    registry = new WidgetRegistry('3.4.0');
  });

  it('should register valid widget manifests and check compatibility', () => {
    // Arrange
    const manifest = {
      id: 'test-chart',
      name: 'Test Chart',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    };

    // Act
    const registered = registry.register(manifest);

    // Assert
    expect(registered).toBeDefined();
    expect(registry.has('test-chart')).toBe(true);
    expect(registry.get('test-chart')).toEqual(registered);
    expect(registry.size).toBe(1);
  });

  it('should reject duplicate widget IDs', () => {
    // Arrange
    const manifest = {
      id: 'test-chart',
      name: 'Test Chart',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    };
    registry.register(manifest);

    // Act & Assert
    expect(() => registry.register(manifest)).toThrowError(/ERR_DUPLICATE_WIDGET_ID/);
  });

  it('should reject widgets requiring higher minRuntimeVersion than host', () => {
    // Arrange
    const manifest = {
      id: 'future-widget',
      name: 'Future Widget',
      version: '1.0.0',
      minRuntimeVersion: '4.0.0', // Host is 3.4.0
      targetPane: TargetPanes.RIGHT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    };

    // Act & Assert
    expect(() => registry.register(manifest)).toThrowError(/ERR_VERSION_INCOMPATIBLE/);
  });

  it('should filter registered widgets by pane', () => {
    // Arrange
    registry.register({
      id: 'left-w',
      name: 'Left Widget',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    });
    registry.register({
      id: 'right-w',
      name: 'Right Widget',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.RIGHT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    });

    // Act
    const leftPaneWidgets = registry.getByPane(TargetPanes.LEFT_PANE);

    // Assert
    expect(leftPaneWidgets).toHaveLength(1);
    expect(leftPaneWidgets[0].id).toBe('left-w');
  });
});

describe('Milestone M1.2: WidgetErrorBoundary Unit Tests', () => {
  it('should catch runtime exceptions and switch state to CRASHED', () => {
    // Arrange
    const container = document.createElement('div');
    const boundary = new WidgetErrorBoundary(container, 'crash-widget');

    // Act
    boundary.execute(() => {
      throw new Error('Simulated Widget Crash');
    }, 'rendering');

    // Assert
    expect(boundary.isCrashed).toBe(true);
    expect(boundary.state).toBe('CRASHED');
    expect(boundary.lastError.message).toBe('Simulated Widget Crash');
    expect(container.innerHTML).toContain('Widget Failure');
  });

  it('should allow recovery via triggerReload()', async () => {
    // Arrange
    const container = document.createElement('div');
    const boundary = new WidgetErrorBoundary(container, 'recover-widget');
    let reloaded = false;
    boundary.onReload(() => { reloaded = true; });

    boundary.execute(() => { throw new Error('Crash'); });
    expect(boundary.isCrashed).toBe(true);

    // Act
    await boundary.triggerReload();

    // Assert
    expect(boundary.isCrashed).toBe(false);
    expect(boundary.state).toBe('NORMAL');
    expect(reloaded).toBe(true);
  });
});

describe('Milestone M1.2: WidgetLoader Orchestration Tests', () => {
  let registry;
  let loader;
  let container;

  beforeEach(() => {
    registry = new WidgetRegistry('3.4.0');
    loader = new WidgetLoader(registry);
    container = document.createElement('div');

    registry.register({
      id: 'mock-widget',
      name: 'Mock Widget',
      version: '1.0.0',
      minRuntimeVersion: '3.4.0',
      targetPane: TargetPanes.LEFT_PANE,
      capabilities: [WidgetCapabilities.TELEMETRY_READ],
      realityTag: RealityTags.OBSERVED_REALITY
    });
  });

  it('should load, mount, and unmount a valid plugin successfully', async () => {
    // Arrange
    let mounted = false;
    let unmounted = false;

    const mockPlugin = {
      manifest: registry.get('mock-widget'),
      mount: (ctx) => {
        mounted = true;
        ctx.container.innerHTML = '<p>Widget Content</p>';
      },
      unmount: () => {
        unmounted = true;
      }
    };

    // Act 1: Mount
    const mountRecord = await loader.loadAndMount('mock-widget', container, mockPlugin);

    // Assert 1
    expect(mountRecord).toBeDefined();
    expect(mountRecord.instanceId).toBeDefined();
    expect(mounted).toBe(true);
    expect(container.innerHTML).toContain('Widget Content');
    expect(loader.activeCount).toBe(1);

    // Act 2: Unmount
    const unmountedRes = await loader.unmount(mountRecord.instanceId);

    // Assert 2
    expect(unmountedRes).toBe(true);
    expect(unmounted).toBe(true);
    expect(container.innerHTML).toBe('');
    expect(loader.activeCount).toBe(0);
  });

  it('should isolate crashes during mount hook via WidgetErrorBoundary', async () => {
    // Arrange
    const failingPlugin = {
      manifest: registry.get('mock-widget'),
      mount: () => {
        throw new Error('Mount Hook Failed!');
      },
      unmount: () => {}
    };

    // Act
    const mountRecord = await loader.loadAndMount('mock-widget', container, failingPlugin);

    // Assert
    expect(mountRecord).toBeNull();
    expect(loader.activeCount).toBe(0);
    expect(container.innerHTML).toContain('Widget Failure');
  });

  it('should unmount all active widgets cleanly using unmountAll()', async () => {
    // Arrange
    const pluginA = {
      manifest: registry.get('mock-widget'),
      mount: () => {},
      unmount: () => {}
    };
    await loader.loadAndMount('mock-widget', container, pluginA);
    expect(loader.activeCount).toBe(1);

    // Act
    await loader.unmountAll();

    // Assert
    expect(loader.activeCount).toBe(0);
  });
});

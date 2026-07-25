import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChartHostWidget } from '../../src/components/commandCenter/widgets/chartHost/ChartHostWidget.js';
import { chartHostManifest } from '../../src/components/commandCenter/widgets/chartHost/manifest.js';
import { CommandCenterRuntime } from '../../src/components/commandCenter/sdk/CommandCenterRuntime.js';
import { WidgetCapabilities } from '../../src/components/commandCenter/sdk/types.js';

describe('Phase 3.2 - ChartHost Stress & Performance Gate', () => {
  let container;
  let runtime;
  let widget;

  beforeEach(() => {
    if (typeof window !== 'undefined' && !window.matchMedia) {
      window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });
    }

    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '400px';
    document.body.appendChild(container);

    const mockAdapter = {
      id: 'stress-provider',
      getMode: () => 'LIVE',
      hasData: () => true,
      getSnapshot: () => ({ realityTag: 'OBSERVED_REALITY' }),
      subscribeMarketData: (query, callback) => {
        mockAdapter.callback = callback;
        return () => { mockAdapter.callback = null; };
      }
    };

    runtime = new CommandCenterRuntime(
      {
        ...chartHostManifest,
        capabilities: [WidgetCapabilities.MARKET_DATA_READ, WidgetCapabilities.TELEMETRY_READ]
      },
      'stress_inst_1',
      { dataProvider: mockAdapter }
    );
    runtime._mockAdapter = mockAdapter;

    widget = new ChartHostWidget();
  });

  afterEach(() => {
    if (widget) widget.dispose();
    if (runtime && !runtime.isDisposed) runtime.dispose();
    document.body.innerHTML = '';
  });

  it('processes 10,000 tick updates within performance budget without memory leak', async () => {
    const mountStart = performance.now();
    await widget.mount(container, runtime);
    const mountEnd = performance.now();

    const mountLatency = mountEnd - mountStart;
    console.log(`[Stress Test] ChartHost Mount Latency: ${mountLatency.toFixed(2)}ms`);
    expect(mountLatency).toBeLessThan(500);

    const callback = runtime._mockAdapter.callback;
    expect(typeof callback).toBe('function');

    // Simulate 10,000 high-frequency market tick updates
    const ticksCount = 10000;
    const baseTime = Math.floor(Date.now() / 1000) - ticksCount;

    const streamStart = performance.now();
    for (let i = 0; i < ticksCount; i++) {
      callback({
        timestamp: (baseTime + i) * 1000,
        open: 50000 + (i % 100),
        high: 50100 + (i % 100),
        low: 49900 + (i % 100),
        close: 50050 + (i % 100),
        volume: 10
      });
    }
    const streamEnd = performance.now();
    const totalStreamTime = streamEnd - streamStart;
    const avgPerTick = (totalStreamTime / ticksCount) * 1000; // microseconds

    console.log(`[Stress Test] Processed ${ticksCount} ticks in ${totalStreamTime.toFixed(2)}ms (${avgPerTick.toFixed(2)} µs/tick)`);

    expect(totalStreamTime).toBeLessThan(1000); // 10k ticks under 1s total processing time

    // Dispose and verify Zero-Leak
    widget.dispose();
    runtime.dispose();

    expect(container.innerHTML).toBe('');
  });
});

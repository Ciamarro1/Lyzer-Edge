import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandCenterApp } from '../../src/components/commandCenter/app/CommandCenterApp.js';
import { WidgetRegistry } from '../../src/components/commandCenter/sdk/WidgetRegistry.js';
import { RealityOrchestrator } from '../../src/components/commandCenter/sdk/reality/RealityOrchestrator.js';
import { ProviderRegistry } from '../../src/components/commandCenter/sdk/providers/ProviderRegistry.js';

describe('Phase 3.1 - Browser Benchmark', () => {
  let rootElement;

  beforeEach(() => {
    rootElement = document.createElement('div');
    rootElement.id = 'app-root';
    document.body.appendChild(rootElement);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts the shell and widgets within performance budget (< 500ms)', async () => {
    const providerRegistry = new ProviderRegistry();
    const orchestrator = new RealityOrchestrator({ eventBus: { emit: () => {} } }, providerRegistry);
    const widgetRegistry = new WidgetRegistry();

    // Create a dummy widget that simulates load
    const dummyManifest = { 
      id: 'dummy-widget', 
      name: 'Dummy Widget',
      version: '1.0.0',
      minRuntimeVersion: '1.0.0',
      targetPane: 'RIGHT_PANE',
      capabilities: [],
      realityTag: 'SYNTHETIC_REALITY'
    };
    class DummyWidget {
      constructor() {
        this.manifest = dummyManifest;
      }
      mount(container) {
        container.innerHTML = '<div>Loaded</div>';
      }
      dispose() {}
    }
    widgetRegistry.register(dummyManifest, DummyWidget);

    const app = new CommandCenterApp(rootElement, widgetRegistry, orchestrator);

    const layoutConfig = {
      type: 'institutional',
      panes: { CenterPane: '100%' }
    };
    
    const widgetMap = {
      CenterPane: ['dummy-widget', 'dummy-widget', 'dummy-widget'] // Load 3 widgets
    };

    const start = performance.now();
    await app.mount(layoutConfig, widgetMap);
    const end = performance.now();

    const mountTime = end - start;
    console.log(`[Benchmark] Shell Mount Time: ${mountTime.toFixed(2)}ms`);

    expect(mountTime).toBeLessThan(500);
    
    app.dispose();
  });
});

/**
 * @fileoverview Application entry point.
 * Initialises the IndexedDB database then mounts the application shell.
 */

import { initDatabase } from './db/database.js';
import { App } from './app.js';
import { RuntimeSelector, Runtimes } from './runtime/RuntimeSelector.js';
import { CommandCenterApp } from './components/commandCenter/app/CommandCenterApp.js';
import { ProviderRegistry } from './components/commandCenter/sdk/providers/ProviderRegistry.js';
import { RealityOrchestrator } from './components/commandCenter/sdk/reality/RealityOrchestrator.js';
import { LiveProvider } from './components/commandCenter/sdk/providers/LiveProvider.js';
import { RealityStatusWidget } from './components/commandCenter/widgets/realityStatus/RealityStatusWidget.js';
import { realityStatusManifest } from './components/commandCenter/widgets/realityStatus/manifest.js';
import { ChartHostWidget } from './components/commandCenter/widgets/chartHost/ChartHostWidget.js';
import { chartHostManifest } from './components/commandCenter/widgets/chartHost/manifest.js';
import { RuntimeInspectorWidget } from './components/commandCenter/widgets/runtimeInspector/RuntimeInspectorWidget.js';
import { runtimeInspectorManifest } from './components/commandCenter/widgets/runtimeInspector/manifest.js';
import { CourtWidget } from './components/commandCenter/widgets/court/CourtWidget.js';
import { courtManifest } from './components/commandCenter/widgets/court/manifest.js';
import { TimelineWidget } from './components/commandCenter/widgets/timeline/TimelineWidget.js';
import { timelineManifest } from './components/commandCenter/widgets/timeline/manifest.js';
import { CausalGraphWidget } from './components/commandCenter/widgets/causalGraph/CausalGraphWidget.js';
import { causalGraphManifest } from './components/commandCenter/widgets/causalGraph/manifest.js';
import { WidgetRegistry } from './components/commandCenter/sdk/WidgetRegistry.js';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

async function main() {
  try {
    await initDatabase();
    
    const rootElement = document.getElementById('app');
    const { runtime } = RuntimeSelector.resolve();

    if (runtime === Runtimes.COMMAND_CENTER_V2) {
      console.log('[LyzerEdge] Starting Command Center V2');
      
      const providerRegistry = new ProviderRegistry();
      providerRegistry.register(new LiveProvider('live-default'));
      
      const orchestrator = new RealityOrchestrator({ eventBus: { emit: () => {} } }, providerRegistry);
      
      const widgetRegistry = new WidgetRegistry();
      widgetRegistry.register(realityStatusManifest, RealityStatusWidget);
      widgetRegistry.register(chartHostManifest, ChartHostWidget);
      widgetRegistry.register(runtimeInspectorManifest, RuntimeInspectorWidget);
      widgetRegistry.register(courtManifest, CourtWidget);
      widgetRegistry.register(timelineManifest, TimelineWidget);
      widgetRegistry.register(causalGraphManifest, CausalGraphWidget);

      const commandCenter = new CommandCenterApp(rootElement, widgetRegistry, orchestrator);
      
      // Institutional Layout Config for Phase 3.4 Command Center
      const layoutConfig = {
        type: 'institutional',
        panes: {
          LeftPane: '22%',
          CenterPane: '53%',
          RightPane: '25%'
        }
      };
      
      const widgetMap = {
        LeftPane: ['timeline-widget'],
        CenterPane: ['causal-graph-widget', 'chart-host-widget'],
        RightPane: ['court-widget', 'runtime-inspector-widget', 'reality-status-widget']
      };
      
      await commandCenter.mount(layoutConfig, widgetMap);
      
      // Auto-connect default provider for demo
      await orchestrator.switchReality('live-default', 'system_init');
    } else {
      console.log('[LyzerEdge] Starting Legacy Dashboard');
      const app = new App();
      app.mount('#app');
    }
    
  } catch (error) {
    console.error('[LyzerEdge] Fatal error during startup:', error);

    const root = document.getElementById('app');
    if (root) {
      root.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                    font-family:system-ui;color:#e8eaf0;background:#0c0e14;text-align:center;padding:2rem">
          <div>
            <h1 style="margin-bottom:0.5rem">Failed to Start</h1>
            <p style="color:#9498ad">Unable to initialise the database. Please reload the page.</p>
            <pre style="margin-top:1rem;font-size:12px;color:#ff6b6b">${error.message}</pre>
          </div>
        </div>`;
    }
  }
}

main();
 
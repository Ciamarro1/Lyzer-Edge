/**
 * Lyzer Edge — CommandCenterView
 * Mounts the Command Center V2 application shell into the main SPA container.
 */

import { CommandCenterApp } from './commandCenter/app/CommandCenterApp.js';
import { ProviderRegistry } from './commandCenter/sdk/providers/ProviderRegistry.js';
import { RealityOrchestrator } from './commandCenter/sdk/reality/RealityOrchestrator.js';
import { LiveProvider } from './commandCenter/sdk/providers/LiveProvider.js';
import { RealityStatusWidget } from './commandCenter/widgets/realityStatus/RealityStatusWidget.js';
import { realityStatusManifest } from './commandCenter/widgets/realityStatus/manifest.js';
import { ChartHostWidget } from './commandCenter/widgets/chartHost/ChartHostWidget.js';
import { chartHostManifest } from './commandCenter/widgets/chartHost/manifest.js';
import { RuntimeInspectorWidget } from './commandCenter/widgets/runtimeInspector/RuntimeInspectorWidget.js';
import { runtimeInspectorManifest } from './commandCenter/widgets/runtimeInspector/manifest.js';
import { CourtWidget } from './commandCenter/widgets/court/CourtWidget.js';
import { courtManifest } from './commandCenter/widgets/court/manifest.js';
import { TimelineWidget } from './commandCenter/widgets/timeline/TimelineWidget.js';
import { timelineManifest } from './commandCenter/widgets/timeline/manifest.js';
import { CausalGraphWidget } from './commandCenter/widgets/causalGraph/CausalGraphWidget.js';
import { causalGraphManifest } from './commandCenter/widgets/causalGraph/manifest.js';
import { WidgetRegistry } from './commandCenter/sdk/WidgetRegistry.js';

export class CommandCenterView {
  constructor() {
    this._container = null;
    this._app = null;
    this._orchestrator = null;
  }

  async mount(container) {
    this._container = container;
    this._container.innerHTML = '';
    this._container.style.height = '100vh';
    this._container.style.overflow = 'hidden';

    // 1. Initialize Providers & Reality Orchestrator
    const providerRegistry = new ProviderRegistry();
    const liveProvider = new LiveProvider('live-default');
    providerRegistry.register(liveProvider);

    this._orchestrator = new RealityOrchestrator({ eventBus: { emit: () => {} } }, providerRegistry);

    // 2. Initialize Widget Registry & Register all 6 V2 Widgets
    const widgetRegistry = new WidgetRegistry();
    
    widgetRegistry.register(realityStatusManifest, RealityStatusWidget);
    widgetRegistry.register(chartHostManifest, ChartHostWidget);
    widgetRegistry.register(runtimeInspectorManifest, RuntimeInspectorWidget);
    widgetRegistry.register(courtManifest, CourtWidget);
    widgetRegistry.register(timelineManifest, TimelineWidget);
    widgetRegistry.register(causalGraphManifest, CausalGraphWidget);

    // 3. Instantiate & Mount CommandCenterApp
    this._app = new CommandCenterApp(this._container, widgetRegistry, this._orchestrator);

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

    await this._app.mount(layoutConfig, widgetMap);

    // Auto-connect default provider
    try {
      await this._orchestrator.switchReality('live-default', 'system_init');
    } catch (err) {
      console.warn('[CommandCenterView] Initial reality switch warning:', err);
    }
  }

  unmount() {
    if (this._app) {
      this._app.dispose();
      this._app = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
  }
}

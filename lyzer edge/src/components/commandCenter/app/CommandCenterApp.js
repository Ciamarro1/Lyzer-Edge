import { LayoutEngine } from './LayoutEngine.js';

export class CommandCenterApp {
  constructor(rootElement, widgetRegistry = null, realityOrchestrator = null) {
    if (!rootElement) throw new Error('[CommandCenterApp] Root element required.');
    this.rootElement = rootElement;
    this.widgetRegistry = widgetRegistry;
    this.realityOrchestrator = realityOrchestrator;
    this.layoutEngine = null;
    this._mountedWidgets = [];
  }

  async mount(layoutConfig, widgetMap = {}) {
    this.layoutEngine = new LayoutEngine(this.rootElement);
    this.layoutEngine.load(layoutConfig);

    if (widgetMap && this.widgetRegistry) {
      for (const [paneId, widgetIds] of Object.entries(widgetMap)) {
        const paneEl = this.layoutEngine.getPaneElement(paneId);
        if (!paneEl) continue;

        for (const widgetId of widgetIds) {
          const widgetEntry = this.widgetRegistry.get(widgetId);
          if (widgetEntry) {
            const WidgetClass = widgetEntry.pluginClass || widgetEntry.plugin || widgetEntry;
            const widgetInst = typeof WidgetClass === 'function' ? new WidgetClass() : WidgetClass;
            const container = document.createElement('div');
            container.className = `widget-container widget-${widgetId}`;
            paneEl.appendChild(container);

            if (typeof widgetInst.mount === 'function') {
              await widgetInst.mount(container, {
                orchestrator: this.realityOrchestrator,
                widgetId
              });
            }
            this._mountedWidgets.push(widgetInst);
          }
        }
      }
    }
  }

  dispose() {
    for (const w of this._mountedWidgets) {
      if (w && typeof w.dispose === 'function') {
        try { w.dispose(); } catch (e) {}
      }
    }
    this._mountedWidgets = [];
    if (this.rootElement) {
      this.rootElement.innerHTML = '';
    }
  }
}

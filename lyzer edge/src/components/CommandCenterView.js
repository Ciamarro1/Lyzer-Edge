import { widgetRegistry } from './commandCenter/sdk/WidgetRegistry.js';
import { widgetLoader } from './commandCenter/sdk/WidgetLoader.js';
import { StreamBuffer, Priority } from './commandCenter/sdk/StreamBuffer.js';
import { BrowserClock } from './commandCenter/sdk/Clock.js';
import { RenderScheduler } from './commandCenter/sdk/RenderScheduler.js';
import { FrameMetricsCollector } from './commandCenter/sdk/FrameMetricsCollector.js';

export class CommandCenterView {
  constructor() {
    this._container = null;
    
    // Core Engine
    this.streamBuffer = new StreamBuffer();
    this.scheduler = new RenderScheduler({
      streamBuffer: this.streamBuffer,
      clock: new BrowserClock(),
      frameBudgetMs: 16.6
    });
    this.collector = new FrameMetricsCollector(this.scheduler);
    
    this._interval = null;
  }

  mount(container) {
    this._container = container;
    this._renderShell();
    
    // Start Engine
    this.scheduler.start();
    
    // Define a dummy plugin to prove the engine works
    const dummyManifest = {
      id: 'lyzer.core.test-widget',
      version: '1.0.0',
      name: 'System Metrics Monitor',
      targetPane: 'right',
      capabilities: ['telemetry:read']
    };
    
    const DummyPlugin = {
      mount: async (context) => {
        const pane = context.container;
        pane.innerHTML = `
          <div style="padding: 1rem; color: #a5a5a5;">
            <h3 style="color: #fff;">Command Center V2 (M1.3 Engine)</h3>
            <div id="metrics-output" style="font-family: monospace; font-size: 12px; margin-top: 1rem; background: #000; padding: 1rem; border-radius: 4px;">
              Waiting for telemetry...
            </div>
          </div>
        `;
        
        context.runtime.subscribe('metrics:update', (payload) => {
          const el = pane.querySelector('#metrics-output');
          if (el) {
            el.innerHTML = `
              FPS: ${(1000 / (payload.avgFrameTimeMs || 16.6)).toFixed(1)}<br>
              Frame Time: ${payload.avgFrameTimeMs.toFixed(2)}ms<br>
              Batched Events: ${payload.totalFrames}<br>
              Throughput: ${payload.throughput.toFixed(2)} evt/s
            `;
          }
        });
      },
      unmount: async () => {}
    };
    
    if (!widgetRegistry.get(dummyManifest.id)) {
      widgetRegistry.register(dummyManifest);
    }
    
    const hostEl = this._container.querySelector('#command-center-pane');
    widgetLoader.loadAndMount(dummyManifest.id, hostEl, DummyPlugin).then(record => {
      // Setup mock data feed from StreamBuffer to the plugin
      this.scheduler.registerProcessor((ev) => {
        if (ev.topic === 'metrics:update' && record) {
          record.runtime.publish('metrics:update', ev.payload);
        }
      });
      
      // Feed metrics into StreamBuffer every 100ms
      this._interval = setInterval(() => {
        this.streamBuffer.enqueue({
          source: 'host',
          topic: 'metrics:update',
          priority: Priority.NORMAL,
          payload: this.collector.getSnapshot()
        });
      }, 100);
    });
  }

  _renderShell() {
    this._container.innerHTML = `
      <div class="page-container" style="height: 100vh; overflow: hidden; display: flex; flex-direction: column;">
        <div class="page-header" style="flex: 0 0 auto;">
          <h1 class="page-title">Institutional Command Center V2</h1>
          <p class="page-subtitle">Powered by Zero-Trust Widget SDK & M1.3 60FPS Render Engine</p>
        </div>
        <div class="card" style="flex: 1 1 auto; margin-top: 1rem; display: flex;">
          <div style="flex: 7; border-right: 1px solid var(--border-color); padding: 1rem; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: #555;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <h2 style="margin-top: 1rem;">TradingView Core (Pending M1.4)</h2>
              <p>Main Charting Pane (Left - 70%)</p>
            </div>
          </div>
          <div id="command-center-pane" style="flex: 3; padding: 1rem; background: var(--bg-card-alt);">
            <!-- Sandboxed widgets will mount here -->
          </div>
        </div>
      </div>
    `;
  }

  unmount() {
    if (this._interval) clearInterval(this._interval);
    this.scheduler.stop();
    widgetLoader.unmountAll();
  }
}

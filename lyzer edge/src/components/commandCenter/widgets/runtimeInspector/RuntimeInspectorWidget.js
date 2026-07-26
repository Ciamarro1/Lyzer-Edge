/**
 * Lyzer Edge Command Center V2 — RuntimeInspectorWidget
 * Internal DevTools Inspector Widget displaying real-time system metrics,
 * active widget hierarchy, capability scopes, and event streams.
 */

import { runtimeInspectorManifest } from './manifest.js';

export class RuntimeInspectorWidget {
  constructor() {
    this.manifest = runtimeInspectorManifest;
    this._container = null;
    this._runtime = null;
    this._ui = {};
    this._disposable = null;
  }

  mount(container, runtime) {
    this._container = container;
    this._runtime = runtime;
    this._render();
    this._subscribe();
  }

  _render() {
    this._container.innerHTML = `
      <div style="padding: 12px; font-family: monospace; font-size: 11px; background: #181a1f; color: #abb2bf; border: 1px solid #3b4048; border-radius: 6px; height: 100%; box-sizing: border-box; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #3b4048; padding-bottom: 6px; margin-bottom: 10px;">
          <h4 style="margin: 0; color: #61afef; font-size: 13px; font-weight: bold;">LYZER RUNTIME DEVTOOLS</h4>
          <span id="ri-cert-badge" style="background: #98c379; color: #1e1e1e; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px;">PLATINUM</span>
        </div>

        <!-- REALITY & PROVIDER SECTION -->
        <div style="margin-bottom: 10px; background: #21252b; padding: 8px; border-radius: 4px;">
          <div style="color: #e5c07b; font-weight: bold; margin-bottom: 4px;">REALITY & PROVIDER</div>
          <div>Provider: <span id="ri-provider" style="color: #98c379;">--</span></div>
          <div>Tag: <span id="ri-reality" style="color: #61afef;">--</span></div>
          <div>Health: <span id="ri-health" style="color: #98c379;">--</span></div>
        </div>

        <!-- TELEMETRY PERFORMANCE SECTION -->
        <div style="margin-bottom: 10px; background: #21252b; padding: 8px; border-radius: 4px;">
          <div style="color: #e5c07b; font-weight: bold; margin-bottom: 4px;">PERFORMANCE METRICS</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>FPS: <span id="ri-fps" style="color: #98c379; font-weight: bold;">--</span></div>
            <div>Avg Frame: <span id="ri-frame-time">--</span> ms</div>
            <div>P95 Frame: <span id="ri-p95">--</span> ms</div>
            <div>P99 Frame: <span id="ri-p99">--</span> ms</div>
            <div>Heap Used: <span id="ri-heap">--</span> MB</div>
            <div>Latency: <span id="ri-latency">--</span> ms</div>
          </div>
        </div>

        <!-- WIDGET TREE & CAPABILITIES SECTION -->
        <div style="margin-bottom: 10px; background: #21252b; padding: 8px; border-radius: 4px;">
          <div style="color: #e5c07b; font-weight: bold; margin-bottom: 4px;">ACTIVE WIDGET TREE</div>
          <div>Mounted: <span id="ri-mounted" style="color: #61afef;">--</span> | Unmounted: <span id="ri-unmounted">--</span></div>
          <div>Active Listeners: <span id="ri-listeners" style="color: #d19a66;">--</span></div>
          <div>Disposables Pending: <span id="ri-disposables">--</span></div>
        </div>

        <!-- AUDIT LOG & RECENT EVENT STREAMS -->
        <div style="background: #21252b; padding: 8px; border-radius: 4px;">
          <div style="color: #e5c07b; font-weight: bold; margin-bottom: 4px;">SYSTEM STREAM STATUS</div>
          <div>RingBuffer Occupancy: <span id="ri-ring-occ">0</span></div>
          <div>StreamBuffer Backlog: <span id="ri-stream-back">0</span></div>
          <div>Dropped Events: <span id="ri-dropped" style="color: #e06c75;">0</span></div>
        </div>
      </div>
    `;

    this._ui = {
      provider: this._container.querySelector('#ri-provider'),
      reality: this._container.querySelector('#ri-reality'),
      health: this._container.querySelector('#ri-health'),
      fps: this._container.querySelector('#ri-fps'),
      frameTime: this._container.querySelector('#ri-frame-time'),
      p95: this._container.querySelector('#ri-p95'),
      p99: this._container.querySelector('#ri-p99'),
      heap: this._container.querySelector('#ri-heap'),
      latency: this._container.querySelector('#ri-latency'),
      mounted: this._container.querySelector('#ri-mounted'),
      unmounted: this._container.querySelector('#ri-unmounted'),
      listeners: this._container.querySelector('#ri-listeners'),
      disposables: this._container.querySelector('#ri-disposables'),
      ringOcc: this._container.querySelector('#ri-ring-occ'),
      streamBack: this._container.querySelector('#ri-stream-back'),
      dropped: this._container.querySelector('#ri-dropped')
    };
  }

  _subscribe() {
    if (typeof this._runtime.subscribePerformanceMetrics === 'function') {
      this._disposable = this._runtime.subscribePerformanceMetrics((snapshot) => {
        this._updateUI(snapshot);
      });
    } else {
      // Periodic fallback
      const timer = setInterval(() => {
        if (typeof this._runtime.getPerformanceMetrics === 'function') {
          this._updateUI(this._runtime.getPerformanceMetrics());
        }
      }, 500);

      this._disposable = { dispose: () => clearInterval(timer) };
    }
  }

  _updateUI(metrics) {
    if (!metrics) return;

    try {
      const realityStatus = this._runtime.getRealityStatus();
      if (this._ui.provider) this._ui.provider.textContent = realityStatus.providerId || 'live-default';
      if (this._ui.reality) this._ui.reality.textContent = realityStatus.realityTag || 'OBSERVED_REALITY';
      if (this._ui.health) this._ui.health.textContent = realityStatus.healthStatus || 'HEALTHY';

      if (this._ui.fps) {
        this._ui.fps.textContent = metrics.fps || 60;
        this._ui.fps.style.color = (metrics.fps || 60) >= 55 ? '#98c379' : '#e06c75';
      }
      if (this._ui.frameTime) this._ui.frameTime.textContent = metrics.avgFrameTimeMs || 16.67;
      if (this._ui.p95) this._ui.p95.textContent = metrics.p95FrameTimeMs || 16.67;
      if (this._ui.p99) this._ui.p99.textContent = metrics.p99FrameTimeMs || 16.67;
      if (this._ui.heap) this._ui.heap.textContent = metrics.heapUsedMB || 0;
      if (this._ui.latency) this._ui.latency.textContent = metrics.providerLatencyMs || 0;

      if (this._ui.mounted) this._ui.mounted.textContent = metrics.mountedWidgetsCount || 0;
      if (this._ui.unmounted) this._ui.unmounted.textContent = metrics.unmountedWidgetsCount || 0;
      if (this._ui.listeners) this._ui.listeners.textContent = metrics.activeListenersCount || 0;
      if (this._ui.disposables) this._ui.disposables.textContent = metrics.pendingDisposablesCount || 0;

      if (this._ui.ringOcc) this._ui.ringOcc.textContent = metrics.ringBufferOccupancy || 0;
      if (this._ui.streamBack) this._ui.streamBack.textContent = metrics.streamBufferBacklog || 0;
      if (this._ui.dropped) this._ui.dropped.textContent = metrics.droppedEventsCount || 0;
    } catch (e) {
      console.error('[RuntimeInspectorWidget] Update UI error:', e);
    }
  }

  dispose() {
    if (this._disposable && typeof this._disposable.dispose === 'function') {
      this._disposable.dispose();
      this._disposable = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
      this._container = null;
    }
    this._runtime = null;
  }

  unmount() {
    this.dispose();
  }
}

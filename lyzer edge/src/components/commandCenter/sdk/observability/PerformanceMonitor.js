/**
 * Lyzer Edge Command Center V2 — PerformanceMonitor
 * Central observability metric bus and performance telemetry collector.
 * Emits real-time PerformanceSnapshots to subscribers.
 */

import { createDisposable } from '../DisposableStack.js';

export class PerformanceMonitor {
  constructor(options = {}) {
    this._sampleIntervalMs = options.sampleIntervalMs || 1000;
    this._listeners = new Set();
    
    // Core telemetry counters
    this._frameTimes = [];
    this._maxFrameSamples = 120;
    
    this._mountedWidgetsCount = 0;
    this._unmountedWidgetsCount = 0;
    this._activeListenersCount = 0;
    this._pendingDisposablesCount = 0;
    
    this._ringBufferOccupancy = 0;
    this._streamBufferBacklog = 0;
    this._droppedEventsCount = 0;
    this._coalescedEventsCount = 0;
    
    this._providerLatencyMs = 0;
    this._widgetRenderTimes = new Map();
    
    this._lastFps = 60;
    this._timer = null;
    this._isMonitoring = false;
    
    this.start();
  }

  start() {
    if (this._isMonitoring) return;
    this._isMonitoring = true;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      let lastTime = performance.now();
      const measureFrame = (now) => {
        if (!this._isMonitoring) return;
        const delta = now - lastTime;
        lastTime = now;
        if (delta > 0 && delta < 1000) {
          this._frameTimes.push(delta);
          if (this._frameTimes.length > this._maxFrameSamples) {
            this._frameTimes.shift();
          }
        }
        window.requestAnimationFrame(measureFrame);
      };
      window.requestAnimationFrame(measureFrame);
    }

    this._timer = setInterval(() => {
      this._emitSnapshot();
    }, this._sampleIntervalMs);
  }

  stop() {
    this._isMonitoring = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  recordWidgetMount(widgetId) {
    this._mountedWidgetsCount++;
  }

  recordWidgetUnmount(widgetId) {
    this._unmountedWidgetsCount++;
    this._widgetRenderTimes.delete(widgetId);
  }

  recordWidgetRender(widgetId, renderTimeMs) {
    this._widgetRenderTimes.set(widgetId, renderTimeMs);
  }

  recordBufferState(ringOccupancy, streamBacklog, dropped = 0, coalesced = 0) {
    this._ringBufferOccupancy = ringOccupancy;
    this._streamBufferBacklog = streamBacklog;
    this._droppedEventsCount += dropped;
    this._coalescedEventsCount += coalesced;
  }

  recordProviderLatency(latencyMs) {
    this._providerLatencyMs = latencyMs;
  }

  updateActiveCounters(listenersCount, disposablesCount) {
    this._activeListenersCount = listenersCount;
    this._pendingDisposablesCount = disposablesCount;
  }

  getSnapshot() {
    const frameTimesSorted = [...this._frameTimes].sort((a, b) => a - b);
    const count = frameTimesSorted.length;
    
    let avgFrameTime = 16.67;
    let p95FrameTime = 16.67;
    let p99FrameTime = 16.67;

    if (count > 0) {
      const sum = frameTimesSorted.reduce((acc, v) => acc + v, 0);
      avgFrameTime = sum / count;
      p95FrameTime = frameTimesSorted[Math.floor(count * 0.95)] || frameTimesSorted[count - 1];
      p99FrameTime = frameTimesSorted[Math.floor(count * 0.99)] || frameTimesSorted[count - 1];
    }

    const fps = avgFrameTime > 0 ? Math.min(60, Math.round(1000 / avgFrameTime)) : 60;

    let heapUsedMB = 0;
    if (typeof performance !== 'undefined' && performance.memory) {
      heapUsedMB = Math.round((performance.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
    }

    return Object.freeze({
      timestamp: Date.now(),
      fps,
      avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
      p95FrameTimeMs: Math.round(p95FrameTime * 100) / 100,
      p99FrameTimeMs: Math.round(p99FrameTime * 100) / 100,
      mountedWidgetsCount: this._mountedWidgetsCount,
      unmountedWidgetsCount: this._unmountedWidgetsCount,
      activeListenersCount: this._activeListenersCount,
      pendingDisposablesCount: this._pendingDisposablesCount,
      ringBufferOccupancy: this._ringBufferOccupancy,
      streamBufferBacklog: this._streamBufferBacklog,
      droppedEventsCount: this._droppedEventsCount,
      coalescedEventsCount: this._coalescedEventsCount,
      heapUsedMB,
      providerLatencyMs: this._providerLatencyMs,
      widgetRenderTimes: Object.freeze(Object.fromEntries(this._widgetRenderTimes))
    });
  }

  /**
   * Subscribes to performance metric snapshot events.
   * @param {Function} callback 
   * @returns {Object} Disposable handle
   */
  onSnapshot(callback) {
    if (typeof callback !== 'function') return createDisposable(() => {});
    this._listeners.add(callback);
    
    // Immediate initial callback
    callback(this.getSnapshot());

    return createDisposable(() => {
      this._listeners.delete(callback);
    });
  }

  _emitSnapshot() {
    if (this._listeners.size === 0) return;
    const snapshot = this.getSnapshot();
    for (const listener of this._listeners) {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('[PerformanceMonitor] Listener error:', e);
      }
    }
  }

  dispose() {
    this.stop();
    this._listeners.clear();
    this._frameTimes = [];
    this._widgetRenderTimes.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

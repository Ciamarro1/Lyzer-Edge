/**
 * @file FrameMetricsCollector.js
 * Lyzer Edge Command Center V2 — Passive metrics observation for the RenderScheduler.
 * Standard: M1.3 MCR
 */

export class FrameMetricsCollector {
  constructor(scheduler) {
    this._scheduler = scheduler;
    
    // Metrics state
    this._frameCount = 0;
    this._droppedFrames = 0;
    this._framesOver16ms = 0;
    this._framesOver33ms = 0;
    this._maxFrameTime = 0;
    this._totalFrameTime = 0;
    
    this._totalEventsProcessed = 0;
    
    // Bind to scheduler events
    this._scheduler.on('frame:end', this._onFrameEnd.bind(this));
    this._scheduler.on('frame:dropped', this._onFrameDropped.bind(this));
    
    this._startTime = Date.now();
    this._lastReportTime = this._startTime;
  }

  _onFrameEnd({ duration, batchSize, isDegraded }) {
    this._frameCount++;
    this._totalFrameTime += duration;
    this._totalEventsProcessed += batchSize;

    if (duration > this._maxFrameTime) {
      this._maxFrameTime = duration;
    }

    if (duration > 16.6) this._framesOver16ms++;
    if (duration > 33.3) this._framesOver33ms++;
  }

  _onFrameDropped() {
    this._droppedFrames++;
  }

  /**
   * Calculates current metrics snapshot.
   * @returns {Object}
   */
  getSnapshot() {
    const now = Date.now();
    const elapsedSec = (now - this._startTime) / 1000;
    
    const avgFrameTime = this._frameCount > 0 ? this._totalFrameTime / this._frameCount : 0;
    const throughput = elapsedSec > 0 ? this._totalEventsProcessed / elapsedSec : 0;
    const droppedRatio = this._frameCount > 0 ? this._droppedFrames / (this._frameCount + this._droppedFrames) : 0;
    
    const bufferMetrics = this._scheduler.streamBuffer.metrics;
    
    return {
      uptimeSec: elapsedSec,
      totalFrames: this._frameCount,
      droppedFrames: this._droppedFrames,
      droppedRatio: droppedRatio * 100, // %
      framesOver16ms: this._framesOver16ms,
      framesOver33ms: this._framesOver33ms,
      avgFrameTimeMs: avgFrameTime,
      maxFrameTimeMs: this._maxFrameTime,
      throughput: throughput, // events/sec
      backlog: this._scheduler.streamBuffer.totalSize,
      coalescedEvents: bufferMetrics.coalesced,
      droppedLow: bufferMetrics.droppedLow,
      droppedNormal: bufferMetrics.droppedNormal,
      degradedActivations: bufferMetrics.degradedActivations,
      isDegraded: this._scheduler.streamBuffer.isDegraded
    };
  }

  reset() {
    this._frameCount = 0;
    this._droppedFrames = 0;
    this._framesOver16ms = 0;
    this._framesOver33ms = 0;
    this._maxFrameTime = 0;
    this._totalFrameTime = 0;
    this._totalEventsProcessed = 0;
    this._startTime = Date.now();
  }
}

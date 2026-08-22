/**
 * Lyzer Edge - FrameMetricsCollector
 * Collects rendering and frame budget metrics emitted by RenderScheduler.
 */
export class FrameMetricsCollector {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.metrics = {
      totalFrames: 0,
      framesOverBudget: 0,
      droppedFrames: 0
    };
    if (scheduler && typeof scheduler.on === 'function') {
      scheduler.on('frame:end', () => {
        this.metrics.totalFrames++;
      });
      scheduler.on('frame:over_budget', () => {
        this.metrics.framesOverBudget++;
      });
      scheduler.on('frame:dropped', (data) => {
        this.metrics.droppedFrames += (data?.count || 1);
      });
    }
  }

  getSnapshot() {
    return { ...this.metrics };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalFrames: 0,
      framesOverBudget: 0,
      droppedFrames: 0
    };
  }
}

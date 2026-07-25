/**
 * @fileoverview PerformanceProfilingMonitor — Phase 12 (ADR-029)
 *
 * Monitors memory usage (heapUsed, rss), process execution latency, and bottleneck diagnostics.
 */
export class PerformanceProfilingMonitor {
  /**
   * Captures a performance and memory snapshot of the current process.
   *
   * @returns {Object} Performance snapshot
   */
  captureSnapshot() {
    const memory = process.memoryUsage ? process.memoryUsage() : { heapUsed: 0, rss: 0, heapTotal: 0 };

    const heapUsedMb = Number((memory.heapUsed / (1024 * 1024)).toFixed(2));
    const rssMb = Number((memory.rss / (1024 * 1024)).toFixed(2));
    const heapTotalMb = Number((memory.heapTotal / (1024 * 1024)).toFixed(2));

    let memoryStatus = 'NORMAL';
    if (heapUsedMb > 500) memoryStatus = 'CRITICAL_HIGH_MEMORY';
    else if (heapUsedMb > 250) memoryStatus = 'ELEVATED_MEMORY';

    return {
      timestamp: Date.now(),
      memory: {
        heap_used_mb: heapUsedMb,
        heap_total_mb: heapTotalMb,
        rss_mb: rssMb,
        status: memoryStatus
      },
      uptime_seconds: Math.floor(process.uptime ? process.uptime() : 0)
    };
  }

  /**
   * Evaluates pipeline stage durations to spot bottlenecks (stages taking > 50ms).
   *
   * @param {Array<Object>} stageLogs - Array of { stage, duration_ms }
   * @returns {Object} Bottleneck evaluation report
   */
  detectBottlenecks(stageLogs = []) {
    const bottlenecks = stageLogs.filter(s => (s.duration_ms || 0) > 50);

    return {
      has_bottlenecks: bottlenecks.length > 0,
      bottleneck_count: bottlenecks.length,
      bottlenecks,
      analyzed_stages_count: stageLogs.length,
      evaluated_at: Date.now()
    };
  }
}

import { describe, test, expect } from 'vitest';
import { PerformanceProfilingMonitor } from '../../src/cognitive-operations/PerformanceProfilingMonitor.js';

describe('Fase 12 — PerformanceProfilingMonitor Verification', () => {
  test('captures memory performance snapshot and detects stage bottlenecks', () => {
    const monitor = new PerformanceProfilingMonitor();

    const snapshot = monitor.captureSnapshot();
    expect(snapshot.memory.heap_used_mb).toBeGreaterThan(0);
    expect(snapshot.memory.status).toBeDefined();

    const bottlenecksReport = monitor.detectBottlenecks([
      { stage: 'PERCEPTION', duration_ms: 12 },
      { stage: 'EMPRICAL_VALIDATION', duration_ms: 85 }, // bottleneck > 50ms
      { stage: 'EXECUTION', duration_ms: 5 }
    ]);

    expect(bottlenecksReport.has_bottlenecks).toBe(true);
    expect(bottlenecksReport.bottleneck_count).toBe(1);
    expect(bottlenecksReport.bottlenecks[0].stage).toBe('EMPRICAL_VALIDATION');
  });
});

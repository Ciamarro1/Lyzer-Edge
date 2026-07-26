import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DistributedTracingEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/DistributedTracingEngine.js';
import { HistoricalTrendEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/HistoricalTrendEngine.js';
import { BenchmarkReproducibilityEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/BenchmarkReproducibilityEngine.js';

describe('Phase 12 — Distributed Observability, Historical Trends & Reproducibility Suite', () => {
  let tracingEngine;
  let trendEngine;
  let reproEngine;

  beforeEach(() => {
    tracingEngine = new DistributedTracingEngine();
    trendEngine = new HistoricalTrendEngine();
    reproEngine = new BenchmarkReproducibilityEngine();
  });

  afterEach(() => {
    tracingEngine.dispose();
    trendEngine.dispose();
    reproEngine.dispose();
  });

  // === Pillar 1: Distributed Tracing ===

  it('1. DistributedTracingEngine should create traces with spans and compute durations', () => {
    const trace = tracingEngine.createTrace('tick-pipeline');
    const span1 = trace.addSpan('data-ingestion');
    span1.finish('OK');
    const span2 = trace.addSpan('signal-evaluation');
    span2.finish('OK');
    trace.finish('OK');

    const completed = tracingEngine.getCompletedTraces(1);
    expect(completed).toHaveLength(1);
    expect(completed[0].name).toBe('tick-pipeline');
    expect(completed[0].totalSpans).toBe(3); // root + 2 children
    expect(completed[0].totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(completed[0].status).toBe('OK');
  });

  it('2. DistributedTracingEngine should compute per-pipeline-stage aggregate metrics', () => {
    // Create multiple traces to build aggregates
    for (let i = 0; i < 5; i++) {
      const trace = tracingEngine.createTrace('tick-pipeline');
      const s = trace.addSpan('signal-evaluation');
      s.finish('OK');
      trace.finish('OK');
    }

    const metrics = tracingEngine.computePipelineMetrics();
    expect(metrics['signal-evaluation']).toBeDefined();
    expect(metrics['signal-evaluation'].count).toBe(5);
    expect(metrics['signal-evaluation'].avgMs).toBeGreaterThanOrEqual(0);
    expect(metrics['signal-evaluation'].p50Ms).toBeDefined();
    expect(metrics['signal-evaluation'].p99Ms).toBeDefined();
  });

  // === Pillar 2: Historical Trends ===

  it('3. HistoricalTrendEngine should record snapshots and compute deltas between commits', () => {
    const snapshotA = {
      producao: { sharpeOOS: 2.0, maxDrawdownPct: 5.0 },
      performance: { p99LatencyUs: 40.0 },
      memoria: { heapUsedMb: 40.0 },
      engenharia: { codeCoveragePct: 97.0, buildTimeSeconds: 4.0 },
      complexidade: { wiringEfficiencyPct: 100.0 },
      estatistica: { dsrScore: 0.95 }
    };

    const snapshotB = {
      producao: { sharpeOOS: 2.2, maxDrawdownPct: 4.5 },
      performance: { p99LatencyUs: 42.0 },
      memoria: { heapUsedMb: 41.0 },
      engenharia: { codeCoveragePct: 98.0, buildTimeSeconds: 3.8 },
      complexidade: { wiringEfficiencyPct: 100.0 },
      estatistica: { dsrScore: 0.96 }
    };

    trendEngine.recordSnapshot('abc1234', snapshotA);
    trendEngine.recordSnapshot('def5678', snapshotB);

    const delta = trendEngine.computeDelta('abc1234', 'def5678');
    expect(delta.commitA).toBe('abc1234');
    expect(delta.commitB).toBe('def5678');
    expect(delta.deltas.sharpeOOS.absoluteDelta).toBeCloseTo(0.2, 1);
    expect(delta.deltas.sharpeOOS.pctChange).toBeGreaterThan(0);
    expect(delta.deltas.p99LatencyUs.absoluteDelta).toBeCloseTo(2.0, 1);
  });

  it('4. HistoricalTrendEngine should detect regressions when thresholds are breached', () => {
    const baseline = {
      producao: { sharpeOOS: 2.0, maxDrawdownPct: 5.0 },
      performance: { p99LatencyUs: 40.0 },
      memoria: { heapUsedMb: 40.0 },
      engenharia: { codeCoveragePct: 98.0, buildTimeSeconds: 4.0 },
      complexidade: { wiringEfficiencyPct: 100.0 },
      estatistica: { dsrScore: 0.95 }
    };

    const degraded = {
      producao: { sharpeOOS: 1.0, maxDrawdownPct: 12.0 },  // Sharpe dropped 50%, drawdown rose 140%
      performance: { p99LatencyUs: 80.0 },                   // Latency doubled
      memoria: { heapUsedMb: 60.0 },                         // Heap grew 50%
      engenharia: { codeCoveragePct: 95.0, buildTimeSeconds: 8.0 },
      complexidade: { wiringEfficiencyPct: 100.0 },
      estatistica: { dsrScore: 0.85 }
    };

    trendEngine.recordSnapshot('good', baseline);
    trendEngine.recordSnapshot('bad', degraded);

    const regressions = trendEngine.detectRegressions(2);
    expect(regressions.length).toBeGreaterThan(0);

    const sharpeRegression = regressions.find(r => r.metric === 'sharpeOOS');
    expect(sharpeRegression).toBeDefined();
    expect(sharpeRegression.severity).toBe('CRITICAL');
  });

  it('5. HistoricalTrendEngine should return sparkline-ready time-series', () => {
    for (let i = 0; i < 10; i++) {
      trendEngine.recordSnapshot(`commit_${i}`, {
        producao: { sharpeOOS: 2.0 + i * 0.01, maxDrawdownPct: 5.0 },
        performance: { p99LatencyUs: 40.0 },
        memoria: { heapUsedMb: 40.0 },
        engenharia: { codeCoveragePct: 98.0, buildTimeSeconds: 4.0 },
        complexidade: { wiringEfficiencyPct: 100.0 },
        estatistica: { dsrScore: 0.95 }
      });
    }

    const series = trendEngine.getTrendSeries('sharpeOOS', 10);
    expect(series).toHaveLength(10);
    expect(series[0].commitHash).toBe('commit_0');
    expect(series[9].value).toBeGreaterThan(series[0].value);
  });

  // === Pillar 3: Reproducibility ===

  it('6. BenchmarkReproducibilityEngine should capture full environment fingerprint', () => {
    const record = reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.18, p99LatencyUs: 45.2 },
      { pipelineMode: 'FULL', evidenceEngines: 7 },
      { commitHash: '4ca50ec' }
    );

    expect(record.commitHash).toBe('4ca50ec');
    expect(record.configHash).toBeDefined();
    expect(record.datasetHash).toBeDefined();
    expect(record.environment.nodeVersion).toBeDefined();
    expect(record.environment.platform).toBeDefined();
    expect(record.environment.arch).toBeDefined();
    expect(record.result.sharpeOOS).toBe(2.18);
  });

  it('7. BenchmarkReproducibilityEngine should compare runs and detect environment differences', () => {
    const recordA = reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.0, p99Us: 40.0 },
      { mode: 'FULL' },
      { commitHash: 'aaa' }
    );
    const recordB = reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.2, p99Us: 42.0 },
      { mode: 'FULL' },
      { commitHash: 'bbb' }
    );

    const comparison = reproEngine.compareRuns(recordA, recordB);
    expect(comparison.sameConfig).toBe(true);
    expect(comparison.metricDifferences.sharpeOOS.delta).toBeCloseTo(0.2, 1);
  });

  it('8. BenchmarkReproducibilityEngine should export reproducibility manifest', () => {
    reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.18 },
      { mode: 'FULL' },
      { commitHash: 'xyz789' }
    );

    const manifest = reproEngine.exportReproducibilityManifest();
    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.commitHash).toBe('xyz789');
    expect(manifest.environment).toBeDefined();
    expect(manifest.config).toBeDefined();
    expect(manifest.instructions).toContain('reproduce');
  });

  // === Safety & Compliance ===

  it('9. TC39 Symbol.dispose compliance across all three engines', () => {
    expect(typeof tracingEngine[Symbol.dispose]).toBe('function');
    expect(typeof trendEngine[Symbol.dispose]).toBe('function');
    expect(typeof reproEngine[Symbol.dispose]).toBe('function');

    tracingEngine[Symbol.dispose]();
    trendEngine[Symbol.dispose]();
    reproEngine[Symbol.dispose]();

    expect(() => tracingEngine.createTrace('test')).toThrow('ERR_TRACING_ENGINE_DISPOSED');
    expect(() => trendEngine.recordSnapshot('x', {})).toThrow('ERR_TREND_ENGINE_DISPOSED');
    expect(() => reproEngine.captureFingerprintedRun({}, {})).toThrow('ERR_REPRODUCIBILITY_ENGINE_DISPOSED');
  });

  it('10. Zero-Trust: No trade signals (BUY/SELL) emitted from any engine', () => {
    const trace = tracingEngine.createTrace('test');
    trace.finish('OK');
    const completed = tracingEngine.getCompletedTraces(1);
    const traceJson = JSON.stringify(completed);

    const record = reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.0 }, { mode: 'FULL' }, { commitHash: 'test' }
    );
    const reproJson = JSON.stringify(record);

    for (const json of [traceJson, reproJson]) {
      expect(json).not.toContain('"BUY"');
      expect(json).not.toContain('"SELL"');
    }
  });
});

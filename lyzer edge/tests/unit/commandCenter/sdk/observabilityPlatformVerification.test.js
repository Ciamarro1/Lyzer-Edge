import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DistributedTracingEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/DistributedTracingEngine.js';
import { HistoricalTrendEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/HistoricalTrendEngine.js';
import { BenchmarkReproducibilityEngine } from '../../../../src/components/commandCenter/sdk/evidence/observability/BenchmarkReproducibilityEngine.js';

describe('Phase 12 — Guardian Observability Platform Verification Suite', () => {
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

  it('1. Trace spans form correct parent-child hierarchy', () => {
    const trace = tracingEngine.createTrace('pipeline');
    const childA = trace.addSpan('ingestion');
    const childB = trace.addSpan('evaluation', childA.spanId);
    childA.finish('OK');
    childB.finish('OK');
    trace.finish('OK');

    const completed = tracingEngine.getCompletedTraces(1);
    const spans = completed[0].spans;

    // Root span should have children
    const root = spans.find(s => !s.parentSpanId);
    expect(root.children.length).toBeGreaterThan(0);

    // Child B should have childA as parent
    const spanB = spans.find(s => s.name === 'evaluation');
    expect(spanB.parentSpanId).toBe(childA.spanId);
  });

  it('2. Historical ring buffer enforces max capacity', () => {
    const smallEngine = new HistoricalTrendEngine(5);

    for (let i = 0; i < 10; i++) {
      smallEngine.recordSnapshot(`c${i}`, {
        producao: { sharpeOOS: 2.0, maxDrawdownPct: 5.0 },
        performance: { p99LatencyUs: 40.0 },
        memoria: { heapUsedMb: 40.0 },
        engenharia: { codeCoveragePct: 98.0, buildTimeSeconds: 4.0 },
        complexidade: { wiringEfficiencyPct: 100.0 },
        estatistica: { dsrScore: 0.95 }
      });
    }

    expect(smallEngine.snapshotCount).toBe(5);
    // Oldest commits should have been evicted
    expect(() => smallEngine.computeDelta('c0', 'c9')).toThrow('ERR_COMMIT_NOT_FOUND');

    smallEngine.dispose();
  });

  it('3. Reproducibility manifest schema is complete and self-describing', () => {
    reproEngine.captureFingerprintedRun(
      { sharpeOOS: 2.18 },
      { mode: 'FULL', engines: ['openmobius', 'liquidity'] },
      { commitHash: 'abc123', parameters: { trgThreshold: 0.4, lhdsLimit: 0.6 } }
    );

    const manifest = reproEngine.exportReproducibilityManifest();

    expect(manifest.schemaVersion).toBe('1.0.0');
    expect(manifest.commitHash).toBe('abc123');
    expect(manifest.configHash).toHaveLength(16);
    expect(manifest.datasetHash).toHaveLength(16);
    expect(manifest.environment.nodeVersion).toBeDefined();
    expect(manifest.environment.v8Version).toBeDefined();
    expect(manifest.parameters.trgThreshold).toBe(0.4);
    expect(manifest.instructions).toContain('reproduce');
  });

  it('4. Trend engine rejects unknown metric names', () => {
    trendEngine.recordSnapshot('x', {
      producao: { sharpeOOS: 2.0, maxDrawdownPct: 5.0 },
      performance: { p99LatencyUs: 40.0 },
      memoria: { heapUsedMb: 40.0 },
      engenharia: { codeCoveragePct: 98.0, buildTimeSeconds: 4.0 },
      complexidade: { wiringEfficiencyPct: 100.0 },
      estatistica: { dsrScore: 0.95 }
    });

    expect(() => trendEngine.getTrendSeries('invalidMetric')).toThrow('ERR_UNKNOWN_METRIC');
  });

  it('5. Reproducibility engine rejects calls after disposal', () => {
    reproEngine[Symbol.dispose]();

    expect(() => reproEngine.captureFingerprintedRun({}, {})).toThrow('ERR_REPRODUCIBILITY_ENGINE_DISPOSED');
    expect(() => reproEngine.exportReproducibilityManifest()).toThrow('ERR_REPRODUCIBILITY_ENGINE_DISPOSED');
  });

  it('6. Run comparison correctly identifies config and dataset mismatches', () => {
    const runA = reproEngine.captureFingerprintedRun(
      { score: 1.0 },
      { mode: 'FAST' },
      { commitHash: 'a1', dataset: 'btc_2024' }
    );
    const runB = reproEngine.captureFingerprintedRun(
      { score: 1.5 },
      { mode: 'FULL' },  // Different config
      { commitHash: 'b2', dataset: 'eth_2024' }  // Different dataset
    );

    const comparison = reproEngine.compareRuns(runA, runB);
    expect(comparison.sameConfig).toBe(false);
    expect(comparison.sameDataset).toBe(false);
  });
});

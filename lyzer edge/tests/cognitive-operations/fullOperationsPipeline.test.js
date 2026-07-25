import { describe, test, expect } from 'vitest';
import { CausalMemoryDB } from '../../backend/db.js';
import { CognitiveOperationsFacade } from '../../src/cognitive-operations/index.js';

describe('Fase 12 — Full Cognitive Operations & Telemetry Pipeline Verification', () => {
  function createDb() {
    return new CausalMemoryDB(`/tmp/data/test_ops_pipeline_${Date.now()}_${Math.floor(Math.random() * 10000)}.db`);
  }

  test('runs complete ops status report with telemetry, tracing, and profiling', () => {
    const db = createDb();
    const facade = new CognitiveOperationsFacade(db);

    const scores = {
      ccs: 100.0,
      ces: 90.0,
      ehs: 92.0,
      ars: 18.0,
      cas: 85.0,
      mas: 88.0
    };

    // Start a trace
    facade.startTrace('trace_ops_01', { mode: 'LIVE_SIM' });
    facade.recordStage('trace_ops_01', 'PERCEPTION', { dvf: 0.7 });
    facade.endTrace('trace_ops_01');

    const report = facade.generateDashboardStatus(scores);

    expect(report.title).toBe('LYZER COGNITIVE OPERATIONS DASHBOARD');
    expect(report.telemetry.gchi).toBeGreaterThan(85.0);
    expect(report.operations_status).toBe('ALL_SYSTEMS_GO');
    expect(report.performance.memory.heap_used_mb).toBeGreaterThan(0);

    db.close();
  });
});

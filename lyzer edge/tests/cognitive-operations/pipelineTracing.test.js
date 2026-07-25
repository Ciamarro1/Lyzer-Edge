import { describe, test, expect } from 'vitest';
import { PipelineTracingEngine } from '../../src/cognitive-operations/PipelineTracingEngine.js';

describe('Fase 12 — PipelineTracingEngine Verification', () => {
  test('tracks end-to-end pipeline stages and duration', () => {
    const engine = new PipelineTracingEngine();

    const trace = engine.startTrace('trace_tick_1001', { symbol: 'BTC-USD' });
    expect(trace.status).toBe('IN_PROGRESS');

    engine.recordStage('trace_tick_1001', 'PERCEPTION', { dvf: 0.8 });
    engine.recordStage('trace_tick_1001', 'CAUSAL_MEMORY', { verified: true });
    engine.recordStage('trace_tick_1001', 'COURT', { decision: 'APPROVED' });

    const completed = engine.endTrace('trace_tick_1001', 'COMPLETED');

    expect(completed.status).toBe('COMPLETED');
    expect(completed.stages.length).toBe(3);
    expect(completed.stages[0].stage).toBe('PERCEPTION');
    expect(completed.stages[2].stage).toBe('COURT');
    expect(completed.total_duration_ms).toBeGreaterThanOrEqual(0);
  });
});

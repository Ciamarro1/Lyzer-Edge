import { describe, test, expect } from 'vitest';
import {
  register,
  recordTickReceived,
  recordTickDuration,
  recordCsrlDuration,
  recordCclistEvaluation,
  recordEcaEvaluation,
  recordSqliteWrite
} from '../../src/observability/index.js';

describe('Observability Layer Suite', () => {
  test('Prometheus registry initializes and exports metrics', async () => {
    const metricsString = await register.metrics();
    expect(metricsString).toBeDefined();
    expect(typeof metricsString).toBe('string');
    expect(metricsString).toContain('lyzer_runtime_');
  });

  test('Pipeline and Constitutional metrics recording', async () => {
    recordTickReceived('BTCUSDT', 'websocket');
    recordTickDuration('BTCUSDT', 'SUCCESS', 0.0012);
    recordCsrlDuration('BTCUSDT', 0.0004);
    recordCclistEvaluation('BTCUSDT', 0.0002);
    recordEcaEvaluation('BTCUSDT', 'ALLOW');
    recordEcaEvaluation('BTCUSDT', 'REJECT', 'VETO_NO_SURVIVAL_NECESSITY');
    recordSqliteWrite('insert_batch', 0.0008);

    const metricsString = await register.metrics();
    expect(metricsString).toContain('lyzer_pipeline_ticks_received_total');
    expect(metricsString).toContain('lyzer_pipeline_tick_processing_duration_seconds');
    expect(metricsString).toContain('lyzer_constitution_evaluations_total');
    expect(metricsString).toContain('lyzer_constitution_veto_total');
    expect(metricsString).toContain('lyzer_persistence_sqlite_write_duration_seconds');
  });
});

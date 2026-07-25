/**
 * Lyzer Edge - Metrics Registry Core (Prometheus Integration)
 * Isolates prom-client initialization and metric definitions.
 */

import client from 'prom-client';

export const register = new client.Registry();

// Enable default V8 process & runtime metrics
client.collectDefaultMetrics({
  register,
  prefix: 'lyzer_runtime_'
});

// 1. Pipeline Metrics
export const ticksReceivedCounter = new client.Counter({
  name: 'lyzer_pipeline_ticks_received_total',
  help: 'Total candle ticks received',
  labelNames: ['symbol', 'source'],
  registers: [register]
});

export const tickProcessingHistogram = new client.Histogram({
  name: 'lyzer_pipeline_tick_processing_duration_seconds',
  help: 'Tick processing duration in seconds',
  labelNames: ['symbol', 'status'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050, 0.100, 0.250, 0.500, 1.0],
  registers: [register]
});

export const csrlProcessingHistogram = new client.Histogram({
  name: 'lyzer_pipeline_csrl_processing_duration_seconds',
  help: 'CSRL tensor alignment processing duration in seconds',
  labelNames: ['symbol'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050, 0.100],
  registers: [register]
});

export const cclistEvaluationHistogram = new client.Histogram({
  name: 'lyzer_pipeline_cclist_evaluation_duration_seconds',
  help: 'C-CLIST oracle stress evaluation duration in seconds',
  labelNames: ['symbol'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050],
  registers: [register]
});

// 2. Constitutional Metrics
export const ecaEvaluationsCounter = new client.Counter({
  name: 'lyzer_constitution_evaluations_total',
  help: 'Total ECA Court evaluations',
  labelNames: ['symbol', 'decision'],
  registers: [register]
});

export const constitutionalVetoCounter = new client.Counter({
  name: 'lyzer_constitution_veto_total',
  help: 'Total ECA Court veto decisions by reason code',
  labelNames: ['symbol', 'reason_code'],
  registers: [register]
});

export const riskGatewayLatencyHistogram = new client.Histogram({
  name: 'lyzer_constitution_risk_gateway_latency_seconds',
  help: 'Risk Gateway IPC gRPC latency in seconds',
  labelNames: ['service', 'status'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050, 0.100],
  registers: [register]
});

// 3. Persistence Metrics
export const sqliteWriteDurationHistogram = new client.Histogram({
  name: 'lyzer_persistence_sqlite_write_duration_seconds',
  help: 'SQLite write operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050, 0.100],
  registers: [register]
});

export const sqliteLockWaitHistogram = new client.Histogram({
  name: 'lyzer_persistence_sqlite_lock_wait_seconds',
  help: 'SQLite lock wait duration in seconds',
  labelNames: ['db_name'],
  buckets: [0.0001, 0.0005, 0.001, 0.0025, 0.005, 0.010, 0.025, 0.050],
  registers: [register]
});

// 4. System Health Metrics
export const systemErrorsCounter = new client.Counter({
  name: 'lyzer_system_errors_total',
  help: 'Total system exceptions and errors',
  labelNames: ['component', 'error_type'],
  registers: [register]
});

export const activeConnectionsGauge = new client.Gauge({
  name: 'lyzer_system_active_connections',
  help: 'Active network connections by protocol',
  labelNames: ['protocol'],
  registers: [register]
});

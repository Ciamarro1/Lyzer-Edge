/**
 * Lyzer Edge - Observability Layer Facade
 * Provides clean helper functions for metric collection and trace correlation.
 */

import {
  register,
  ticksReceivedCounter,
  tickProcessingHistogram,
  csrlProcessingHistogram,
  cclistEvaluationHistogram,
  ecaEvaluationsCounter,
  constitutionalVetoCounter,
  sqliteWriteDurationHistogram,
  sqliteLockWaitHistogram,
  riskGatewayLatencyHistogram,
  systemErrorsCounter,
  activeConnectionsGauge,
  signalGeneratedCounter,
  kernelEvaluatedCounter
} from './metricsRegistry.js';

export { register };

export function recordTickReceived(symbol, source = 'websocket') {
  ticksReceivedCounter.inc({ symbol, source });
}

export function recordTickDuration(symbol, status, durationSeconds) {
  tickProcessingHistogram.observe({ symbol, status }, durationSeconds);
}

export function recordCsrlDuration(symbol, durationSeconds) {
  csrlProcessingHistogram.observe({ symbol }, durationSeconds);
}

export function recordCclistEvaluation(symbol, durationSeconds) {
  cclistEvaluationHistogram.observe({ symbol }, durationSeconds);
}

export function recordEcaEvaluation(symbol, decision, reasonCode = null) {
  ecaEvaluationsCounter.inc({ symbol, decision });
  if (decision === 'REJECT' && reasonCode) {
    constitutionalVetoCounter.inc({ symbol, reason_code: reasonCode });
  }
}

export function recordSqliteWrite(operation, durationSeconds) {
  sqliteWriteDurationHistogram.observe({ operation }, durationSeconds);
}

export function recordSqliteLockWait(dbName, durationSeconds) {
  sqliteLockWaitHistogram.observe({ db_name: dbName }, durationSeconds);
}

export function recordRiskGatewayLatency(service, status, durationSeconds) {
  riskGatewayLatencyHistogram.observe({ service, status }, durationSeconds);
}

export function recordSystemError(component, errorType) {
  systemErrorsCounter.inc({ component, error_type: errorType });
}

export function recordSignalGenerated(symbol, signal) {
  signalGeneratedCounter.inc({ symbol, signal });
}

export function recordKernelEvaluated(symbol, eef, epistemicAuthority) {
  kernelEvaluatedCounter.inc({ symbol, eef: String(eef), epistemic_authority: epistemicAuthority });
}

export function setActiveConnections(protocol, count) {
  activeConnectionsGauge.set({ protocol }, count);
}

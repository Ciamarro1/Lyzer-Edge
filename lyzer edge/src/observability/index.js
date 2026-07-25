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
  systemErrorsCounter,
  activeConnectionsGauge
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

export function recordSystemError(component, errorType) {
  systemErrorsCounter.inc({ component, error_type: errorType });
}

export function setActiveConnections(protocol, count) {
  activeConnectionsGauge.set({ protocol }, count);
}

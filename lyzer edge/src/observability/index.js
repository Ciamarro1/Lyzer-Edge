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
  kernelEvaluatedCounter,
  breakEvenTradesCounter,
  breakEvenTrades,
  tradesProtected
} from './metricsRegistry.js';

export {
  register,
  breakEvenTradesCounter,
  breakEvenTrades,
  tradesProtected
};

const isSimulation = () => process.env.ARL_MODE === 'SIMULATION' || process.env.FAST_REPLAY === 'true';

export function recordTickReceived(symbol, source = 'websocket') {
  if (isSimulation()) return;
  ticksReceivedCounter.inc({ symbol, source });
}

export function recordTickDuration(symbol, status, durationSeconds) {
  if (isSimulation()) return;
  tickProcessingHistogram.observe({ symbol, status }, durationSeconds);
}

export function recordCsrlDuration(symbol, durationSeconds) {
  if (isSimulation()) return;
  csrlProcessingHistogram.observe({ symbol }, durationSeconds);
}

export function recordCclistEvaluation(symbol, durationSeconds) {
  if (isSimulation()) return;
  cclistEvaluationHistogram.observe({ symbol }, durationSeconds);
}

export function recordEcaEvaluation(symbol, decision, reasonCode = null) {
  if (isSimulation()) return;
  ecaEvaluationsCounter.inc({ symbol, decision });
  if (decision === 'REJECT' && reasonCode) {
    constitutionalVetoCounter.inc({ symbol, reason_code: reasonCode });
  }
}

export function recordSqliteWrite(operation, durationSeconds) {
  if (isSimulation()) return;
  sqliteWriteDurationHistogram.observe({ operation }, durationSeconds);
}

export function recordSqliteLockWait(dbName, durationSeconds) {
  if (isSimulation()) return;
  sqliteLockWaitHistogram.observe({ db_name: dbName }, durationSeconds);
}

export function recordRiskGatewayLatency(service, status, durationSeconds) {
  if (isSimulation()) return;
  riskGatewayLatencyHistogram.observe({ service, status }, durationSeconds);
}

export function recordSystemError(component, errorType) {
  if (isSimulation()) return;
  systemErrorsCounter.inc({ component, error_type: errorType });
}

export function recordSignalGenerated(symbol, signal) {
  if (isSimulation()) return;
  signalGeneratedCounter.inc({ symbol, signal });
}

export function recordKernelEvaluated(symbol, eef, epistemicAuthority) {
  if (isSimulation()) return;
  kernelEvaluatedCounter.inc({ symbol, eef: String(eef), epistemic_authority: epistemicAuthority });
}

export function recordBreakEvenTrade(symbol, direction = 'UNKNOWN') {
  if (isSimulation()) return;
  breakEvenTradesCounter.inc({ symbol, direction });
}

export function setActiveConnections(protocol, count) {
  if (isSimulation()) return;
  activeConnectionsGauge.set({ protocol }, count);
}

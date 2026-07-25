/**
 * @fileoverview Decision Trace Instrumentation System (Operação Runtime Fidelity)
 * Generates unique causal Trace IDs and logs decision step trajectories:
 * TraceID -> Timestamp -> Asset -> Candle -> Provider V1..V4 -> TruthKernel -> ExecutionTrigger -> Risk -> Sizing -> Court -> OMS -> Exchange
 */

export class DecisionTrace {
  constructor(config = {}) {
    this.traceId = config.traceId || `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = config.timestamp || Date.now();
    this.symbol = config.symbol || 'BTCUSDT';
    this.candle = config.candle || null;
    this.providers = {};
    this.truthKernel = null;
    this.executionTrigger = null;
    this.risk = null;
    this.sizing = null;
    this.court = null;
    this.oms = null;
    this.exchange = null;
    this.status = 'PENDING';
  }

  recordProviders(v1, v2, v3, v4) {
    this.providers = { v1, v2, v3, v4 };
  }

  recordTruthKernel(trg, dvf, eef, reason) {
    this.truthKernel = { trg, dvf, eef, reason };
  }

  recordExecutionTrigger(trgThreshold, status) {
    this.executionTrigger = { trgThreshold, status };
  }

  recordCourtPermission(granted, reason, cclistStress, molState) {
    this.court = { granted, reason, cclistStress, molState };
    this.status = granted ? 'AUTHORIZED' : 'REJECTED';
  }

  recordExecution(orderId, side, price, qty) {
    this.oms = { orderId, side, price, qty };
    this.exchange = { status: 'FILLED_MOCK', executedAt: Date.now() };
    this.status = 'EXECUTED';
  }

  toObject() {
    return {
      traceId: this.traceId,
      timestamp: this.timestamp,
      symbol: this.symbol,
      status: this.status,
      candle: this.candle,
      providers: this.providers,
      truthKernel: this.truthKernel,
      executionTrigger: this.executionTrigger,
      court: this.court,
      oms: this.oms,
      exchange: this.exchange
    };
  }
}

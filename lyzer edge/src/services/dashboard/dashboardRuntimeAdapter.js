/**
 * Lyzer Edge Command Center v2 — Runtime Contract Adapter
 *
 * ARCHITECTURAL RULE: This is the SOLE bridge between the Command Center UI
 * and the L15 runtime layers. The UI must NEVER import directly from:
 *   - RealityGapMonitor
 *   - ShadowExecutionEngine
 *   - ShadowWarEnduranceSuite
 *   - AlphaObservationFirewall
 *   - TruthKernel
 *   - Any Alpha Core module
 *
 * The adapter consumes dashboardDataProvider internally and exposes only a
 * consolidated, pre-digested read-only snapshot contract.
 *
 * ZERO write methods. Any attempt to add one triggers DASHBOARD_CONTROL_VETO.
 */

import { dataProvider } from './dashboardDataProvider.js';
import { securityGuard } from './dashboardSecurityGuard.js';

/**
 * @typedef {Object} RuntimeSnapshot
 * @property {string}  system_stage    - Current lifecycle stage (e.g. "L15")
 * @property {string}  governance      - Governance semaphore (GREEN|YELLOW|ORANGE|RED)
 * @property {string}  alpha_state     - Alpha immutability status (IMMUTABLE|COMPROMISED)
 * @property {string}  capital_status  - Capital connection (NOT_CONNECTED|SHADOW_ONLY|LIVE)
 * @property {Object}  reality         - Reality observation metrics
 * @property {Object}  alpha           - Alpha integrity hashes and veto counts
 * @property {Object}  execution       - Shadow execution statistics
 * @property {Object}  endurance       - Operational survival telemetry
 * @property {Object}  black_swan      - Adversarial certification results
 * @property {Object}  lineage         - Data lineage verification status
 * @property {string}  snapshot_timestamp - ISO 8601 timestamp of snapshot generation
 */

class CommandCenterRuntimeAdapter {
  constructor() {
    this._dataProvider = dataProvider;
    this._securityGuard = securityGuard;

    // Default contract values (safe initial state before any data arrives)
    this._defaults = {
      system_stage: 'L15',
      governance: 'GREEN',
      alpha_state: 'IMMUTABLE',
      capital_status: 'NOT_CONNECTED',

      reality: {
        score: 0,
        state: 'AWAITING_DATA',
        slippage: 0,
        latency_ms: 0,
        ntp_drift_ms: 0
      },

      alpha: {
        truth_kernel_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        imce_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        smc_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        regime_hash: '0000000000000000000000000000000000000000000000000000000000000000',
        mutation_attempts: 0,
        veto_count: 0
      },

      execution: {
        simulated_orders: 0,
        filled: 0,
        rejected_spread: 0,
        rejected_clock: 0
      },

      endurance: {
        uptime_pct: 0,
        heap_status: 'AWAITING_DATA',
        heap_growth_mb: 0,
        reconnect_events: 0,
        ledger_integrity: 'AWAITING_DATA'
      },

      black_swan: {
        overall: 'AWAITING_DATA',
        scenarios_passed: 0,
        scenarios_total: 0
      },

      lineage: {
        verified: false,
        last_hash: '',
        chain_length: 0
      }
    };
  }

  /**
   * Returns a consolidated, read-only snapshot of the entire system state.
   * This is the ONLY method the UI should call.
   *
   * @returns {RuntimeSnapshot}
   */
  getSnapshot() {
    const observed = this._dataProvider.getObservedMetrics();
    const synthetic = this._dataProvider.getSyntheticMetrics();

    // Build snapshot by extracting known metric names from the stores
    const snapshot = {
      system_stage: this._extractValue(observed, 'SystemStage', this._defaults.system_stage),
      governance: this._extractValue(observed, 'GovernanceStatus', this._defaults.governance),
      alpha_state: this._extractValue(observed, 'AlphaState', this._defaults.alpha_state),
      capital_status: this._extractValue(observed, 'CapitalStatus', this._defaults.capital_status),

      reality: {
        score: this._extractNumeric(observed, 'RealityGapScore', this._defaults.reality.score),
        state: this._extractValue(observed, 'RealityState', this._defaults.reality.state),
        slippage: this._extractNumeric(observed, 'Slippage', this._defaults.reality.slippage),
        latency_ms: this._extractNumeric(observed, 'LatencyMs', this._defaults.reality.latency_ms),
        ntp_drift_ms: this._extractNumeric(observed, 'NtpDriftMs', this._defaults.reality.ntp_drift_ms)
      },

      alpha: {
        truth_kernel_hash: this._extractValue(observed, 'TruthKernelHash', this._defaults.alpha.truth_kernel_hash),
        imce_hash: this._extractValue(observed, 'ImceHash', this._defaults.alpha.imce_hash),
        smc_hash: this._extractValue(observed, 'SmcHash', this._defaults.alpha.smc_hash),
        regime_hash: this._extractValue(observed, 'RegimeHash', this._defaults.alpha.regime_hash),
        mutation_attempts: this._extractNumeric(observed, 'MutationAttempts', this._defaults.alpha.mutation_attempts),
        veto_count: this._securityGuard.getVetoCount()
      },

      execution: {
        simulated_orders: this._extractNumeric(observed, 'SimulatedOrders', this._defaults.execution.simulated_orders),
        filled: this._extractNumeric(observed, 'FilledOrders', this._defaults.execution.filled),
        rejected_spread: this._extractNumeric(observed, 'RejectedSpread', this._defaults.execution.rejected_spread),
        rejected_clock: this._extractNumeric(observed, 'RejectedClock', this._defaults.execution.rejected_clock)
      },

      endurance: {
        uptime_pct: this._extractNumeric(observed, 'UptimePct', this._defaults.endurance.uptime_pct),
        heap_status: this._extractValue(observed, 'HeapStatus', this._defaults.endurance.heap_status),
        heap_growth_mb: this._extractNumeric(observed, 'HeapGrowthMb', this._defaults.endurance.heap_growth_mb),
        reconnect_events: this._extractNumeric(observed, 'ReconnectEvents', this._defaults.endurance.reconnect_events),
        ledger_integrity: this._extractValue(observed, 'LedgerIntegrity', this._defaults.endurance.ledger_integrity)
      },

      black_swan: {
        overall: this._extractValue(synthetic, 'BlackSwanOverall', this._defaults.black_swan.overall),
        scenarios_passed: this._extractNumeric(synthetic, 'BlackSwanPassed', this._defaults.black_swan.scenarios_passed),
        scenarios_total: this._extractNumeric(synthetic, 'BlackSwanTotal', this._defaults.black_swan.scenarios_total)
      },

      lineage: {
        verified: this._extractValue(observed, 'LineageVerified', this._defaults.lineage.verified),
        last_hash: this._extractValue(observed, 'LineageLastHash', this._defaults.lineage.last_hash),
        chain_length: this._extractNumeric(observed, 'LineageChainLength', this._defaults.lineage.chain_length)
      },

      snapshot_timestamp: new Date().toISOString()
    };

    return Object.freeze(snapshot);
  }

  /**
   * Returns default snapshot (for boot state before any data arrives).
   * @returns {RuntimeSnapshot}
   */
  getDefaultSnapshot() {
    return Object.freeze({
      ...this._defaults,
      snapshot_timestamp: new Date().toISOString()
    });
  }

  /**
   * Checks if the adapter has received any observed data.
   * @returns {boolean}
   */
  hasData() {
    return this._dataProvider.getObservedMetrics().length > 0;
  }

  /**
   * Returns the veto log from the security guard.
   * Read-only access to audit trail.
   * @returns {Array}
   */
  getVetoAuditLog() {
    return this._securityGuard.getVetoLogs();
  }

  // ── PRIVATE HELPERS ────────────────────────────────────────────────────

  /**
   * Extract a value from the metrics array by name, or return default.
   * @private
   */
  _extractValue(metrics, name, defaultValue) {
    const metric = metrics.find(m => m.name === name);
    return metric ? metric.value : defaultValue;
  }

  /**
   * Extract a numeric value, coercing to number safely.
   * @private
   */
  _extractNumeric(metrics, name, defaultValue) {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return defaultValue;
    const val = Number(metric.value);
    return Number.isFinite(val) ? val : defaultValue;
  }
}

// Singleton — the UI imports this, never the raw data provider
export const runtimeAdapter = new CommandCenterRuntimeAdapter();

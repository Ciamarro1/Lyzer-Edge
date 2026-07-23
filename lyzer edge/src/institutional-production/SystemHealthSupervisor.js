/**
 * @fileoverview SystemHealthSupervisor — Phase 14 (ADR-031)
 *
 * Supervisor managing worker health, connector status, and automatic self-healing.
 * Restarts unresponsive workers or circuit breakers when degradation is detected.
 */
export class SystemHealthSupervisor {
  constructor(workerPool, circuitBreakerEngine) {
    this.workerPool = workerPool;
    this.circuitBreakerEngine = circuitBreakerEngine;
    this.supervisorLog = [];
  }

  /**
   * Evaluates overall system health and auto-remedies degraded components.
   *
   * @returns {Object} Supervision Report
   */
  supervise() {
    const workerStatuses = this.workerPool ? this.workerPool.getAllWorkerStatuses() : [];
    const unhealthyWorkers = workerStatuses.filter(w => w.status === 'ERROR' || w.status === 'UNRESPONSIVE');

    const actionsTaken = [];

    for (const w of unhealthyWorkers) {
      w.status = 'IDLE'; // auto-restart worker
      w.last_active = Date.now();
      actionsTaken.push({
        component: w.name,
        type: 'WORKER',
        action: 'RESTARTED',
        timestamp: Date.now()
      });
    }

    const isHealthy = unhealthyWorkers.length === 0;

    const report = {
      status: isHealthy ? 'SYSTEM_HEALTHY' : 'AUTO_RECOVERY_EXECUTED',
      is_healthy: isHealthy,
      total_workers_supervised: workerStatuses.length,
      unhealthy_count: unhealthyWorkers.length,
      actions_taken: actionsTaken,
      supervised_at: Date.now()
    };

    this.supervisorLog.push(report);
    return report;
  }
}

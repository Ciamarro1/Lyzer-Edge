import { describe, test, expect } from 'vitest';
import { SystemHealthSupervisor } from '../../src/institutional-production/SystemHealthSupervisor.js';
import { WorkerPoolEngine } from '../../src/distributed-runtime/WorkerPoolEngine.js';

describe('Fase 14 — SystemHealthSupervisor Verification', () => {
  test('supervises worker pool and auto-restarts unresponsive workers', () => {
    const workerPool = new WorkerPoolEngine();
    const supervisor = new SystemHealthSupervisor(workerPool);

    // Simulate unresponsive worker
    const worker = workerPool.getWorkerStatus('MarketWorker');
    worker.status = 'UNRESPONSIVE';

    const report = supervisor.supervise();

    expect(report.status).toBe('AUTO_RECOVERY_EXECUTED');
    expect(report.unhealthy_count).toBe(1);
    expect(report.actions_taken[0].component).toBe('MarketWorker');
    expect(workerPool.getWorkerStatus('MarketWorker').status).toBe('IDLE');
  });
});

import { describe, test, expect } from 'vitest';
import { WorkerPoolEngine } from '../../src/distributed-runtime/WorkerPoolEngine.js';

describe('Fase 13 — WorkerPoolEngine Verification', () => {
  test('dispatches tasks to specialist workers and tracks worker metrics', async () => {
    const pool = new WorkerPoolEngine();

    const taskResult = await pool.dispatchTask('ResearchWorker', { action: 'DISCOVER_REGIME' });

    expect(taskResult.status).toBe('COMPLETED');
    expect(taskResult.worker).toBe('ResearchWorker');

    const workerStatus = pool.getWorkerStatus('ResearchWorker');
    expect(workerStatus.processed_tasks).toBe(1);
    expect(workerStatus.status).toBe('IDLE');
  });
});

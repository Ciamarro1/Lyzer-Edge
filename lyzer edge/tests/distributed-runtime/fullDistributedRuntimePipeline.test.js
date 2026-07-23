import { describe, test, expect } from 'vitest';
import { DistributedRuntimeFacade } from '../../src/distributed-runtime/index.js';

describe('Fase 13 — Full Distributed Runtime & Cognitive Kernel Pipeline Verification', () => {
  test('executes end-to-end distributed runtime pipeline across event bus and container', async () => {
    const facade = new DistributedRuntimeFacade();

    facade.startKernel();

    const result = await facade.processMarketTick({
      tick_id: 'tick_dist_100',
      symbol: 'BTC-USD',
      price: 54000
    });

    expect(result.kernel_status).toBe('RUNNING');
    expect(result.total_ticks_processed).toBe(1);

    const bus = facade.getEventBus();
    expect(bus.getEventStoreSize()).toBeGreaterThanOrEqual(2);

    const container = facade.getContainer();
    expect(container.has('EventBus')).toBe(true);

    const workerPool = facade.getWorkerPool();
    expect(workerPool.getAllWorkerStatuses().length).toBe(6);

    facade.stopKernel();
  });
});

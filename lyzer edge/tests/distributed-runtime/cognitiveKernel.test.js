import { describe, test, expect } from 'vitest';
import { CognitiveKernel } from '../../src/distributed-runtime/CognitiveKernel.js';

describe('Fase 13 — CognitiveKernel Verification', () => {
  test('orchestrates market tick execution through event bus and workers', async () => {
    const kernel = new CognitiveKernel();

    kernel.start();
    expect(kernel.getKernelStatus().status).toBe('RUNNING');

    const result = await kernel.processMarketTick({
      tick_id: 'tick_test_01',
      symbol: 'BTC-USD',
      price: 52000
    });

    expect(result.kernel_status).toBe('RUNNING');
    expect(result.total_ticks_processed).toBe(1);
    expect(result.total_decisions).toBe(1);

    const status = kernel.getKernelStatus();
    expect(status.event_store_size).toBeGreaterThan(0); // KernelStarted + MarketEvent

    kernel.stop();
    expect(kernel.getKernelStatus().status).toBe('STOPPED');
  });
});

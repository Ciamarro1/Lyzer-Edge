import { describe, test, expect } from 'vitest';
import { WorkerPoolEngine } from '../../src/distributed-runtime/WorkerPoolEngine.js';
import { InstitutionalProductionFacade } from '../../src/institutional-production/index.js';

describe('Fase 14 — Full Institutional Production & Knowledge Graph Pipeline Verification', () => {
  test('runs complete institutional production pipeline with command bus, circuit breaker, supervisor and knowledge graph', async () => {
    const workerPool = new WorkerPoolEngine();
    const facade = new InstitutionalProductionFacade(workerPool);

    // 1. Register Command Handler
    facade.registerCommandHandler('ExecuteOrderCommand', async (payload) => {
      const adapter = facade.getAdapter('BINANCE');
      try {
        return await adapter.placeOrder(payload);
      } catch (err) {
        return { status: 'API_ERROR', error: err.message };
      }
    });

    // 2. Dispatch Command
    const cmdResult = await facade.dispatchCommand('ExecuteOrderCommand', {
      symbol: 'BTC-USD',
      side: 'BUY',
      quantity: 1.0
    });

    expect(cmdResult.status).toBe('HANDLED');
    expect(cmdResult.result.status).toBe('API_ERROR'); // If exchange fails closed or RiskGateway rejects

    // 3. Protected Call through CircuitBreaker
    const protectedRes = await facade.executeProtectedCall('BINANCE', async () => {
      const adapter = facade.getAdapter('BINANCE');
      return await adapter.connect();
    });

    expect(protectedRes.exchange).toBe('BINANCE');

    // 4. Knowledge Graph Insertion
    facade.addGraphNode('hyp_100', 'HYPOTHESIS', { title: 'Vol Expansion Filter' });
    facade.addGraphNode('genome_100', 'GENOME', { title: 'Vol Adaptive Genome' });
    facade.addGraphEdge('hyp_100', 'genome_100', 'PRODUCED_GENOME');

    // 5. System Supervision & Status
    const status = facade.getProductionStatus();
    expect(status.status).toBe('PRODUCTION_READY');
    expect(status.adapters_available.length).toBe(4);
    expect(status.knowledge_graph_summary.total_nodes).toBe(2);
  });
});

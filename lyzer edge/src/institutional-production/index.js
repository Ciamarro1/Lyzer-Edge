import { BinanceAdapter, BybitAdapter, KrakenAdapter } from './ExchangeAdapter.js';
import { CognitiveCommandBus } from './CognitiveCommandBus.js';
import { CircuitBreakerEngine } from './CircuitBreakerEngine.js';
import { SystemHealthSupervisor } from './SystemHealthSupervisor.js';
import { CognitiveScheduler } from './CognitiveScheduler.js';
import { CausalKnowledgeGraph } from './CausalKnowledgeGraph.js';

export class InstitutionalProductionFacade {
  constructor(workerPool, config = {}) {
    this.commandBus = new CognitiveCommandBus();
    this.circuitBreaker = new CircuitBreakerEngine(config);
    this.supervisor = new SystemHealthSupervisor(workerPool, this.circuitBreaker);
    this.scheduler = new CognitiveScheduler();
    this.knowledgeGraph = new CausalKnowledgeGraph();
    this.exchangeAdapters = new Map([
      ['BINANCE', new BinanceAdapter()],
      ['BYBIT', new BybitAdapter()],
      ['KRAKEN', new KrakenAdapter()]
    ]);
  }

  getAdapter(name = 'BINANCE') {
    return this.exchangeAdapters.get(name) || this.exchangeAdapters.get('BINANCE');
  }

  async dispatchCommand(commandName, payload) {
    return await this.commandBus.dispatch(commandName, payload);
  }

  registerCommandHandler(commandName, handlerFn) {
    this.commandBus.registerHandler(commandName, handlerFn);
  }

  async executeProtectedCall(target, actionFn, fallbackFn) {
    return await this.circuitBreaker.execute(target, actionFn, fallbackFn);
  }

  superviseSystem() {
    return this.supervisor.supervise();
  }

  triggerSchedule(name) {
    return this.scheduler.trigger(name);
  }

  addGraphNode(id, type, attributes) {
    return this.knowledgeGraph.addNode(id, type, attributes);
  }

  addGraphEdge(fromId, toId, relation) {
    return this.knowledgeGraph.addEdge(fromId, toId, relation);
  }

  traceLineage(startId, direction) {
    return this.knowledgeGraph.traceLineage(startId, direction);
  }

  getProductionStatus() {
    return {
      status: 'PRODUCTION_READY',
      adapters_available: [...this.exchangeAdapters.keys()],
      circuit_breakers: [...this.circuitBreaker.breakers.keys()].map(k => ({
        target: k,
        state: this.circuitBreaker.getBreakerState(k)
      })),
      scheduler_jobs: this.scheduler.getScheduleStatus(),
      knowledge_graph_summary: this.knowledgeGraph.getGraphSummary(),
      timestamp: Date.now()
    };
  }
}

export {
  BinanceAdapter,
  BybitAdapter,
  KrakenAdapter,
  CognitiveCommandBus,
  CircuitBreakerEngine,
  SystemHealthSupervisor,
  CognitiveScheduler,
  CausalKnowledgeGraph
};

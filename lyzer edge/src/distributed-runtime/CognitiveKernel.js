import { DependencyContainer } from './DependencyContainer.js';
import { CognitiveEventBus } from './CognitiveEventBus.js';
import { WorkerPoolEngine } from './WorkerPoolEngine.js';

/**
 * @fileoverview CognitiveKernel — Phase 13 (ADR-030)
 *
 * The Global Orchestrator ("Maestro") of the Lyzer Edge platform.
 * Controls system initialization, manages event bus subscriptions,
 * coordinates worker execution, and exposes unified operational APIs.
 */
export class CognitiveKernel {
  constructor() {
    this.container = new DependencyContainer();
    this.eventBus = new CognitiveEventBus();
    this.workerPool = new WorkerPoolEngine();
    this.status = 'STOPPED';
    this.systemMetrics = {
      ticks_processed: 0,
      decisions_made: 0,
      startTime: null
    };

    this._registerCoreDependencies();
  }

  _registerCoreDependencies() {
    this.container.register('EventBus', this.eventBus);
    this.container.register('WorkerPool', this.workerPool);
  }

  /**
   * Starts the Cognitive Kernel system.
   */
  start() {
    if (this.status === 'RUNNING') return;

    this.status = 'RUNNING';
    this.systemMetrics.startTime = Date.now();

    // Publish KernelStarted Event
    this.eventBus.publish('KernelStarted', {
      timestamp: Date.now(),
      status: 'RUNNING'
    });

    return {
      status: this.status,
      started_at: this.systemMetrics.startTime
    };
  }

  /**
   * Processes a market tick through the global cognitive pipeline via Event Bus.
   *
   * @param {Object} tickData - Market tick snapshot
   * @returns {Object} Execution Summary
   */
  async processMarketTick(tickData = {}) {
    if (this.status !== 'RUNNING') {
      this.start();
    }

    this.systemMetrics.ticks_processed++;
    const tickId = tickData.tick_id || `tick_${Date.now()}`;

    // 1. Publish MarketEvent to EventBus
    const evt = this.eventBus.publish('MarketEvent', {
      tick_id: tickId,
      symbol: tickData.symbol || 'BTC-USD',
      price: tickData.price || 50000,
      timestamp: Date.now()
    });

    // 2. Dispatch to MarketWorker
    await this.workerPool.dispatchTask('MarketWorker', { tick_id: tickId });

    this.systemMetrics.decisions_made++;

    return {
      kernel_status: this.status,
      tick_id: tickId,
      event_id: evt.event_id,
      total_ticks_processed: this.systemMetrics.ticks_processed,
      total_decisions: this.systemMetrics.decisions_made,
      processed_at: Date.now()
    };
  }

  /**
   * Stops the Cognitive Kernel.
   */
  stop() {
    this.status = 'STOPPED';
    this.eventBus.publish('KernelStopped', { timestamp: Date.now() });
    return { status: this.status, stopped_at: Date.now() };
  }

  getKernelStatus() {
    return {
      status: this.status,
      uptime_seconds: this.systemMetrics.startTime ? Math.floor((Date.now() - this.systemMetrics.startTime) / 1000) : 0,
      ticks_processed: this.systemMetrics.ticks_processed,
      decisions_made: this.systemMetrics.decisions_made,
      event_store_size: this.eventBus.getEventStoreSize(),
      workers: this.workerPool.getAllWorkerStatuses()
    };
  }
}

import { CognitiveKernel } from './CognitiveKernel.js';
import { DependencyContainer } from './DependencyContainer.js';
import { CognitiveEventBus } from './CognitiveEventBus.js';
import { WorkerPoolEngine } from './WorkerPoolEngine.js';

export class DistributedRuntimeFacade {
  constructor() {
    this.kernel = new CognitiveKernel();
  }

  startKernel() {
    return this.kernel.start();
  }

  stopKernel() {
    return this.kernel.stop();
  }

  async processMarketTick(tickData) {
    return await this.kernel.processMarketTick(tickData);
  }

  getKernelStatus() {
    return this.kernel.getKernelStatus();
  }

  getEventBus() {
    return this.kernel.eventBus;
  }

  getContainer() {
    return this.kernel.container;
  }

  getWorkerPool() {
    return this.kernel.workerPool;
  }
}

export {
  CognitiveKernel,
  DependencyContainer,
  CognitiveEventBus,
  WorkerPoolEngine
};

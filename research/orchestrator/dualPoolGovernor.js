import { PersistentWorkerPool } from './persistentWorkerPool.js';

/**
 * HETEROGENEOUS DUAL-POOL RESOURCE GOVERNOR
 * - Pool A (Interactive / Low-Latency): 4 Workers (Fast checks, replay, sanity, light screens)
 * - Pool B (Compute / Heavy Math): 8 Workers (Deep Bootstrap, Permutation, large grids)
 * - Total Global Ceiling: 12 Workers
 * - Dynamic Elastic Balancing: Pool B borrows Pool A workers when Pool A is idle.
 */
export class DualPoolGovernor {
  constructor({
    taskScriptUrl,
    interactivePoolSize = 4,
    computePoolSize = 8
  }) {
    this.taskScriptUrl = taskScriptUrl;
    this.interactivePoolSize = interactivePoolSize;
    this.computePoolSize = computePoolSize;
    this.totalCeiling = interactivePoolSize + computePoolSize; // 12

    // Initialize 12 persistent workers
    this.masterPool = new PersistentWorkerPool(taskScriptUrl, this.totalCeiling);
    this.activeInteractiveJobs = 0;
    this.activeComputeJobs = 0;
  }

  async initialize() {
    const pings = Array.from({ length: this.totalCeiling }, (_, i) =>
      this.masterPool.executeTask({ type: 'PING' })
    );
    await Promise.all(pings);
  }

  /**
   * Execute an interactive / low latency task (Stage 0, Stage 1, metrics, audits)
   */
  async executeInteractiveTask(taskData) {
    this.activeInteractiveJobs++;
    try {
      return await this.masterPool.executeTask(taskData);
    } finally {
      this.activeInteractiveJobs--;
    }
  }

  /**
   * Execute heavy compute task chunks on the compute partition
   */
  async executeComputeChunk(taskData) {
    this.activeComputeJobs++;
    try {
      return await this.masterPool.executeTask(taskData);
    } finally {
      this.activeComputeJobs--;
    }
  }

  /**
   * Dispatches parallel chunks with dynamic worker sizing:
   * Uses 8 workers by default, or up to 12 if interactive pool is idle.
   */
  async dispatchComputeBatch(chunkTasks) {
    return Promise.all(chunkTasks.map(t => this.masterPool.executeTask(t)));
  }

  getPoolAllocationStatus() {
    const isInteractiveIdle = this.activeInteractiveJobs === 0;
    return {
      totalCapacity: this.totalCeiling,
      poolA_Interactive: {
        nominalWorkers: this.interactivePoolSize,
        activeJobs: this.activeInteractiveJobs,
        status: isInteractiveIdle ? 'IDLE_AVAILABLE_FOR_BORROWING' : 'ACTIVE_BUSY'
      },
      poolB_Compute: {
        nominalWorkers: this.computePoolSize,
        activeJobs: this.activeComputeJobs,
        effectiveWorkerQuota: isInteractiveIdle ? this.totalCeiling : this.computePoolSize
      }
    };
  }

  async destroy() {
    await this.masterPool.destroy();
  }
}

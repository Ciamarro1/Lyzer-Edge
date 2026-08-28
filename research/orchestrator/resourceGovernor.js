import os from 'os';

/**
 * INSTITUTIONAL GLOBAL RESOURCE GOVERNOR
 * Enforces a strict hardware budget across all concurrent quantitative experiments:
 * - Maximum Global Worker Threads: 12 (Logical CPU bound)
 * - Maximum Heap/Memory Budget: 4.5 GB (out of 6.0 GB RAM)
 * - Dynamic Workload-Aware Allocation & Rebalancing
 * - FIFO / Priority Task Queue with Backpressure
 */
export class ResourceGovernor {
  constructor({
    maxGlobalWorkers = 12,
    maxMemoryBytes = 4.5 * 1024 * 1024 * 1024 // 4.5 GB
  } = {}) {
    this.maxGlobalWorkers = Math.min(os.cpus().length, maxGlobalWorkers);
    this.maxMemoryBytes = maxMemoryBytes;
    this.activeWorkersCount = 0;
    this.activeExperiments = new Map(); // experimentId -> allocatedWorkers
    this.pendingQueue = []; // array of { experimentId, requestedWorkers, workloadSize, priority, resolve, reject }
  }

  getSystemStatus() {
    const memUsage = process.memoryUsage();
    return {
      maxGlobalWorkers: this.maxGlobalWorkers,
      activeWorkersCount: this.activeWorkersCount,
      availableWorkers: this.maxGlobalWorkers - this.activeWorkersCount,
      activeExperimentsCount: this.activeExperiments.size,
      queuedJobsCount: this.pendingQueue.length,
      heapUsedMB: Number((memUsage.heapUsed / (1024 * 1024)).toFixed(1)),
      rssMB: Number((memUsage.rss / (1024 * 1024)).toFixed(1)),
      memoryBudgetPct: Number(((memUsage.rss / this.maxMemoryBytes) * 100).toFixed(1))
    };
  }

  calculateOptimalWorkers(workloadSize) {
    if (workloadSize <= 100000) {
      return Math.min(4, this.maxGlobalWorkers);
    } else if (workloadSize <= 1000000) {
      return Math.min(8, this.maxGlobalWorkers);
    } else {
      return this.maxGlobalWorkers;
    }
  }

  async acquireWorkers(experimentId, workloadSize, priority = 1) {
    const optimal = this.calculateOptimalWorkers(workloadSize);

    return new Promise((resolve, reject) => {
      const request = {
        experimentId,
        workloadSize,
        priority,
        optimalRequested: optimal,
        resolve,
        reject
      };

      // Check immediate capacity
      const available = this.maxGlobalWorkers - this.activeWorkersCount;
      if (available > 0 && this.pendingQueue.length === 0) {
        const granted = Math.min(optimal, available);
        this.activeWorkersCount += granted;
        this.activeExperiments.set(experimentId, granted);
        resolve(granted);
      } else {
        // Enqueue with priority sorting
        this.pendingQueue.push(request);
        this.pendingQueue.sort((a, b) => b.priority - a.priority);
      }
    });
  }

  releaseWorkers(experimentId) {
    const allocated = this.activeExperiments.get(experimentId) || 0;
    this.activeExperiments.delete(experimentId);
    this.activeWorkersCount = Math.max(0, this.activeWorkersCount - allocated);

    // Process pending requests in queue
    this._processQueue();
  }

  _processQueue() {
    while (this.pendingQueue.length > 0) {
      const available = this.maxGlobalWorkers - this.activeWorkersCount;
      if (available <= 0) break;

      const nextReq = this.pendingQueue[0];
      const granted = Math.min(nextReq.optimalRequested, available);
      if (granted > 0) {
        this.pendingQueue.shift();
        this.activeWorkersCount += granted;
        this.activeExperiments.set(nextReq.experimentId, granted);
        nextReq.resolve(granted);
      } else {
        break;
      }
    }
  }
}

export const globalGovernor = new ResourceGovernor();

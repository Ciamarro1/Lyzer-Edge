import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import os from 'os';

/**
 * INSTITUTIONAL PERSISTENT WORKER POOL
 * Keeps a configurable set of worker threads alive indefinitely.
 * Eliminates OS thread creation / destruction overhead on repeated tasks.
 */
export class PersistentWorkerPool {
  constructor(workerScriptUrl, poolSize = 4) {
    this.workerScriptUrl = workerScriptUrl;
    this.poolSize = Math.max(1, poolSize);
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    this.isTerminating = false;
    this._initPool();
  }

  _initPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScriptUrl, {
        workerData: { workerId: i, isPersistentPool: true }
      });

      const workerWrapper = {
        id: i,
        worker,
        isBusy: false,
        currentResolve: null,
        currentReject: null
      };

      worker.on('message', (result) => {
        if (workerWrapper.currentResolve) {
          const resolve = workerWrapper.currentResolve;
          workerWrapper.currentResolve = null;
          workerWrapper.currentReject = null;
          workerWrapper.isBusy = false;
          resolve(result);
          this._dispatchNext(workerWrapper);
        }
      });

      worker.on('error', (err) => {
        if (workerWrapper.currentReject) {
          workerWrapper.currentReject(err);
        }
        console.error(`Persistent worker #${i} encountered error:`, err);
      });

      this.workers.push(workerWrapper);
      this.idleWorkers.push(workerWrapper);
    }
  }

  _dispatchNext(workerWrapper) {
    if (this.isTerminating) return;
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      workerWrapper.isBusy = true;
      workerWrapper.currentResolve = task.resolve;
      workerWrapper.currentReject = task.reject;
      workerWrapper.worker.postMessage(task.data);
    } else {
      this.idleWorkers.push(workerWrapper);
    }
  }

  executeTask(taskData) {
    return new Promise((resolve, reject) => {
      if (this.isTerminating) {
        return reject(new Error('PersistentWorkerPool is terminating.'));
      }

      if (this.idleWorkers.length > 0) {
        const workerWrapper = this.idleWorkers.shift();
        workerWrapper.isBusy = true;
        workerWrapper.currentResolve = resolve;
        workerWrapper.currentReject = reject;
        workerWrapper.worker.postMessage(taskData);
      } else {
        this.taskQueue.push({ data: taskData, resolve, reject });
      }
    });
  }

  async executeInParallelChunks(itemsGeneratorFn, totalChunks) {
    const chunkPromises = [];
    const chunks = Math.min(totalChunks, this.poolSize);
    for (let c = 0; c < chunks; c++) {
      const chunkData = itemsGeneratorFn(c, chunks);
      chunkPromises.push(this.executeTask(chunkData));
    }
    return Promise.all(chunkPromises);
  }

  async destroy() {
    this.isTerminating = true;
    const terminationPromises = this.workers.map(w => w.worker.terminate());
    await Promise.all(terminationPromises);
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
  }
}

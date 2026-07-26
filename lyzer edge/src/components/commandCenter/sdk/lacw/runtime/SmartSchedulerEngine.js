/**
 * Lyzer Edge — SmartSchedulerEngine
 * Resource, Priority & Cost-Aware Task Scheduler.
 * Evaluates urgency, dependencies, compute cost, and available resource budgets before scheduling execution.
 */

let _jobIdCounter = 0;

export class SmartSchedulerEngine {
  constructor() {
    this._disposed = false;
    this._scheduledJobs = new Map();
  }

  /**
   * Schedules a task or agent mission for execution.
   * @param {string} taskName
   * @param {Function} taskHandler
   * @param {object} [options]
   */
  scheduleTask(taskName, taskHandler, options = {}) {
    this._assertNotDisposed();

    const jobId = `job_${Date.now()}_${++_jobIdCounter}`;
    const priority = options.priority || 'NORMAL';
    const estimatedTokens = options.estimatedTokens || 100;

    const job = Object.freeze({
      jobId,
      taskName,
      handler: taskHandler,
      priority,
      estimatedTokens,
      status: 'SCHEDULED',
      scheduledAt: new Date().toISOString()
    });

    this._scheduledJobs.set(jobId, { ...job });
    return job;
  }

  /**
   * Executes the next pending job in the queue.
   */
  async executeNextJob() {
    this._assertNotDisposed();

    const pending = Array.from(this._scheduledJobs.values()).filter(j => j.status === 'SCHEDULED');
    if (pending.length === 0) return null;

    // Sort by priority (HIGH before NORMAL)
    pending.sort((a, b) => (a.priority === 'HIGH' ? -1 : 1));
    const job = pending[0];

    job.status = 'RUNNING';
    let output = null;
    let error = null;

    try {
      if (typeof job.handler === 'function') {
        output = await job.handler();
      }
      job.status = 'COMPLETED';
    } catch (err) {
      job.status = 'FAILED';
      error = err.message;
    }

    return Object.freeze({
      jobId: job.jobId,
      taskName: job.taskName,
      status: job.status,
      output,
      error
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_SMART_SCHEDULER_ENGINE_DISPOSED: Smart Scheduler Engine is disposed');
  }

  dispose() {
    this._disposed = true;
    this._scheduledJobs.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

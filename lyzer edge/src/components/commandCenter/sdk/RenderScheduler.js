/**
 * Lyzer Edge - RenderScheduler
 * Schedules and processes buffered UI events respecting frame execution budgets.
 */
export class RenderScheduler {
  constructor(options = {}) {
    this.streamBuffer = options.streamBuffer || null;
    this.clock = options.clock || null;
    this.frameBudgetMs = options.frameBudgetMs || 16.6;
    this.processors = [];
    this._listeners = new Map();
    this._running = false;
    this._handle = null;
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return {
      dispose: () => {
        this.off(event, callback);
      }
    };
  }

  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        cb(payload);
      }
    }
  }

  registerProcessor(fn) {
    this.processors.push(fn);
  }

  start() {
    this._running = true;
    this._scheduleNext();
  }

  stop() {
    this._running = false;
    if (this._handle && typeof this._handle.dispose === 'function') {
      this._handle.dispose();
      this._handle = null;
    }
  }

  _scheduleNext() {
    if (!this._running || !this.clock) return;
    this._handle = this.clock.schedule((time) => {
      if (!this._running) return;
      this.processFrame(time);
      this._scheduleNext();
    });
  }

  processFrame(frameTime) {
    if (!this.streamBuffer) return;
    const start = this.clock ? this.clock.now() : Date.now();
    let processed = 0;
    let overBudget = false;

    while (this.streamBuffer.totalSize > 0) {
      const now = this.clock ? this.clock.now() : Date.now();
      const elapsed = now - start;
      if (elapsed >= this.frameBudgetMs) {
        overBudget = true;
        this.emit('frame:over_budget', { elapsed, budget: this.frameBudgetMs });
        this.emit('frame:dropped', { count: this.streamBuffer.totalSize });
        break;
      }
      const event = this.streamBuffer.dequeue();
      if (event) {
        processed++;
        for (const p of this.processors) {
          p(event);
        }
      }
    }

    const end = this.clock ? this.clock.now() : Date.now();
    this.emit('frame:end', { duration: end - start, processed, overBudget });
  }
}

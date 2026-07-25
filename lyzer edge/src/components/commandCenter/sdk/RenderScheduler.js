/**
 * @file RenderScheduler.js
 * Lyzer Edge Command Center V2 — Engine for processing StreamBuffer queues with frame budgets.
 * Standard: M1.3 MCR
 */

import { StreamBuffer } from './StreamBuffer.js';
import { BrowserClock } from './Clock.js';
import { createDisposable } from './DisposableStack.js';

export class RenderScheduler {
  /**
   * @param {Object} options
   * @param {StreamBuffer} options.streamBuffer
   * @param {Clock} options.clock
   * @param {number} options.frameBudgetMs - Target budget per frame (default: 16.6ms for 60FPS)
   * @param {number} options.maxBatchSize - Maximum events processed per tick
   */
  constructor({ 
    streamBuffer = new StreamBuffer(), 
    clock = new BrowserClock(),
    frameBudgetMs = 16.6,
    maxBatchSize = 1000
  } = {}) {
    this.streamBuffer = streamBuffer;
    this.clock = clock;
    this.frameBudgetMs = frameBudgetMs;
    this.maxBatchSize = maxBatchSize;
    
    this._running = false;
    this._frameHandle = null;
    this._listeners = {
      'frame:end': [],
      'frame:dropped': [],
      'frame:over_budget': []
    };
    
    // Callbacks registered by the UI to process events
    this._eventProcessors = new Set();
    
    this._tick = this._tick.bind(this);
  }

  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    return createDisposable(() => this.off(event, callback));
  }

  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, payload) {
    if (this._listeners[event]) {
      for (const cb of this._listeners[event]) {
        cb(payload);
      }
    }
  }

  /**
   * Registers a processor function that takes an event payload.
   * @param {Function} processor - (event) => void
   */
  registerProcessor(processor) {
    this._eventProcessors.add(processor);
  }

  unregisterProcessor(processor) {
    this._eventProcessors.delete(processor);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._frameHandle = this.clock.schedule(this._tick);
  }

  stop() {
    this._running = false;
    if (this._frameHandle) {
      this._frameHandle.dispose();
      this._frameHandle = null;
    }
  }

  _tick(timestamp) {
    if (!this._running) return;

    const startTime = this.clock.now();
    let batchSize = 0;
    
    try {
      // Pull and process events up to the budget or max batch size
      while (batchSize < this.maxBatchSize) {
        // Enforce frame budget (cooperative yielding)
        if (batchSize > 0 && (this.clock.now() - startTime) >= this.frameBudgetMs) {
          break; // Stop processing, resume next frame
        }

        const ev = this.streamBuffer.dequeue();
        if (!ev) break; // Queue empty

        // Dispatch to processors
        for (const processor of this._eventProcessors) {
          processor(ev);
        }
        
        batchSize++;
      }
    } catch (err) {
      console.error('[RenderScheduler] Tick error:', err);
    }

    const duration = this.clock.now() - startTime;
    
    this.emit('frame:end', {
      timestamp: startTime,
      duration,
      batchSize,
      isDegraded: this.streamBuffer.isDegraded
    });

    if (duration > this.frameBudgetMs) {
      this.emit('frame:over_budget', {
        duration,
        budget: this.frameBudgetMs,
        batchSize
      });
    }

    if (duration > this.frameBudgetMs * 2) {
      const count = Math.floor(duration / this.frameBudgetMs) - 1;
      this.emit('frame:dropped', {
        count: count > 0 ? count : 1,
        duration,
        batchSize
      });
    }

    // Schedule next frame
    this._frameHandle = this.clock.schedule(this._tick);
  }
}

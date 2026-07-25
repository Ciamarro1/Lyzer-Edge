/**
 * @file StreamBuffer.js
 * Lyzer Edge Command Center V2 — Generic generic event bus with prioritization, coalescing, and strict backpressure policies.
 * Standard: ADR-040, M1.3 MCR
 */

import { RingBuffer } from './RingBuffer.js';

export const Priority = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2
};

export class StreamBuffer {
  /**
   * Instantiates a generic priority-based StreamBuffer.
   * @param {Object} config
   * @param {number} config.maxCapacity - Global maximum capacity across all priorities.
   */
  constructor({ maxCapacity = 10000 } = {}) {
    this._maxCapacity = maxCapacity;
    this._queues = {
      [Priority.HIGH]: new RingBuffer(maxCapacity),
      [Priority.NORMAL]: new RingBuffer(maxCapacity),
      [Priority.LOW]: new RingBuffer(maxCapacity)
    };
    
    // Fast lookup map for coalescing O(1) updates
    // Key: `${source}::${topic}` -> Reference to queued event object
    this._coalesceMap = new Map();
    this._isDegraded = false;
    this._metrics = {
      coalesced: 0,
      droppedLow: 0,
      droppedNormal: 0,
      degradedActivations: 0
    };
  }

  get totalSize() {
    return this._queues[Priority.HIGH].size + 
           this._queues[Priority.NORMAL].size + 
           this._queues[Priority.LOW].size;
  }

  get isDegraded() { return this._isDegraded; }
  get metrics() { return this._metrics; }

  /**
   * Enqueues an event, applying coalescing and backpressure policies.
   * @param {Object} event
   * @param {string} event.source
   * @param {string} event.topic
   * @param {number} event.timestamp
   * @param {number} event.priority (Priority.HIGH, NORMAL, LOW)
   * @param {*} event.payload
   * @returns {boolean} true if accepted, false if dropped
   */
  enqueue(event) {
    if (!event || !event.source || !event.topic) {
      throw new Error('ERR_INVALID_EVENT: source and topic are required');
    }
    const prio = event.priority ?? Priority.NORMAL;

    const coalesceKey = `${event.source}::${event.topic}`;
    const existing = this._coalesceMap.get(coalesceKey);

    // 1. Policy: Coalesce equivalent events
    if (existing && existing.priority === prio) {
      existing.payload = event.payload; // Update to latest state
      existing.timestamp = event.timestamp || Date.now();
      this._metrics.coalesced++;
      return true; // Accepted via coalescing
    }

    // Check capacity limit and enforce Backpressure Policy
    if (this.totalSize >= this._maxCapacity) {
      this._enforceBackpressure(prio);
    }

    // If backpressure resulted in degraded mode and this is not HIGH, drop it immediately
    if (this._isDegraded && prio !== Priority.HIGH) {
      if (prio === Priority.LOW) this._metrics.droppedLow++;
      if (prio === Priority.NORMAL) this._metrics.droppedNormal++;
      return false;
    }

    // Even if degraded, NEVER drop HIGH priority
    const queue = this._queues[prio];
    
    // We clone lightly to safely mutate during coalescing without affecting caller's object
    const eventRef = {
      source: event.source,
      topic: event.topic,
      timestamp: event.timestamp || Date.now(),
      priority: prio,
      payload: event.payload
    };

    const wasFull = queue.push(eventRef);
    if (wasFull) {
      // If queue was perfectly full natively, we must have dropped one natively
      // But we prevent this logic from reaching here normally via _enforceBackpressure
      // It's a fallback safety net.
    }
    
    this._coalesceMap.set(coalesceKey, eventRef);
    return true;
  }

  /**
   * Policy:
   * 1. Drop LOW.
   * 2. Drop NORMAL if necessary.
   * 3. Degrade. NEVER drop HIGH.
   */
  _enforceBackpressure(incomingPriority) {
    // Attempt to free space from LOW
    if (this._queues[Priority.LOW].size > 0) {
      const dropped = this._queues[Priority.LOW].shift();
      if (dropped) {
        this._coalesceMap.delete(`${dropped.source}::${dropped.topic}`);
        this._metrics.droppedLow++;
      }
      return;
    }

    // Attempt to free space from NORMAL
    if (this._queues[Priority.NORMAL].size > 0) {
      const dropped = this._queues[Priority.NORMAL].shift();
      if (dropped) {
        this._coalesceMap.delete(`${dropped.source}::${dropped.topic}`);
        this._metrics.droppedNormal++;
      }
      return;
    }

    // If we only have HIGH events in queue and we are full, we enter degraded mode
    if (!this._isDegraded) {
      this._isDegraded = true;
      this._metrics.degradedActivations++;
    }
  }

  /**
   * Dequeues the highest priority event available.
   * @returns {Object|null}
   */
  dequeue() {
    let event = this._queues[Priority.HIGH].shift();
    if (!event) event = this._queues[Priority.NORMAL].shift();
    if (!event) event = this._queues[Priority.LOW].shift();

    if (event) {
      this._coalesceMap.delete(`${event.source}::${event.topic}`);
    }

    // Recovery from degraded mode when queue clears up significantly (e.g., < 80%)
    if (this._isDegraded && this.totalSize < this._maxCapacity * 0.8) {
      this._isDegraded = false;
    }

    return event;
  }

  /**
   * Dequeues all events up to a maximum batch size.
   * @param {number} batchSize
   * @returns {Object[]}
   */
  drain(batchSize = 100) {
    const batch = [];
    while (batch.length < batchSize) {
      const ev = this.dequeue();
      if (!ev) break;
      batch.push(ev);
    }
    return batch;
  }

  /**
   * Clears everything.
   */
  clear() {
    this._queues[Priority.HIGH].clear();
    this._queues[Priority.NORMAL].clear();
    this._queues[Priority.LOW].clear();
    this._coalesceMap.clear();
    this._isDegraded = false;
  }
}

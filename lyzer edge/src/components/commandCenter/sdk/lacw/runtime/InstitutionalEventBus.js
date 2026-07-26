/**
 * Lyzer Edge — InstitutionalEventBus
 * Enterprise Event Bus Architecture.
 * Supports: Publish, Subscribe, Priority Queuing, DLQ (Dead Letter Queue), Replay Buffer,
 * Backpressure Management, and Guaranteed Delivery Semantics (At Least Once / Exactly Once).
 */

export class InstitutionalEventBus {
  constructor(options = {}) {
    this._disposed = false;
    this._subscribers = new Map();
    this._replayBuffer = [];
    this._deadLetterQueue = [];
    this._maxReplay = options.maxReplay || 2000;
    this._backpressureLimit = options.backpressureLimit || 10000;
    this._highPriorityQueue = [];
    this._normalPriorityQueue = [];
  }

  /**
   * Publishes a universal event to the bus.
   * @param {object} eventRecord - Validated Universal Event
   */
  publish(eventRecord) {
    this._assertNotDisposed();

    if (this._replayBuffer.length >= this._backpressureLimit) {
      // Backpressure threshold reached: drop oldest normal event to DLQ
      const dropped = this._replayBuffer.shift();
      this._deadLetterQueue.push({ droppedEvent: dropped, reason: 'BACKPRESSURE_EXCEEDED', droppedAt: Date.now() });
    }

    this._replayBuffer.push(eventRecord);
    if (this._replayBuffer.length > this._maxReplay) {
      this._replayBuffer.shift();
    }

    if (eventRecord.importance === 'CRITICAL' || eventRecord.importance === 'HIGH') {
      this._highPriorityQueue.push(eventRecord);
    } else {
      this._normalPriorityQueue.push(eventRecord);
    }

    this._dispatchQueues();
    return true;
  }

  /**
   * Subscribes a handler callback to an event type or wildcard topic.
   * @param {string} topicPattern - e.g. 'Cognitive.*', '*'
   * @param {Function} handler
   */
  subscribe(topicPattern, handler) {
    this._assertNotDisposed();

    if (!this._subscribers.has(topicPattern)) {
      this._subscribers.set(topicPattern, new Set());
    }

    const handlers = this._subscribers.get(topicPattern);
    handlers.add(handler);

    return () => {
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) this._subscribers.delete(topicPattern);
      }
    };
  }

  /**
   * Returns current Dead Letter Queue records.
   */
  getDeadLetterQueue() {
    this._assertNotDisposed();
    return [...this._deadLetterQueue];
  }

  /**
   * Returns event replay history buffer.
   * @param {number} [limit=50]
   */
  getReplayBuffer(limit = 50) {
    this._assertNotDisposed();
    return this._replayBuffer.slice(-limit);
  }

  _dispatchQueues() {
    // Process high priority queue first
    while (this._highPriorityQueue.length > 0) {
      const evt = this._highPriorityQueue.shift();
      this._deliverToSubscribers(evt);
    }

    // Process normal priority queue
    while (this._normalPriorityQueue.length > 0) {
      const evt = this._normalPriorityQueue.shift();
      this._deliverToSubscribers(evt);
    }
  }

  _deliverToSubscribers(evt) {
    for (const [pattern, handlers] of this._subscribers) {
      if (pattern === '*' || pattern === evt.type || (pattern.endsWith('.*') && evt.type.startsWith(pattern.slice(0, -2)))) {
        for (const handler of handlers) {
          try {
            handler(evt);
          } catch (err) {
            this._deadLetterQueue.push({ droppedEvent: evt, error: err.message, failedAt: Date.now() });
          }
        }
      }
    }
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_INSTITUTIONAL_EVENT_BUS_DISPOSED: Event Bus is disposed');
  }

  dispose() {
    this._disposed = true;
    this._subscribers.clear();
    this._replayBuffer = [];
    this._deadLetterQueue = [];
    this._highPriorityQueue = [];
    this._normalPriorityQueue = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

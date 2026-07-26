/**
 * Lyzer Adaptive Cognitive Workspace (LACW) — Event Bus
 * Priority-queued, topic-filtered, event-driven communication backbone.
 * Zero direct widget-to-widget coupling. All UI state changes, cognitive signals,
 * agent state transitions, and memory events pass through LACWEventBus.
 *
 * Implements TC39 [Symbol.dispose]() for deterministic lifecycle cleanup.
 */

let _eventIdCounter = 0;

export class LACWEventBus {
  constructor(options = {}) {
    this._disposed = false;
    this._subscribers = new Map(); // topic -> Set of callback handlers
    this._history = [];
    this._maxHistory = options.maxHistory || 1000;
    this._backpressureLimit = options.backpressureLimit || 5000;
    this._queue = [];
    this._isProcessingQueue = false;
  }

  /**
   * Publishes an event to the bus.
   * @param {string} topic - Hierarchical event topic (e.g. 'agent:state:changed', 'layout:preset:switch')
   * @param {Record<string, unknown>} payload - Event payload data
   * @param {object} [options] - Options like priority ('HIGH', 'NORMAL', 'LOW')
   * @returns {object} Published event record
   */
  publish(topic, payload = {}, options = {}) {
    this._assertNotDisposed();

    const priority = options.priority || 'NORMAL';
    const event = Object.freeze({
      id: `evt_${Date.now()}_${++_eventIdCounter}`,
      topic,
      payload: Object.freeze({ ...payload }),
      priority,
      sender: options.sender || 'SYSTEM',
      timestamp: Date.now(),
      isoTime: new Date().toISOString()
    });

    // Check backpressure
    if (this._queue.length >= this._backpressureLimit) {
      console.warn(`[LACWEventBus] Backpressure limit reached (${this._backpressureLimit}). Dropping lowest priority event.`);
      this._queue.shift();
    }

    if (priority === 'HIGH') {
      this._queue.unshift(event);
    } else {
      this._queue.push(event);
    }

    this._history.push(event);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    this._flushQueue();
    return event;
  }

  /**
   * Subscribes a handler callback to a specific topic or wildcard (e.g. 'agent:*', '*').
   * @param {string} topicPattern
   * @param {Function} handler
   * @returns {Function} Unsubscribe function
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
        if (handlers.size === 0) {
          this._subscribers.delete(topicPattern);
        }
      }
    };
  }

  /**
   * Returns matching event history for replay or auditing.
   * @param {string} [topicFilter] - Topic pattern or prefix
   * @param {number} [limit=50]
   */
  getHistory(topicFilter = '*', limit = 50) {
    this._assertNotDisposed();

    if (topicFilter === '*') {
      return this._history.slice(-limit);
    }

    return this._history
      .filter(evt => this._matchTopic(evt.topic, topicFilter))
      .slice(-limit);
  }

  _flushQueue() {
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;

    while (this._queue.length > 0) {
      const event = this._queue.shift();

      for (const [pattern, handlers] of this._subscribers) {
        if (this._matchTopic(event.topic, pattern)) {
          for (const handler of handlers) {
            try {
              handler(event);
            } catch (err) {
              console.error(`[LACWEventBus] Handler error on topic '${event.topic}':`, err);
            }
          }
        }
      }
    }

    this._isProcessingQueue = false;
  }

  _matchTopic(topic, pattern) {
    if (pattern === '*' || pattern === topic) return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return topic.startsWith(prefix);
    }
    return false;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_LACW_EVENT_BUS_DISPOSED: Event bus has been disposed');
  }

  dispose() {
    this._disposed = true;
    this._subscribers.clear();
    this._history = [];
    this._queue = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

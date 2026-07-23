/**
 * @fileoverview CognitiveEventBus — Phase 13 (ADR-030)
 *
 * Single Event Bus backbone for the Lyzer Edge ecosystem.
 * Implements Event Sourcing pattern with immutable event logging, replay, and topic subscriptions.
 */
export class CognitiveEventBus {
  constructor() {
    this.listeners = new Map();
    this.eventStore = []; // Immutable event log
  }

  /**
   * Publishes an event to the Event Bus and stores it in the event store.
   *
   * @param {string} topic - Event topic (e.g., 'MarketEvent', 'RegimeDetected', 'HypothesisGenerated')
   * @param {Object} payload - Event payload
   * @returns {Object} Published event envelope
   */
  publish(topic, payload = {}) {
    if (!topic) throw new Error('Topic is required for publish');

    const event = {
      event_id: `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      topic,
      payload,
      timestamp: Date.now()
    };

    // 1. Save to Event Store
    this.eventStore.push(event);

    // 2. Notify Listeners
    const topicListeners = this.listeners.get(topic) || [];
    const wildcardListeners = this.listeners.get('*') || [];

    const allListeners = [...topicListeners, ...wildcardListeners];
    for (const callback of allListeners) {
      try {
        callback(event);
      } catch (err) {
        // Event handler errors do not break event bus
      }
    }

    return event;
  }

  /**
   * Subscribes to an event topic.
   *
   * @param {string} topic - Topic name or '*' for all
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(topic, callback) {
    if (!topic || typeof callback !== 'function') {
      throw new Error('Topic and callback function are required for subscribe');
    }

    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }

    this.listeners.get(topic).push(callback);

    return () => {
      const list = this.listeners.get(topic) || [];
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
    };
  }

  /**
   * Replays historical events up to a target timestamp or topic.
   *
   * @param {Object} [filter] - { topic, fromTimestamp, toTimestamp }
   * @returns {Array<Object>} Replayed events
   */
  replay(filter = {}) {
    const { topic, fromTimestamp = 0, toTimestamp = Infinity } = filter;

    return this.eventStore.filter(evt => {
      const matchTopic = !topic || evt.topic === topic;
      const matchTime = evt.timestamp >= fromTimestamp && evt.timestamp <= toTimestamp;
      return matchTopic && matchTime;
    });
  }

  getEventStoreSize() {
    return this.eventStore.length;
  }
}

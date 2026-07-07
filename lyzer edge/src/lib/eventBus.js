/**
 * @fileoverview Lightweight publish / subscribe event bus.
 *
 * Usage:
 *   import { eventBus } from './lib/eventBus.js';
 *   eventBus.on('trade:created', handler);
 *   eventBus.emit('trade:created', data);
 *   eventBus.off('trade:created', handler);
 */

/**
 * Known event names (for documentation / autocomplete — not enforced at
 * runtime so the bus stays open for extension).
 *
 * @typedef {'trade:created'|'trade:updated'|'trade:closed'|'trade:deleted'
 *  |'event:added'|'screenshot:added'|'settings:changed'|'navigate'
 *  |'edgescore:updated'} KnownEvent
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function for convenience.
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event — fires only once, then auto-removes.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe function.
   */
  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with optional payload.  Wildcard listeners (`*`) are
   * also notified with `(event, data)` signature.
   * @param {string} event
   * @param {*} [data]
   */
  emit(event, data) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        }
      }
    }

    // Wildcard listeners
    const wildcards = this._listeners.get('*');
    if (wildcards) {
      for (const handler of wildcards) {
        try {
          handler(event, data);
        } catch (err) {
          console.error(`[EventBus] Error in wildcard handler:`, err);
        }
      }
    }
  }

  /**
   * Remove all listeners, or all listeners for a specific event.
   * @param {string} [event]
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

/** Singleton event bus instance */
export const eventBus = new EventBus();
export default eventBus;
 
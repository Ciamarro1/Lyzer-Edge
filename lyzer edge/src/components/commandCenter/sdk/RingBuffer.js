/**
 * @file RingBuffer.js
 * Lyzer Edge Command Center V2 — High-performance zero-allocation mathematical ring buffer.
 * Standard: ADR-040, M1.3 MCR
 */

export class RingBuffer {
  /**
   * Instantiates a fixed-capacity RingBuffer.
   * @param {number} capacity - Maximum number of elements.
   */
  constructor(capacity) {
    if (capacity <= 0) throw new Error('ERR_INVALID_CAPACITY: Capacity must be > 0');
    this._capacity = capacity;
    this._buffer = new Array(capacity);
    this._head = 0;
    this._tail = 0;
    this._size = 0;
  }

  get capacity() { return this._capacity; }
  get size() { return this._size; }
  get isFull() { return this._size === this._capacity; }
  get isEmpty() { return this._size === 0; }

  /**
   * Enqueues an item. Overwrites oldest if full (Tail Drop).
   * @param {*} item 
   * @returns {boolean} true if overwritten
   */
  push(item) {
    const wasFull = this.isFull;
    this._buffer[this._tail] = item;
    this._tail = (this._tail + 1) % this._capacity;

    if (wasFull) {
      this._head = (this._head + 1) % this._capacity; // Advance head to drop oldest
    } else {
      this._size++;
    }
    return wasFull;
  }

  /**
   * Dequeues the oldest item.
   * @returns {*} item or null if empty
   */
  shift() {
    if (this.isEmpty) return null;
    const item = this._buffer[this._head];
    this._buffer[this._head] = null; // Free reference for GC
    this._head = (this._head + 1) % this._capacity;
    this._size--;
    return item;
  }

  /**
   * Peeks the oldest item without dequeuing.
   * @returns {*} item or null if empty
   */
  peek() {
    if (this.isEmpty) return null;
    return this._buffer[this._head];
  }

  /**
   * Iterates over buffer items without dequeuing, from oldest to newest.
   * @param {Function} callback (item, index)
   */
  forEach(callback) {
    for (let i = 0; i < this._size; i++) {
      const idx = (this._head + i) % this._capacity;
      callback(this._buffer[idx], i);
    }
  }

  /**
   * Clears the buffer entirely.
   */
  clear() {
    for (let i = 0; i < this._capacity; i++) {
      this._buffer[i] = null;
    }
    this._head = 0;
    this._tail = 0;
    this._size = 0;
  }
}

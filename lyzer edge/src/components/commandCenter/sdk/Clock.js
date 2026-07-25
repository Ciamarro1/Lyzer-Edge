/**
 * @file Clock.js
 * Lyzer Edge Command Center V2 — Abstract Clock for deterministic scheduling.
 * Standard: M1.3 MCR
 */

/**
 * Base Clock Interface
 */
export class Clock {
  now() { throw new Error('Not implemented'); }
  schedule(callback) { throw new Error('Not implemented'); }
}

/**
 * Browser implementation using requestAnimationFrame and performance.now()
 */
export class BrowserClock extends Clock {
  now() {
    return performance.now();
  }
  schedule(callback) {
    const handle = requestAnimationFrame(callback);
    return { dispose: () => cancelAnimationFrame(handle) };
  }
}

/**
 * Node implementation using setImmediate/setTimeout and process.hrtime
 */
export class NodeClock extends Clock {
  constructor(targetFps = 60) {
    super();
    this.frameMs = 1000 / targetFps;
  }
  now() {
    return performance.now(); // Node 16+ has performance.now() natively available via global
  }
  schedule(callback) {
    const handle = setTimeout(() => callback(this.now()), this.frameMs);
    return { dispose: () => clearTimeout(handle) };
  }
}

/**
 * Manual/Deterministic Clock for Unit Tests
 */
export class ManualClock extends Clock {
  constructor() {
    super();
    this._currentTime = 0;
    this._scheduledCallbacks = [];
  }
  now() {
    return this._currentTime;
  }
  schedule(callback) {
    const record = { callback, cancelled: false };
    this._scheduledCallbacks.push(record);
    return { dispose: () => { record.cancelled = true; } };
  }

  // Test Utilities
  advance(ms) {
    this._currentTime += ms;
    return this;
  }
  
  tick() {
    const cbs = [...this._scheduledCallbacks];
    this._scheduledCallbacks = [];
    for (const record of cbs) {
      if (!record.cancelled) {
        record.callback(this._currentTime);
      }
    }
  }
}

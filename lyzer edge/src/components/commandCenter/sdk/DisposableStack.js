/**
 * Lyzer Edge Command Center V2 — DisposableStack (TC39 Standard)
 *
 * Provides deterministic resource teardown for event listeners, timers,
 * and subscriptions, preventing memory leaks when widgets unmount.
 */

export class DisposableStack {
  constructor() {
    this._disposables = [];
    this._isDisposed = false;
  }

  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * Adds a disposable resource to the stack.
   * @param {Object|Function} disposable - Object with dispose() / [Symbol.dispose]() method or cleanup function
   * @returns {Object|Function} the passed disposable
   */
  use(disposable) {
    if (!disposable) return disposable;
    if (this._isDisposed) {
      this._disposeOne(disposable);
      return disposable;
    }
    this._disposables.push(disposable);
    return disposable;
  }

  /**
   * Alias for use(disposable).
   */
  add(disposable) {
    return this.use(disposable);
  }

  /**
   * Removes a disposable from the stack without disposing it.
   * @param {Object|Function} disposable
   * @returns {boolean} true if removed
   */
  remove(disposable) {
    const idx = this._disposables.indexOf(disposable);
    if (idx !== -1) {
      this._disposables.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Executes all cleanup resources in LIFO order (last in, first out).
   */
  dispose() {
    if (this._isDisposed) return;
    this._isDisposed = true;

    while (this._disposables.length > 0) {
      const item = this._disposables.pop();
      this._disposeOne(item);
    }
  }

  /**
   * Symbol.dispose integration for native TC39 'using' statement.
   */
  [Symbol.dispose]() {
    this.dispose();
  }

  /** @private */
  _disposeOne(item) {
    try {
      if (typeof item === 'function') {
        item();
      } else if (typeof item === 'object' && item !== null) {
        if (typeof item[Symbol.dispose] === 'function') {
          item[Symbol.dispose]();
        } else if (typeof item.dispose === 'function') {
          item.dispose();
        }
      }
    } catch (err) {
      console.error('[DisposableStack] Exception during resource disposal:', err);
    }
  }
}

/**
 * Creates a standalone Disposable wrapper around a cleanup function.
 * @param {Function} cleanupFn
 * @returns {Object} Disposable object
 */
export function createDisposable(cleanupFn) {
  let disposed = false;
  return {
    get isDisposed() { return disposed; },
    dispose() {
      if (!disposed) {
        disposed = true;
        if (typeof cleanupFn === 'function') cleanupFn();
      }
    },
    [Symbol.dispose]() {
      this.dispose();
    }
  };
}

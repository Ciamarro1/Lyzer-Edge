/**
 * Lyzer Edge - WidgetLifecycle
 * Strict lifecycle management contract for Command Center widgets.
 */
export class WidgetLifecycle {
  constructor(widgetId, impl) {
    if (!impl || typeof impl.mount !== 'function') {
      throw new Error('Implementation must provide a mount() function.');
    }
    if (typeof impl.dispose !== 'function') {
      throw new Error('Implementation must provide a dispose() function.');
    }

    this.widgetId = widgetId;
    this.impl = impl;
    this._isMounted = false;
  }

  mount(container, runtime) {
    if (this._isMounted) {
      throw new Error(`Widget ${this.widgetId} is already mounted.`);
    }
    this.impl.mount(container, runtime);
    this._isMounted = true;
  }

  update(data) {
    if (!this._isMounted) return;
    if (typeof this.impl.update === 'function') {
      this.impl.update(data);
    }
  }

  dispose() {
    if (this.impl && typeof this.impl.dispose === 'function') {
      this.impl.dispose();
    }
    this._isMounted = false;
  }
}

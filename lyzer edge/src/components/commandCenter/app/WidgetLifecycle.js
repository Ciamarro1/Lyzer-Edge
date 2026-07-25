/**
 * Lyzer Edge - Widget Lifecycle Contract
 * Enforces strict mount/update/dispose mechanics for all UI widgets.
 */

export class WidgetLifecycle {
  constructor(id, implementation) {
    if (!id || typeof id !== 'string') {
      throw new Error('[WidgetLifecycle] Widget ID is required.');
    }
    if (!implementation || typeof implementation.mount !== 'function') {
      throw new Error('[WidgetLifecycle] Implementation must provide a mount() function.');
    }
    if (typeof implementation.dispose !== 'function') {
      throw new Error('[WidgetLifecycle] Implementation must provide a dispose() function.');
    }

    this.id = id;
    this._impl = implementation;
    this._isMounted = false;
  }

  /**
   * Mounts the widget into a DOM container and binds the runtime.
   * @param {HTMLElement} container 
   * @param {Object} runtime CommandCenterRuntime instance
   */
  mount(container, runtime) {
    if (this._isMounted) {
      throw new Error(`[WidgetLifecycle] Widget ${this.id} is already mounted.`);
    }
    
    this._impl.mount(container, runtime);
    this._isMounted = true;
  }

  /**
   * Optional update method to push external state changes directly.
   * @param {Object} state 
   */
  update(state) {
    if (!this._isMounted) return;
    if (typeof this._impl.update === 'function') {
      this._impl.update(state);
    }
  }

  /**
   * Disposes the widget, unbinding all listeners and clearing DOM.
   * "Tudo que sobe precisa saber como descer."
   */
  dispose() {
    if (!this._isMounted) return;
    this._impl.dispose();
    this._isMounted = false;
  }
}

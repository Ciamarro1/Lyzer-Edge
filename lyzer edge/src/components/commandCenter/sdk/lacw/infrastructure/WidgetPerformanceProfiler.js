/**
 * Lyzer Edge — WidgetPerformanceProfiler
 * Widget Performance Profiler.
 * Tracks 7 Widget Performance Attributes:
 *   priority, memory_cost, render_cost, update_frequency, data_size, refresh_policy, visibility
 */

export class WidgetPerformanceProfiler {
  constructor() {
    this._disposed = false;
    this._widgetProfiles = new Map();
  }

  /**
   * Profiles a widget's resource performance contract.
   * @param {string} widgetId
   * @param {object} profileSpec
   */
  profileWidget(widgetId, profileSpec = {}) {
    this._assertNotDisposed();

    const record = Object.freeze({
      widgetId,
      priority: profileSpec.priority || 'HIGH',
      memory_cost: profileSpec.memory_cost || 'LOW_15MB',
      render_cost: profileSpec.render_cost || 'FAST_3MS',
      update_frequency: profileSpec.update_frequency || '100MS_REALTIME',
      data_size: profileSpec.data_size || '50_POINTS',
      refresh_policy: profileSpec.refresh_policy || 'ON_CHANGE',
      visibility: profileSpec.visibility || 'VISIBLE',
      profiledAt: Date.now()
    });

    this._widgetProfiles.set(widgetId, record);
    return record;
  }

  /**
   * Returns profiled metrics for a widget.
   * @param {string} widgetId
   */
  getProfile(widgetId) {
    this._assertNotDisposed();
    return this._widgetProfiles.get(widgetId) || null;
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_WIDGET_PERFORMANCE_PROFILER_DISPOSED: Widget Performance Profiler is disposed');
  }

  dispose() {
    this._disposed = true;
    this._widgetProfiles.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

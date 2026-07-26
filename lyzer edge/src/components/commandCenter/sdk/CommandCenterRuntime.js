/**
 * Lyzer Edge Command Center V2 — Unified CommandCenterRuntime Facade
 *
 * Implements the opaque ICommandCenterRuntime facade specified in ADR-041 and RFC-001.
 * Encapsulates dashboardRuntimeAdapter, dashboardSecurityGuard, and EventBus,
 * enforcing Zero-Trust Capability checks and shallow-equality slice subscriptions.
 */

import { runtimeAdapter } from '../../../services/dashboard/dashboardRuntimeAdapter.js';
import { securityGuard } from '../../../services/dashboard/dashboardSecurityGuard.js';
import { eventBus } from '../../../lib/eventBus.js';
import { DisposableStack, createDisposable } from './DisposableStack.js';
import { WidgetCapabilities, WidgetError, validateManifest, shallowEquals, freezePayload } from './types.js';
import { performanceMonitor } from './observability/PerformanceMonitor.js';

export class CommandCenterRuntime {
  /**
   * Instantiates a scoped runtime facade for a specific widget.
   * @param {Object} manifest - Validated WidgetManifest
   * @param {string} [instanceId] - Unique mount instance ID
   * @param {Object} [options] - Optional runtime configurations (e.g., dataProvider)
   */
  constructor(manifest, instanceId = null, options = {}) {
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      throw new WidgetError('ERR_MANIFEST_INVALID', validation.errors.join(' '));
    }

    const capabilities = Array.isArray(manifest.capabilities)
      ? Object.freeze([...manifest.capabilities])
      : Object.freeze([]);

    this._manifest = Object.freeze({
      ...manifest,
      capabilities
    });

    this._widgetId = manifest.id;
    this._instanceId = instanceId || `${manifest.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this._adapter = options.dataProvider || options.adapter || runtimeAdapter;
    this._orchestrator = options.orchestrator || null;
    this._options = Object.freeze({ ...options });
    this._securityGuard = securityGuard;
    this._eventBus = eventBus;

    this._disposableStack = new DisposableStack();
    this._localState = new Map();
    this._telemetryLog = [];
    this._diagnosticLog = [];
    this._isDisposed = false;
    this._maxLogEntries = 100;
  }

  get widgetId() {
    return this._widgetId;
  }

  get instanceId() {
    return this._instanceId;
  }

  get manifest() {
    return this._manifest;
  }

  get mode() {
    return typeof this._adapter?.getMode === 'function' ? this._adapter.getMode() : 'LIVE';
  }

  get realityTag() {
    return this._manifest.realityTag;
  }

  get theme() {
    return this._options.theme || 'dark';
  }

  get locale() {
    return this._options.locale || 'en-US';
  }

  get paneId() {
    return this._options.paneId || this._manifest.targetPane;
  }

  get isDisposed() {
    return this._isDisposed;
  }

  /** @private */
  _checkDisposed() {
    if (this._isDisposed) {
      throw new WidgetError('ERR_RUNTIME_DISPOSED', `Runtime instance for '${this._widgetId}' has been disposed.`);
    }
  }

  // ── REALITY GOVERNANCE (M1.4.5) ──────────────────────────────────────

  /**
   * Retrieves the current reality status governed by the Reality Orchestrator.
   */
  getRealityStatus() {
    this._checkDisposed();
    if (this._orchestrator) {
      return this._orchestrator.telemetry;
    }
    return {
      providerId: this._adapter?.id || 'legacy',
      realityTag: typeof this._adapter?.getSnapshot === 'function' ? this._adapter.getSnapshot().realityTag : this.realityTag,
      healthStatus: 'UNKNOWN'
    };
  }

  /**
   * Retrieves current real-time performance telemetry snapshot.
   * Requires 'telemetry:read' capability.
   */
  getPerformanceMetrics() {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    return performanceMonitor.getSnapshot();
  }

  /**
   * Subscribes to real-time performance telemetry events.
   * Requires 'telemetry:read' capability.
   * @param {Function} callback
   * @returns {Object} Disposable handle
   */
  subscribePerformanceMetrics(callback) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }
    const disposable = performanceMonitor.onSnapshot(callback);
    this._disposableStack.use(disposable);
    return disposable;
  }

  // ── DATA ACCESS (ZERO-TRUST READ-ONLY) ───────────────────────────────

  /**
   * Synchronously retrieves the current frozen global system snapshot.
   * Requires 'telemetry:read' capability.
   * @returns {Object} Frozen RuntimeSnapshot
   */
  getSnapshot() {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    return this._adapter.hasData()
      ? this._adapter.getSnapshot()
      : this._adapter.getDefaultSnapshot();
  }

  /**
   * Retrieves Constitutional Court audit logs and veto status.
   * Requires 'court:read' capability.
   */
  getCourtAuditLog() {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.COURT_READ);
    return typeof this._adapter.getVetoAuditLog === 'function'
      ? this._adapter.getVetoAuditLog()
      : (typeof this._adapter.getCourtState === 'function' ? this._adapter.getCourtState() : []);
  }

  /**
   * Retrieves market data (candles, ticks, order blocks) from the provider.
   * Requires 'market_data:read' capability.
   */
  getMarketData(query = {}) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.MARKET_DATA_READ);
    if (typeof this._adapter.getMarketData !== 'function') {
      throw new WidgetError('ERR_UNSUPPORTED_METHOD', 'Current data provider does not support getMarketData.');
    }
    return this._adapter.getMarketData(query);
  }

  /**
   * Retrieves causal timeline history and intent lineage.
   * Requires 'causal_timeline:read' capability.
   */
  getCausalTimeline(query = {}) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.CAUSAL_TIMELINE_READ);
    if (typeof this._adapter.getCausalTimeline !== 'function') {
      throw new WidgetError('ERR_UNSUPPORTED_METHOD', 'Current data provider does not support getCausalTimeline.');
    }
    return this._adapter.getCausalTimeline(query);
  }

  /**
   * Subscribes to all snapshot emissions.
   * Requires 'telemetry:read' capability.
   * @param {Function} callback
   * @returns {Object} Disposable handle
   */
  subscribeSnapshot(callback) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }

    const handler = () => {
      try {
        if (!this._isDisposed) {
          const snapshot = this._adapter.hasData()
            ? this._adapter.getSnapshot()
            : this._adapter.getDefaultSnapshot();
          callback(snapshot);
        }
      } catch (err) {
        this.reportError(err);
      }
    };

    const unsubscribe = typeof this._adapter.subscribe === 'function'
      ? this._adapter.subscribe(handler)
      : this._eventBus.on('state:changed', handler);

    const disposable = createDisposable(() => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else if (typeof unsubscribe?.dispose === 'function') unsubscribe.dispose();
      else this._eventBus.off('state:changed', handler);
    });

    this._disposableStack.use(disposable);
    return disposable;
  }

  /**
   * Subscribes to high-frequency market data tick/candle streams.
   * Requires 'market_data:read' capability.
   * @param {Object} query - e.g. { symbol: 'BTCUSDT', timeframe: '1m' }
   * @param {Function} callback - Function (data) => void
   * @returns {Object} Disposable handle
   */
  subscribeMarketData(query, callback) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.MARKET_DATA_READ);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }

    const handler = (data) => {
      try {
        if (!this._isDisposed) {
          callback(data);
        }
      } catch (err) {
        this.reportError(err);
      }
    };

    let unsubscribe;
    if (typeof this._adapter?.subscribeMarketData === 'function') {
      unsubscribe = this._adapter.subscribeMarketData(query, handler);
    } else {
      unsubscribe = this._eventBus.on('market:tick', handler);
    }

    const disposable = createDisposable(() => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else if (typeof unsubscribe?.dispose === 'function') unsubscribe.dispose();
      else this._eventBus.off('market:tick', handler);
    });

    this._disposableStack.use(disposable);
    return disposable;
  }

  /**
   * Subscribes to a specific slice of the snapshot with shallow-equality throttling.
   * Listener fires ONLY when the selected slice fails equality check.
   * @param {Function} selector - Pure function (snapshot) => slice
   * @param {Function} callback - Function (value, prevValue) => void
   * @param {Function} [equalityFn] - Custom equality check (a, b) => boolean
   * @returns {Object} Disposable handle
   */
  subscribeSlice(selector, callback, equalityFn = shallowEquals) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    if (typeof selector !== 'function' || typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_SELECTOR', 'Selector and callback must be functions');
    }

    let previousValue = selector(this.getSnapshot());

    const disposable = this.subscribeSnapshot((snapshot) => {
      try {
        const nextValue = selector(snapshot);
        if (!equalityFn(previousValue, nextValue)) {
          const prev = previousValue;
          previousValue = nextValue;
          callback(nextValue, prev);
        }
      } catch (err) {
        this.reportError(err);
      }
    });

    return disposable;
  }

  // ── SANITIZED INTER-WIDGET EVENT BUS ─────────────────────────────────

  /**
   * Emits a topic event over the EventBus.
   * Requires 'ui_event:emit' capability.
   * @param {string} topic
   * @param {*} payload
   */
  emitEvent(topic, payload) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.UI_EVENT_EMIT);
    
    // Inspect via SecurityGuard
    const inspection = this._securityGuard.inspect({
      method: 'UI_EVENT',
      action: `EMIT_EVENT:${topic}`,
      source: this._widgetId
    });

    if (!inspection.allowed) {
      throw new WidgetError('ERR_CAPABILITY_DENIED', inspection.error, { topic });
    }

    const sanitizedPayload = freezePayload(payload);

    this._eventBus.emit(topic, {
      topic,
      sourceWidgetId: this._widgetId,
      instanceId: this._instanceId,
      payload: sanitizedPayload,
      timestamp: Date.now()
    });
  }

  /**
   * Subscribes to an inter-widget event topic.
   * Requires 'ui_event:listen' capability.
   * @param {string} topic
   * @param {Function} callback
   * @returns {Object} Disposable handle
   */
  subscribeEvent(topic, callback) {
    this._checkDisposed();
    this.checkCapability(WidgetCapabilities.UI_EVENT_LISTEN);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }

    const handler = (eventData) => {
      try {
        if (!this._isDisposed) {
          callback(eventData?.payload, eventData);
        }
      } catch (err) {
        this.reportError(err);
      }
    };

    const unsubscribe = this._eventBus.on(topic, handler);
    const disposable = createDisposable(() => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else this._eventBus.off(topic, handler);
    });

    this._disposableStack.use(disposable);
    return disposable;
  }

  // ── INSTANCE LOCAL STATE ─────────────────────────────────────────────

  getLocalState(key) {
    this._checkDisposed();
    return this._localState.get(key);
  }

  setLocalState(key, value) {
    this._checkDisposed();
    this._localState.set(key, value);
  }

  // ── SECURITY & CAPABILITIES SYSTEM ───────────────────────────────────

  /**
   * Checks if the widget possesses a declared capability.
   * @param {string} capability
   * @returns {boolean}
   */
  hasCapability(capability) {
    return Array.isArray(this._manifest.capabilities) &&
      this._manifest.capabilities.includes(capability);
  }

  /**
   * Asserts capability, throwing a WidgetError if missing.
   * @param {string} capability
   */
  checkCapability(capability) {
    if (!this.hasCapability(capability)) {
      throw new WidgetError(
        'ERR_CAPABILITY_DENIED',
        `Widget '${this._widgetId}' lacks required capability: '${capability}'.`,
        { requiredCapability: capability, widgetId: this._widgetId }
      );
    }
  }

  // ── TELEMETRY & DIAGNOSTICS ──────────────────────────────────────────

  logTelemetry(metricName, value, tags = {}) {
    if (this._isDisposed) return;
    const entry = {
      metricName,
      value,
      tags,
      widgetId: this._widgetId,
      instanceId: this._instanceId,
      timestamp: Date.now()
    };
    this._telemetryLog.push(entry);
    if (this._telemetryLog.length > this._maxLogEntries) {
      this._telemetryLog.shift();
    }
  }

  logDiagnostic(level, message, meta = {}) {
    if (this._isDisposed) return;
    const entry = {
      level,
      message,
      meta,
      widgetId: this._widgetId,
      timestamp: new Date().toISOString()
    };
    this._diagnosticLog.push(entry);
    if (this._diagnosticLog.length > this._maxLogEntries) {
      this._diagnosticLog.shift();
    }
    if (level === 'ERROR') {
      console.error(`[${this._widgetId}] [${level}] ${message}`, meta);
    }
  }

  reportError(error) {
    this.logDiagnostic('ERROR', error.message || 'Unknown Error', {
      stack: error.stack,
      code: error.code
    });
  }

  // ── TEARDOWN ─────────────────────────────────────────────────────────

  dispose() {
    if (this._isDisposed) return;
    this._isDisposed = true;
    this._disposableStack.dispose();
    this._localState.clear();
    this._telemetryLog = [];
    this._diagnosticLog = [];
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

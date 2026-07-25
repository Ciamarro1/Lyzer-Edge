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
import { WidgetCapabilities, WidgetError, validateManifest } from './types.js';

export class CommandCenterRuntime {
  /**
   * Instantiates a scoped runtime facade for a specific widget.
   * @param {Object} manifest - Validated WidgetManifest
   * @param {string} [instanceId] - Unique mount instance ID
   */
  constructor(manifest, instanceId = null) {
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      throw new WidgetError('ERR_MANIFEST_INVALID', validation.errors.join(' '));
    }

    this._manifest = Object.freeze({ ...manifest });
    this._widgetId = manifest.id;
    this._instanceId = instanceId || `${manifest.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this._adapter = runtimeAdapter;
    this._securityGuard = securityGuard;
    this._eventBus = eventBus;

    this._disposableStack = new DisposableStack();
    this._localState = new Map();
    this._telemetryLog = [];
    this._diagnosticLog = [];
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
    return 'LIVE';
  }

  get realityTag() {
    return this._manifest.realityTag;
  }

  // ── DATA ACCESS (ZERO-TRUST READ-ONLY) ───────────────────────────────

  /**
   * Synchronously retrieves the current frozen global system snapshot.
   * Requires 'telemetry:read' capability.
   * @returns {Object} Frozen RuntimeSnapshot
   */
  getSnapshot() {
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    const snapshot = this._adapter.hasData()
      ? this._adapter.getSnapshot()
      : this._adapter.getDefaultSnapshot();
    return snapshot;
  }

  /**
   * Subscribes to all snapshot emissions.
   * Requires 'telemetry:read' capability.
   * @param {Function} callback
   * @returns {Object} Disposable handle
   */
  subscribeSnapshot(callback) {
    this.checkCapability(WidgetCapabilities.TELEMETRY_READ);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }

    const handler = () => {
      try {
        callback(this.getSnapshot());
      } catch (err) {
        this.reportError(err);
      }
    };

    const unsubscribe = this._eventBus.on('state:changed', handler);
    const disposable = createDisposable(() => {
      if (typeof unsubscribe === 'function') unsubscribe();
      else this._eventBus.off('state:changed', handler);
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
  subscribeSlice(selector, callback, equalityFn = (a, b) => a === b) {
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

    this._eventBus.emit(topic, {
      topic,
      sourceWidgetId: this._widgetId,
      instanceId: this._instanceId,
      payload,
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
    this.checkCapability(WidgetCapabilities.UI_EVENT_LISTEN);
    if (typeof callback !== 'function') {
      throw new WidgetError('ERR_INVALID_CALLBACK', 'Callback must be a function');
    }

    const handler = (eventData) => {
      try {
        callback(eventData?.payload, eventData);
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
    return this._localState.get(key);
  }

  setLocalState(key, value) {
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
    const entry = {
      metricName,
      value,
      tags,
      widgetId: this._widgetId,
      instanceId: this._instanceId,
      timestamp: Date.now()
    };
    this._telemetryLog.push(entry);
  }

  logDiagnostic(level, message, meta = {}) {
    const entry = {
      level,
      message,
      meta,
      widgetId: this._widgetId,
      timestamp: new Date().toISOString()
    };
    this._diagnosticLog.push(entry);
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
    this._disposableStack.dispose();
    this._localState.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

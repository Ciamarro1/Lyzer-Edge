/**
 * Lyzer Edge Command Center V2 — SDK Types & Manifest Validation
 *
 * Defines structural type constants, capabilities, event topics,
 * and error objects for the Institutional Widget Framework (ADR-041 / RFC-001).
 */

export const WidgetCapabilities = Object.freeze({
  TELEMETRY_READ: 'telemetry:read',
  COURT_READ: 'court:read',
  CAUSAL_TIMELINE_READ: 'causal_timeline:read',
  UI_EVENT_EMIT: 'ui_event:emit',
  UI_EVENT_LISTEN: 'ui_event:listen',
  MARKET_DATA_READ: 'market_data:read'
});

export const RealityTags = Object.freeze({
  OBSERVED_REALITY: 'OBSERVED_REALITY',
  RECONSTRUCTED_REALITY: 'RECONSTRUCTED_REALITY',
  SYNTHETIC_REALITY: 'SYNTHETIC_REALITY'
});

export const ProviderHealthStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE'
});

export const TargetPanes = Object.freeze({
  LEFT_PANE: 'LEFT_PANE',
  RIGHT_PANE: 'RIGHT_PANE',
  FULL_WIDTH: 'FULL_WIDTH'
});

export const EventTopics = Object.freeze({
  MARKET_TICK: 'market:tick',
  CANDLE_CLOSED: 'market:candle_closed',
  FVG_SELECTED: 'chart:fvg_selected',
  ORDER_BLOCK_HOVER: 'chart:ob_hover',
  COURT_VETO_TRIGGERED: 'court:veto_triggered',
  LHDS_THRESHOLD_EXCEEDED: 'court:lhds_exceeded',
  TRADE_DNA_SELECTED: 'timeline:dna_selected',
  UI_TAB_SWITCHED: 'ui:tab_switched'
});

/**
 * Validates a WidgetManifest object against the schema specifications.
 * @param {Object} manifest
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object.'] };
  }

  if (!manifest.id || typeof manifest.id !== 'string' || !/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push("Manifest 'id' must be a lowercase slug (e.g., 'chart-widget').");
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push("Manifest 'name' is required.");
  }

  const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/;
  if (!manifest.version || typeof manifest.version !== 'string' || !semverRegex.test(manifest.version)) {
    errors.push("Manifest 'version' must follow strict SemVer format (e.g., '1.0.0').");
  }

  if (!manifest.minRuntimeVersion || typeof manifest.minRuntimeVersion !== 'string' || !semverRegex.test(manifest.minRuntimeVersion)) {
    errors.push("Manifest 'minRuntimeVersion' is required and must follow strict SemVer format (e.g., '3.4.0').");
  }

  if (!manifest.targetPane || !Object.values(TargetPanes).includes(manifest.targetPane)) {
    errors.push(`Manifest 'targetPane' must be one of: ${Object.values(TargetPanes).join(', ')}.`);
  }

  const validCapabilities = Object.values(WidgetCapabilities);
  if (!Array.isArray(manifest.capabilities)) {
    errors.push("Manifest 'capabilities' must be an array.");
  } else {
    for (const cap of manifest.capabilities) {
      if (!validCapabilities.includes(cap)) {
        errors.push(`Invalid capability '${cap}' in manifest. Allowed: ${validCapabilities.join(', ')}.`);
      }
    }
  }

  if (!manifest.realityTag || !Object.values(RealityTags).includes(manifest.realityTag)) {
    errors.push(`Manifest 'realityTag' must be 'OBSERVED_REALITY' or 'SYNTHETIC_REALITY'.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Structural type guard helper verifying if an object satisfies the IWidgetPlugin contract.
 * @param {*} plugin
 * @returns {boolean}
 */
export function isWidgetPlugin(plugin) {
  if (!plugin || typeof plugin !== 'object') return false;
  if (!plugin.manifest || !validateManifest(plugin.manifest).valid) return false;
  if (typeof plugin.mount !== 'function') return false;
  if (typeof plugin.unmount !== 'function') return false;
  return true;
}

/**
 * Performs a shallow equality check between two values or objects.
 * Prevents redundant render passes in slice subscriptions.
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export function shallowEquals(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Custom Error class for Widget Framework operations.
 */
export class WidgetError extends Error {
  constructor(code, message, details = {}) {
    super(`[${code}] ${message}`);
    this.name = 'WidgetError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Deeply or structurally freezes an event payload according to institutional immutability rules.
 * Handles Array, Object, Map, Set, TypedArray, and Date.
 * @param {*} payload
 * @returns {*} Frozen copy or original primitive
 */
export function freezePayload(payload) {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }
  if (payload instanceof Date) {
    return new Date(payload.getTime());
  }
  if (Array.isArray(payload)) {
    return Object.freeze(payload.map(item => freezePayload(item)));
  }
  if (payload instanceof Map) {
    const copy = new Map();
    for (const [k, v] of payload.entries()) {
      copy.set(k, freezePayload(v));
    }
    return copy;
  }
  if (payload instanceof Set) {
    const copy = new Set();
    for (const v of payload.values()) {
      copy.add(freezePayload(v));
    }
    return copy;
  }
  if (ArrayBuffer.isView(payload) || payload instanceof ArrayBuffer) {
    return payload.slice(0);
  }
  const copy = { ...payload };
  for (const key of Object.keys(copy)) {
    copy[key] = freezePayload(copy[key]);
  }
  return Object.freeze(copy);
}

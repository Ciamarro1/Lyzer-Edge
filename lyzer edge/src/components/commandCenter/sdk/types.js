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
  SYNTHETIC_REALITY: 'SYNTHETIC_REALITY'
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

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push("Manifest 'version' is required (SemVer format).");
  }

  if (!manifest.targetPane || !Object.values(TargetPanes).includes(manifest.targetPane)) {
    errors.push(`Manifest 'targetPane' must be one of: ${Object.values(TargetPanes).join(', ')}.`);
  }

  if (!Array.isArray(manifest.capabilities)) {
    errors.push("Manifest 'capabilities' must be an array.");
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

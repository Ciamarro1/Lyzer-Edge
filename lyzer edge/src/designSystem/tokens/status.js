/**
 * Lyzer Edge Design System — Fiduciary Status Tokens
 *
 * The color is a CONSEQUENCE of the state, not the other way around.
 * Every visual element that communicates system health MUST use this system.
 */

import { colors } from './colors.js';

/**
 * @typedef {Object} StatusDefinition
 * @property {string} key       - Machine identifier
 * @property {string} label     - Human-readable label
 * @property {string} meaning   - What this state means operationally
 * @property {number} severity  - 0 (safe) to 3 (critical)
 * @property {string} color     - Foreground color
 * @property {string} bg        - Background tint
 * @property {string} border    - Border color for pills/badges
 */

export const STATUS = Object.freeze({
  GREEN: Object.freeze({
    key: 'GREEN',
    label: 'GREEN',
    meaning: 'validated — system operating within institutional parameters',
    severity: 0,
    color: colors.status.green,
    bg: colors.statusBg.green,
    border: colors.status.green,
  }),

  YELLOW: Object.freeze({
    key: 'YELLOW',
    label: 'YELLOW',
    meaning: 'degradation detected — monitoring escalated',
    severity: 1,
    color: colors.status.yellow,
    bg: colors.statusBg.yellow,
    border: colors.status.yellow,
  }),

  ORANGE: Object.freeze({
    key: 'ORANGE',
    label: 'ORANGE',
    meaning: 'operational risk — requires human attention',
    severity: 2,
    color: colors.status.orange,
    bg: colors.statusBg.orange,
    border: colors.status.orange,
  }),

  RED: Object.freeze({
    key: 'RED',
    label: 'RED',
    meaning: 'system halt required — critical failure or compromise',
    severity: 3,
    color: colors.status.red,
    bg: colors.statusBg.red,
    border: colors.status.red,
  }),
});

/**
 * Resolve a status key string to a StatusDefinition.
 * Falls back to RED for unknown keys (fail-closed).
 * @param {string} key - GREEN, YELLOW, ORANGE, RED, or any string
 * @returns {StatusDefinition}
 */
export function resolveStatus(key) {
  const normalized = (key || '').toUpperCase().trim();
  return STATUS[normalized] || STATUS.RED; // fail-closed: unknown → RED
}

/**
 * Returns the color for a given status key.
 * @param {string} key
 * @returns {string}
 */
export function statusColor(key) {
  return resolveStatus(key).color;
}

/**
 * Returns the background for a given status key.
 * @param {string} key
 * @returns {string}
 */
export function statusBg(key) {
  return resolveStatus(key).bg;
}

/**
 * Awaiting Data status — used before first data arrives.
 */
export const AWAITING_DATA = Object.freeze({
  key: 'AWAITING_DATA',
  label: 'AWAITING DATA',
  meaning: 'no telemetry received yet — system initializing',
  severity: -1,
  color: colors.text.muted,
  bg: colors.statusBg.neutral,
  border: colors.border.default,
});

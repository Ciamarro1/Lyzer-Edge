/**
 * Lyzer Edge Design System — Primitive UI Components
 *
 * Reusable building blocks for the 8 Command Center modules.
 * All components are purely presentational render functions
 * that return HTML strings. They consume design tokens only.
 *
 * Zero business logic. Zero L15 imports. Zero write capabilities.
 */

import { colors } from '../tokens/colors.js';
import { typography } from '../tokens/typography.js';
import { spacing } from '../tokens/spacing.js';
import { resolveStatus, statusColor, statusBg, AWAITING_DATA } from '../tokens/status.js';

// ── InstitutionalCard ────────────────────────────────────────────────
/**
 * A bordered panel with optional title and status indicator.
 * @param {Object} opts
 * @param {string} [opts.title]       - Panel heading
 * @param {string} [opts.statusKey]   - GREEN/YELLOW/ORANGE/RED
 * @param {string} opts.content       - Inner HTML
 * @returns {string}
 */
export function InstitutionalCard({ title, statusKey, content }) {
  const titleHtml = title
    ? `<div style="
        font-size: ${typography.size.md};
        font-family: ${typography.family.sans};
        font-weight: ${typography.weight.bold};
        letter-spacing: ${typography.tracking.wide};
        color: ${colors.text.primary};
        text-transform: uppercase;
        margin-bottom: ${spacing.px[4]};
        padding-bottom: ${spacing.px[3]};
        border-bottom: 1px solid ${colors.border.subtle};
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">${title}${statusKey ? StatusIndicator({ status: statusKey, size: 'sm' }) : ''}</div>`
    : '';

  return `<div style="
    background: ${colors.bg.surface};
    border: 1px solid ${colors.border.default};
    border-radius: ${spacing.radius.md};
    padding: ${spacing.panelPadding};
  ">${titleHtml}${content}</div>`;
}

// ── StatusIndicator ──────────────────────────────────────────────────
/**
 * A colored dot or pill showing system state.
 * @param {Object} opts
 * @param {string} opts.status - GREEN/YELLOW/ORANGE/RED/AWAITING_DATA
 * @param {string} [opts.size='md'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [opts.showLabel=true]
 * @returns {string}
 */
export function StatusIndicator({ status, size = 'md', showLabel = true }) {
  const s = status === 'AWAITING_DATA' ? AWAITING_DATA : resolveStatus(status);
  const dotSize = size === 'sm' ? '6px' : size === 'lg' ? '10px' : '8px';
  const fontSize = size === 'sm' ? typography.size.xs : size === 'lg' ? typography.size.base : typography.size.sm;

  return `<span style="
    display: inline-flex;
    align-items: center;
    gap: 6px;
  ">
    <span style="
      display: block;
      width: ${dotSize};
      height: ${dotSize};
      border-radius: 50%;
      background: ${s.color};
      box-shadow: 0 0 6px ${s.color};
      flex-shrink: 0;
    "></span>
    ${showLabel ? `<span style="
      font-size: ${fontSize};
      font-family: ${typography.family.mono};
      font-weight: ${typography.weight.bold};
      color: ${s.color};
      letter-spacing: ${typography.tracking.wide};
    ">${s.label}</span>` : ''}
  </span>`;
}

// ── MetricCell ───────────────────────────────────────────────────────
/**
 * A label + value display for institutional metrics.
 * @param {Object} opts
 * @param {string} opts.label     - e.g. "UPTIME"
 * @param {string|number} opts.value - e.g. "99.97%"
 * @param {string} [opts.statusKey] - Optional status coloring
 * @param {string} [opts.unit]      - Optional unit suffix
 * @returns {string}
 */
export function MetricCell({ label, value, statusKey, unit }) {
  const valueColor = statusKey ? statusColor(statusKey) : colors.text.primary;
  const unitHtml = unit ? `<span style="
    font-size: ${typography.size.sm};
    color: ${colors.text.secondary};
    margin-left: 2px;
  ">${unit}</span>` : '';

  return `<div style="
    background: ${colors.bg.inset};
    padding: ${spacing.cellPadding};
    border: 1px solid ${colors.border.strong};
    border-radius: ${spacing.radius.md};
  ">
    <div style="
      font-size: ${typography.size.sm};
      font-family: ${typography.family.sans};
      font-weight: ${typography.weight.medium};
      letter-spacing: ${typography.tracking.wide};
      color: ${colors.text.secondary};
      text-transform: uppercase;
      margin-bottom: ${spacing.px[3]};
    ">${label}</div>
    <div style="
      font-size: ${typography.size.xl};
      font-family: ${typography.family.mono};
      font-weight: ${typography.weight.bold};
      color: ${valueColor};
    ">${value}${unitHtml}</div>
  </div>`;
}

// ── HashDisplay ──────────────────────────────────────────────────────
/**
 * Renders a SHA-256 hash with label and verification status.
 * @param {Object} opts
 * @param {string} opts.label    - e.g. "TRUTH KERNEL"
 * @param {string} opts.hash     - 64-char hex string
 * @param {string} [opts.status] - GREEN (verified) or RED (corrupted)
 * @returns {string}
 */
export function HashDisplay({ label, hash, status = 'GREEN' }) {
  const s = resolveStatus(status);
  const truncated = hash && hash.length > 16
    ? `${hash.substring(0, 16)}...${hash.substring(hash.length - 8)}`
    : hash || '—';

  return `<div style="
    background: ${colors.bg.inset};
    padding: ${spacing.cellPadding};
    border: 1px solid ${colors.border.strong};
    border-radius: ${spacing.radius.md};
  ">
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${spacing.px[2]};
    ">
      <span style="
        font-size: ${typography.size.sm};
        font-family: ${typography.family.sans};
        font-weight: ${typography.weight.bold};
        letter-spacing: ${typography.tracking.wide};
        color: ${colors.text.primary};
        text-transform: uppercase;
      ">${label}</span>
      ${StatusIndicator({ status, size: 'sm' })}
    </div>
    <div style="
      font-size: ${typography.size.sm};
      font-family: ${typography.family.mono};
      color: ${colors.accent.hash};
      word-break: break-all;
      letter-spacing: 0.02em;
    " title="${hash}">${truncated}</div>
  </div>`;
}

// ── EvidenceBadge ────────────────────────────────────────────────────
/**
 * A tag indicating the reality source of a data point.
 * @param {Object} opts
 * @param {string} opts.tag - 'OBSERVED_REALITY' | 'SYNTHETIC_REALITY'
 * @returns {string}
 */
export function EvidenceBadge({ tag }) {
  const isObserved = tag === 'OBSERVED_REALITY';
  const color = isObserved ? colors.status.green : colors.accent.info;
  const label = isObserved ? 'OBSERVED' : 'SYNTHETIC';

  return `<span style="
    font-size: ${typography.size.xs};
    font-family: ${typography.family.mono};
    font-weight: ${typography.weight.bold};
    letter-spacing: ${typography.tracking.wide};
    padding: ${spacing.px[1]} ${spacing.px[3]};
    border: 1px solid ${color};
    border-radius: ${spacing.radius.sm};
    color: ${color};
    background: ${isObserved ? colors.statusBg.green : colors.statusBg.info};
    display: inline-block;
  ">${label}</span>`;
}

// ── ReadOnlyBadge ────────────────────────────────────────────────────
/**
 * Visual attestation that the current view is strictly read-only.
 * @returns {string}
 */
export function ReadOnlyBadge() {
  return `<span style="
    font-size: ${typography.size.xs};
    font-family: ${typography.family.mono};
    font-weight: ${typography.weight.bold};
    letter-spacing: ${typography.tracking.wider};
    padding: ${spacing.px[1]} ${spacing.px[3]};
    border: 1px solid ${colors.border.focus};
    border-radius: ${spacing.radius.sm};
    color: ${colors.text.muted};
    background: ${colors.statusBg.neutral};
    display: inline-block;
  ">READ-ONLY</span>`;
}

// ── SecurityBanner ───────────────────────────────────────────────────
/**
 * A warning banner for veto events or security alerts.
 * @param {Object} opts
 * @param {string} opts.message
 * @param {string} [opts.level='RED']
 * @returns {string}
 */
export function SecurityBanner({ message, level = 'RED' }) {
  const s = resolveStatus(level);
  return `<div style="
    background: ${s.bg};
    border: 1px solid ${s.border};
    border-left: 3px solid ${s.color};
    border-radius: ${spacing.radius.sm};
    padding: ${spacing.px[4]} ${spacing.px[6]};
    font-size: ${typography.size.sm};
    font-family: ${typography.family.mono};
    color: ${s.color};
    margin-bottom: ${spacing.px[4]};
  ">${message}</div>`;
}

// ── TimelineEvent ────────────────────────────────────────────────────
/**
 * A timestamped event entry for audit trails.
 * @param {Object} opts
 * @param {string} opts.timestamp - ISO 8601
 * @param {string} opts.event     - Event description
 * @param {string} [opts.statusKey] - GREEN/YELLOW/ORANGE/RED
 * @returns {string}
 */
export function TimelineEvent({ timestamp, event, statusKey = 'GREEN' }) {
  const s = resolveStatus(statusKey);
  return `<div style="
    display: flex;
    align-items: flex-start;
    gap: ${spacing.px[4]};
    padding: ${spacing.px[3]} 0;
    border-bottom: 1px solid ${colors.border.subtle};
  ">
    <span style="
      display: block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${s.color};
      margin-top: 5px;
      flex-shrink: 0;
    "></span>
    <div>
      <div style="
        font-size: ${typography.size.xs};
        font-family: ${typography.family.mono};
        color: ${colors.text.muted};
        margin-bottom: 2px;
      ">${timestamp}</div>
      <div style="
        font-size: ${typography.size.sm};
        font-family: ${typography.family.mono};
        color: ${colors.text.primary};
      ">${event}</div>
    </div>
  </div>`;
}

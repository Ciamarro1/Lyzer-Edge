/**
 * Lyzer Edge Design System — Institutional Theme
 *
 * Assembles tokens into a single theme object that components consume.
 * Components import the theme, never raw token files directly.
 * This creates a single point of control for the entire visual identity.
 */

import { colors } from '../tokens/colors.js';
import { typography } from '../tokens/typography.js';
import { spacing } from '../tokens/spacing.js';
import { STATUS, AWAITING_DATA, resolveStatus, statusColor, statusBg } from '../tokens/status.js';

export const institutionalTheme = Object.freeze({
  colors,
  typography,
  spacing,
  status: { STATUS, AWAITING_DATA, resolveStatus, statusColor, statusBg },

  /**
   * Generate inline style string for a status pill.
   * @param {string} statusKey - GREEN, YELLOW, ORANGE, RED
   * @returns {string} CSS inline style
   */
  statusPillStyle(statusKey) {
    const s = resolveStatus(statusKey);
    return `
      font-size: ${typography.size.sm};
      font-family: ${typography.family.mono};
      font-weight: ${typography.weight.bold};
      letter-spacing: ${typography.tracking.wider};
      padding: ${spacing.pillPadding};
      border-radius: ${spacing.radius.sm};
      border: 1px solid ${s.border};
      color: ${s.color};
      background: ${s.bg};
      display: inline-block;
    `.trim().replace(/\n\s+/g, ' ');
  },

  /**
   * Generate inline style for an institutional card/panel.
   * @returns {string}
   */
  panelStyle() {
    return `
      background: ${colors.bg.surface};
      border: 1px solid ${colors.border.default};
      border-radius: ${spacing.radius.md};
      padding: ${spacing.panelPadding};
      font-family: ${typography.family.mono};
      color: ${colors.text.primary};
    `.trim().replace(/\n\s+/g, ' ');
  },

  /**
   * Generate inline style for a metric label.
   * @returns {string}
   */
  metricLabelStyle() {
    return `
      font-size: ${typography.size.sm};
      font-family: ${typography.family.sans};
      font-weight: ${typography.weight.medium};
      letter-spacing: ${typography.tracking.wide};
      color: ${colors.text.secondary};
      text-transform: uppercase;
      margin-bottom: 4px;
    `.trim().replace(/\n\s+/g, ' ');
  },

  /**
   * Generate inline style for a large metric value.
   * @param {string} [statusKey] - Optional status coloring
   * @returns {string}
   */
  metricValueStyle(statusKey) {
    const color = statusKey ? statusColor(statusKey) : colors.text.primary;
    return `
      font-size: ${typography.size.xl};
      font-family: ${typography.family.mono};
      font-weight: ${typography.weight.bold};
      letter-spacing: ${typography.tracking.tight};
      color: ${color};
    `.trim().replace(/\n\s+/g, ' ');
  },

  /**
   * Generate inline style for a SHA-256 hash display.
   * @returns {string}
   */
  hashStyle() {
    return `
      font-size: ${typography.size.sm};
      font-family: ${typography.family.mono};
      font-weight: ${typography.weight.normal};
      color: ${colors.accent.hash};
      word-break: break-all;
      letter-spacing: 0.02em;
    `.trim().replace(/\n\s+/g, ' ');
  },

  /**
   * Generate inline style for section headings.
   * @returns {string}
   */
  sectionHeadingStyle() {
    return `
      font-size: ${typography.size.lg};
      font-family: ${typography.family.sans};
      font-weight: ${typography.weight.bold};
      letter-spacing: ${typography.tracking.wide};
      color: ${colors.text.primary};
      margin: 0 0 ${spacing.px[8]} 0;
      padding-bottom: ${spacing.px[4]};
      border-bottom: 1px solid ${colors.border.default};
      text-transform: uppercase;
    `.trim().replace(/\n\s+/g, ' ');
  },
});

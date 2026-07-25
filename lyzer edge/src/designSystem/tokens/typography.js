/**
 * Lyzer Edge Design System — Typography Tokens
 *
 * Two families: sans-serif for labels, monospace for data.
 * Hashes, timestamps and metrics MUST use monospace —
 * they are instrument readings, not marketing copy.
 */

export const typography = Object.freeze({

  // ── Font Families ──────────────────────────────────────────────────
  family: {
    // Labels, descriptions, navigation, headers
    sans: "'Inter', 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // Hashes, timestamps, metrics, IDs, telemetry
    mono: "'JetBrains Mono', 'IBM Plex Mono', 'Cascadia Code', 'SF Mono', 'Fira Code', 'Consolas', monospace",
  },

  // ── Size Scale (rem) ───────────────────────────────────────────────
  size: {
    xs:    '0.65rem',   // footer attestation, micro labels
    sm:    '0.75rem',   // metric labels, badges, reality tags
    base:  '0.85rem',   // body text, descriptions
    md:    '0.95rem',   // navigation tabs, card titles
    lg:    '1.1rem',    // section headings, panel titles
    xl:    '1.3rem',    // primary metric values
    xxl:   '1.6rem',    // hero numbers (reality gap score, uptime %)
  },

  // ── Font Weights ───────────────────────────────────────────────────
  weight: {
    normal:  400,
    medium:  500,
    bold:    700,
  },

  // ── Line Heights ───────────────────────────────────────────────────
  leading: {
    tight:   1.2,   // headings, metrics
    normal:  1.5,   // body text
    relaxed: 1.7,   // long descriptions
  },

  // ── Letter Spacing ─────────────────────────────────────────────────
  tracking: {
    tight:   '-0.01em',   // large numbers
    normal:  '0',         // body
    wide:    '0.04em',    // labels, navigation
    wider:   '0.08em',    // header brand, status pills
  }
});

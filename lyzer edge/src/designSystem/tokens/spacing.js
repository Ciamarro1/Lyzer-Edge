/**
 * Lyzer Edge Design System — Spacing Tokens
 *
 * 4px base grid. All spacing is a multiple of 4.
 * High-density institutional layout — avoid excess whitespace.
 */

export const spacing = Object.freeze({

  // ── Base Scale (px) ────────────────────────────────────────────────
  px: {
    0:   '0',
    1:   '2px',    // micro gaps (inside pills)
    2:   '4px',    // tight padding (badges, tags)
    3:   '6px',    // compact padding
    4:   '8px',    // standard inner padding
    5:   '10px',   // navigation gaps
    6:   '12px',   // card inner padding
    7:   '14px',   // panel padding
    8:   '16px',   // section gaps, grid gaps
    9:   '20px',   // main container padding
    10:  '24px',   // large section separation
    12:  '32px',   // major section breaks
    16:  '40px',   // page-level padding
  },

  // ── Semantic Aliases ───────────────────────────────────────────────
  headerPadding:   '8px 20px',
  footerPadding:   '4px 20px',
  panelPadding:    '14px',
  cardPadding:     '12px',
  cellPadding:     '8px 12px',
  pillPadding:     '2px 10px',
  gridGap:         '12px',
  sectionGap:      '16px',
  viewportPadding: '16px 20px',

  // ── Border Radius ──────────────────────────────────────────────────
  radius: {
    none:  '0',
    sm:    '2px',    // pills, badges, status indicators
    md:    '4px',    // cards, panels
    lg:    '6px',    // elevated surfaces
  }
});

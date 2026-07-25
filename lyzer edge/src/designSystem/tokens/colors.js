/**
 * Lyzer Edge Design System — Color Tokens
 *
 * Institutional Dark Command Center palette.
 * Colors are consequences of states, not decorative choices.
 * Purple Ban enforced (Article 2.1 of Visual Constitution).
 */

export const colors = Object.freeze({

  // ── Backgrounds (darkest to lightest) ──────────────────────────────
  bg: {
    void:     '#040609',   // deepest background — behind everything
    primary:  '#06080d',   // main viewport background
    elevated: '#0a0d14',   // header, footer, raised surfaces
    surface:  '#0e1219',   // cards, panels
    inset:    '#111622',   // inset regions inside cards
    hover:    '#161d2d',   // hover state on interactive elements
  },

  // ── Borders ────────────────────────────────────────────────────────
  border: {
    subtle:   '#141c2b',   // very faint separation
    default:  '#1a2333',   // standard panel borders
    strong:   '#223047',   // emphasized borders
    focus:    '#334155',   // focus rings, active states
  },

  // ── Text ───────────────────────────────────────────────────────────
  text: {
    primary:  '#e0e6ed',   // main readable text
    secondary:'#8899aa',   // labels, descriptions, secondary info
    muted:    '#4a5568',   // timestamps, footnotes, disabled
    inverse:  '#06080d',   // text on light backgrounds (rare)
  },

  // ── Fiduciary Status Semaphores ────────────────────────────────────
  // These are the ONLY accent colors in the system.
  // Each maps to an operational state, not a brand choice.
  status: {
    green:    '#00E676',   // validated, immutable, passed
    yellow:   '#FFEA00',   // degradation detected, warning
    orange:   '#FF9100',   // operational risk, needs attention
    red:      '#FF1744',   // halt required, critical failure
  },

  // ── Functional Accents ─────────────────────────────────────────────
  accent: {
    info:     '#00c8ff',   // informational highlights, links, metadata
    hash:     '#00E676',   // SHA-256 hashes (immutability proof)
    chain:    '#00c8ff',   // transformation chain arrows
    tag:      '#00c8ff',   // reality tags (OBSERVED/SYNTHETIC)
  },

  // ── Status Backgrounds (low opacity, for pills and badges) ────────
  statusBg: {
    green:    'rgba(0, 230, 118, 0.06)',
    yellow:   'rgba(255, 234, 0, 0.06)',
    orange:   'rgba(255, 145, 0, 0.06)',
    red:      'rgba(255, 23, 68, 0.06)',
    info:     'rgba(0, 200, 255, 0.06)',
    neutral:  'rgba(136, 153, 170, 0.06)',
  }
});

/**
 * Lyzer Edge — SemanticColorLanguage
 * Semantic Color Language System.
 * Colors represent meaning, state, and confidence rather than aesthetic preference.
 */

export const SEMANTIC_CATEGORIES = Object.freeze({
  KNOWLEDGE:   '--accent-purple',
  EVIDENCE:    '--accent-cyan',
  DECISION:    '--status-green',
  EXECUTION:   '--accent-blue',
  LEARNING:    '--status-gold',
  REVENUE:     '--status-emerald',
  ALERT:       '--status-yellow',
  INCIDENT:    '--status-red',
  RISK:        '--status-crimson',
  OPPORTUNITY: '--status-teal',
  NEUTRAL:     '--text-muted'
});

export class SemanticColorLanguage {
  constructor() {
    this._disposed = false;
  }

  /**
   * Resolves CSS color token and hex value for a semantic concept category.
   * @param {string} category - Key of SEMANTIC_CATEGORIES
   * @param {string} [theme='DARK']
   */
  resolveColor(category, theme = 'DARK') {
    this._assertNotDisposed();

    const token = SEMANTIC_CATEGORIES[category] || '--text-muted';

    const hexMap = {
      '--accent-purple': '#a855f7',
      '--accent-cyan': '#38bdf8',
      '--status-green': '#4ade80',
      '--accent-blue': '#60a5fa',
      '--status-gold': '#facc15',
      '--status-emerald': '#34d399',
      '--status-yellow': '#fbbf24',
      '--status-red': '#f87171',
      '--status-crimson': '#ef4444',
      '--status-teal': '#2dd4bf',
      '--text-muted': '#94a3b8'
    };

    return Object.freeze({
      category,
      token,
      hex: hexMap[token] || '#94a3b8',
      theme
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_SEMANTIC_COLOR_LANGUAGE_DISPOSED: Semantic Color Language is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

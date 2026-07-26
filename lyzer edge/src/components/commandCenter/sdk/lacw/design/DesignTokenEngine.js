/**
 * Lyzer Edge — DesignTokenEngine
 * Mathematical Design Token Resolver.
 * All spacing, radius, border, font sizes, and transition curves derive from mathematical scales.
 */

export class DesignTokenEngine {
  constructor() {
    this._disposed = false;
    this._baseSpacingPx = 4;
  }

  /**
   * Calculates mathematical spacing in pixels based on multiplier $n \times 4\text{px}$.
   * @param {number} multiplier
   */
  getSpacingPx(multiplier) {
    this._assertNotDisposed();
    return multiplier * this._baseSpacingPx;
  }

  /**
   * Resolves typography token for a density mode.
   * @param {'COMPACT' | 'STANDARD' | 'EXPANDED'} densityMode
   * @param {string} typeRole - e.g. 'BODY', 'METRIC', 'CODE', 'TITLE'
   */
  resolveTypography(densityMode = 'STANDARD', typeRole = 'BODY') {
    this._assertNotDisposed();

    let fontSizePx = 11;
    let lineHeightPx = 16;
    let fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas';

    if (densityMode === 'COMPACT') {
      fontSizePx = typeRole === 'TITLE' ? 12 : 9;
      lineHeightPx = 12;
    } else if (densityMode === 'EXPANDED') {
      fontSizePx = typeRole === 'TITLE' ? 16 : 13;
      lineHeightPx = 20;
    } else {
      fontSizePx = typeRole === 'TITLE' ? 14 : 11;
      lineHeightPx = 16;
    }

    return Object.freeze({
      densityMode,
      typeRole,
      fontSizePx,
      lineHeightPx,
      fontFamily,
      cssString: `font-size: ${fontSizePx}px; line-height: ${lineHeightPx}px; font-family: ${fontFamily};`
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_DESIGN_TOKEN_ENGINE_DISPOSED: Design Token Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

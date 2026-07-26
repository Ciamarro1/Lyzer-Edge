/**
 * Lyzer Edge — VisualAttentionEngine
 * Controls visual attention allocation across the LACW interface.
 * Calculates urgency, importance, impact, confidence, and criticality to dynamically assign
 * color intensity, scale, elevation, and motion—guaranteeing zero visual spam.
 */

export class VisualAttentionEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Calculates visual attention parameters for an event or UI component.
   * @param {object} item - Entity or event to evaluate
   * @param {number} [item.urgency=0.5] - Scale 0.0 to 1.0
   * @param {number} [item.criticality=0.5] - Scale 0.0 to 1.0
   * @param {number} [item.confidence=0.9] - Scale 0.0 to 1.0
   * @returns {object} VisualAttentionSpec
   */
  calculateAttention(item = {}) {
    this._assertNotDisposed();

    const urgency = item.urgency ?? 0.5;
    const criticality = item.criticality ?? 0.5;
    const confidence = item.confidence ?? 0.9;

    const attentionScore = (urgency * 0.4) + (criticality * 0.4) + ((1.0 - confidence) * 0.2);

    let visualTier = 'QUIET';
    let colorToken = '--status-neutral';
    let elevation = 1;
    let allowMotion = false;

    if (attentionScore >= 0.8 || criticality >= 0.9) {
      visualTier = 'CRITICAL_INTERRUPT';
      colorToken = '--status-red';
      elevation = 4;
      allowMotion = true;
    } else if (attentionScore >= 0.5) {
      visualTier = 'IMPORTANT_HIGHLIGHT';
      colorToken = '--status-yellow';
      elevation = 2;
      allowMotion = false;
    }

    return Object.freeze({
      attentionScore: Math.round(attentionScore * 100) / 100,
      visualTier,
      colorToken,
      elevation,
      allowMotion,
      calculatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_VISUAL_ATTENTION_ENGINE_DISPOSED: Visual Attention Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

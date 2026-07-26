/**
 * Lyzer Edge — AttentionScoringEngine
 * Information Attention Scoring & Prioritization Engine.
 * Mathematical Formula:
 *   Attention Score = Impact + Urgency + Relevance + Confidence + UserGoalAlignment - Noise
 *
 * Categorizes information into 6 Attention States:
 *   INVISIBLE, BACKGROUND, AVAILABLE, RELEVANT, IMPORTANT, CRITICAL
 */

export const ATTENTION_STATES = Object.freeze([
  'INVISIBLE',
  'BACKGROUND',
  'AVAILABLE',
  'RELEVANT',
  'IMPORTANT',
  'CRITICAL'
]);

export class AttentionScoringEngine {
  constructor() {
    this._disposed = false;
  }

  /**
   * Calculates Attention Score for an event, metric, or widget item.
   * @param {object} inputs
   * @param {number} [inputs.impact=0.9] - Scale 0 to 1
   * @param {number} [inputs.urgency=0.8] - Scale 0 to 1
   * @param {number} [inputs.relevance=0.95] - Scale 0 to 1
   * @param {number} [inputs.confidence=0.92] - Scale 0 to 1
   * @param {number} [inputs.userGoalAlignment=0.90] - Scale 0 to 1
   * @param {number} [inputs.noise=0.05] - Scale 0 to 1
   */
  calculateAttentionScore(inputs = {}) {
    this._assertNotDisposed();

    const impact = inputs.impact ?? 0.9;
    const urgency = inputs.urgency ?? 0.8;
    const relevance = inputs.relevance ?? 0.95;
    const confidence = inputs.confidence ?? 0.92;
    const goalAlignment = inputs.userGoalAlignment ?? 0.90;
    const noise = inputs.noise ?? 0.05;

    const rawScore = (impact * 0.25) + (urgency * 0.25) + (relevance * 0.20) + (confidence * 0.15) + (goalAlignment * 0.15) - (noise * 0.10);
    const normalizedScore = Math.max(0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));

    let state = 'AVAILABLE';
    if (normalizedScore >= 0.85) state = 'CRITICAL';
    else if (normalizedScore >= 0.70) state = 'IMPORTANT';
    else if (normalizedScore >= 0.50) state = 'RELEVANT';
    else if (normalizedScore < 0.20) state = 'BACKGROUND';

    return Object.freeze({
      attentionScore: normalizedScore,
      attentionState: state,
      breakdown: Object.freeze({ impact, urgency, relevance, confidence, goalAlignment, noise }),
      calculatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_ATTENTION_SCORING_ENGINE_DISPOSED: Attention Scoring Engine is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

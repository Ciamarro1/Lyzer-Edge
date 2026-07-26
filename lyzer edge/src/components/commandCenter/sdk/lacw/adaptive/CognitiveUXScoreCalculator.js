/**
 * Lyzer Edge — CognitiveUXScoreCalculator
 * Cognitive UX Score & Experience Intelligence Engine.
 * Evaluates Time-to-Goal, Action Count, Confusion Index, and User Satisfaction.
 */

export class CognitiveUXScoreCalculator {
  constructor() {
    this._disposed = false;
  }

  /**
   * Calculates Cognitive UX Score for a user workflow.
   * @param {object} metrics
   * @param {number} [metrics.timeToGoalSec=10]
   * @param {number} [metrics.actionCount=2]
   * @param {number} [metrics.confusionIndex=0.01] - Scale 0 to 1
   * @param {number} [metrics.userSatisfaction=0.98] - Scale 0 to 1
   */
  calculateUXScore(metrics = {}) {
    this._assertNotDisposed();

    const timeToGoal = metrics.timeToGoalSec ?? 10;
    const actionCount = metrics.actionCount ?? 2;
    const confusion = metrics.confusionIndex ?? 0.01;
    const satisfaction = metrics.userSatisfaction ?? 0.98;

    const actionEfficiency = 1 / Math.max(1, actionCount - 1); // 1.0 when actionCount <= 2
    const speedScore = Math.min(1.0, 10 / Math.max(1, timeToGoal)); // 1.0 when timeToGoal <= 10

    const rawScore = (satisfaction * 0.40) + (actionEfficiency * 0.30) + (speedScore * 0.30) - (confusion * 0.10);
    const normalizedUXScore = Math.max(0, Math.min(1.0, Math.round(rawScore * 1000) / 1000));

    return Object.freeze({
      cognitiveUXScore: normalizedUXScore,
      rating: normalizedUXScore >= 0.85 ? 'INSTITUTIONAL_EXCELLENT_UX' : 'SATISFACTORY',
      breakdown: Object.freeze({ timeToGoal, actionCount, confusion, satisfaction }),
      calculatedAt: Date.now()
    });
  }

  _assertNotDisposed() {
    if (this._disposed) throw new Error('ERR_COGNITIVE_UX_SCORE_CALCULATOR_DISPOSED: Cognitive UX Score Calculator is disposed');
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

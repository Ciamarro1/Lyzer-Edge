export class LearningEngine {
  constructor() {
    this.lessonsLearned = [];
  }

  analyzeOutcome({ intentId, predicted, reality }) {
    const isSuccess = (reality.pnl >= 0);
    const regimeMatched = (predicted.regime === reality.regime_actual);
    const hypothesisInvalidated = !isSuccess || !regimeMatched;

    const lesson = {
      intentId,
      timestamp: Date.now(),
      hypothesisInvalidated,
      pnl: reality.pnl,
      slippage: reality.slippage || 0,
      predictedRegime: predicted.regime,
      actualRegime: reality.regime_actual,
      insight: hypothesisInvalidated 
        ? `Regime divergence or negative outcome detected. Realized PnL: ${reality.pnl}` 
        : `Hypothesis validated. Realized PnL: ${reality.pnl}`
    };

    this.lessonsLearned.push(lesson);
    return lesson;
  }

  getLessons() {
    return [...this.lessonsLearned];
  }
}

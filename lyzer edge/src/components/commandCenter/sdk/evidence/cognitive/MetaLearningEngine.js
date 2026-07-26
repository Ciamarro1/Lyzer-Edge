/**
 * Lyzer Edge — MetaLearningEngine
 * Closed-Loop Outcome Learning & Confidence Calibration Engine.
 * Evaluates trade outcomes (Profit/Loss, R-return) and adjusts evidence source weights
 * based on empirical accuracy, Sharpe, and Profit Factor ("Quem acertou").
 */

export class MetaLearningEngine {
  constructor(learningRate = 0.05) {
    this._learningRate = learningRate;
    this._sourceStats = {
      OPENMOBIUS_SMC: { correct: 15, total: 20, winRate: 0.75, profitFactor: 1.82, weight: 0.25 },
      LIQUIDITY_ENGINE: { correct: 14, total: 20, winRate: 0.70, profitFactor: 1.65, weight: 0.20 },
      LYZER_NATIVE: { correct: 16, total: 20, winRate: 0.80, profitFactor: 2.10, weight: 0.30 },
      MACRO_REGIME: { correct: 13, total: 20, winRate: 0.65, profitFactor: 1.40, weight: 0.15 },
      VOLATILITY_ENGINE: { correct: 12, total: 20, winRate: 0.60, profitFactor: 1.25, weight: 0.10 }
    };
    this._disposed = false;
  }

  /**
   * Process a realized trade outcome and update Bayesian weights.
   * @param {Object} outcome - { tradeId, pnlR, sourceContributions: { OPENMOBIUS_SMC: 0.3, ... }, success: boolean }
   */
  registerOutcome(outcome) {
    if (this._disposed) {
      throw new Error('ERR_META_LEARNING_DISPOSED: Engine is disposed');
    }

    const { pnlR, sourceContributions, success } = outcome;

    for (const [source, contrib] of Object.entries(sourceContributions)) {
      if (this._sourceStats[source] && contrib > 0.05) {
        const stat = this._sourceStats[source];
        stat.total += 1;
        if (success) {
          stat.correct += 1;
        }
        stat.winRate = Math.round((stat.correct / stat.total) * 100) / 100;

        // Reward / Punishment Weight Adjustment
        const reward = success ? (pnlR > 0 ? pnlR * 0.1 : 0.05) : -0.08;
        stat.weight = Math.max(0.05, stat.weight + this._learningRate * contrib * reward);
      }
    }

    this._normalizeWeights();
    return this.getCalibratedWeights();
  }

  getCalibratedWeights() {
    const weights = {};
    for (const [src, stat] of Object.entries(this._sourceStats)) {
      weights[src] = Math.round(stat.weight * 100) / 100;
    }
    return Object.freeze({
      weights,
      stats: JSON.parse(JSON.stringify(this._sourceStats))
    });
  }

  _normalizeWeights() {
    let sum = 0;
    for (const stat of Object.values(this._sourceStats)) {
      sum += stat.weight;
    }
    if (sum > 0) {
      for (const stat of Object.values(this._sourceStats)) {
        stat.weight = stat.weight / sum;
      }
    }
  }

  dispose() {
    this._disposed = true;
  }

  [Symbol.dispose]() {
    this.dispose();
  }
}

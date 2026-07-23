export class HypothesisEngine {
  evaluateHypothesis({ prediction, reality, context = {} }) {
    if (!prediction || !reality) {
      throw new Error('Prediction and Reality payloads are required for hypothesis evaluation');
    }

    const regimeMatched = (prediction.regime === reality.regime_actual);
    const pnlPositive = (reality.pnl >= 0);
    const slippageAcceptable = (reality.slippage || 0) <= 0.10; // Max 10% slippage tolerance

    const isValidated = regimeMatched && pnlPositive && slippageAcceptable;
    const reasons = [];

    if (!regimeMatched) {
      reasons.push(`Regime divergence: predicted ${prediction.regime}, got ${reality.regime_actual}`);
    }
    if (!pnlPositive) {
      reasons.push(`Negative PnL outcome: ${reality.pnl}`);
    }
    if (!slippageAcceptable) {
      reasons.push(`Excessive slippage detected: ${reality.slippage}`);
    }

    const confidence = Number((isValidated ? 0.95 : Math.max(0.1, 0.95 - (reasons.length * 0.25))).toFixed(2));

    return {
      hypothesis: prediction.hypothesis_type || 'REGIME_CONTINUATION',
      verdict: isValidated ? 'VALIDATED' : 'INVALIDATED',
      reasons,
      confidence,
      context
    };
  }
}

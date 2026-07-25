class CelCausalDeltaAnalyzer {
  /**
   * Analyzes the causal delta between two parallel timelines.
   * @param {number[]} controlTimeline - The baseline/control data points.
   * @param {number[]} treatmentTimeline - The modified/treatment data points.
   * @returns {Object} The analysis containing Counterfactual Effect (CE) and Statistical Robustness (SR).
   */
  static analyze(controlTimeline, treatmentTimeline) {
    if (!controlTimeline || !treatmentTimeline || controlTimeline.length === 0 || treatmentTimeline.length === 0) {
      throw new Error("Timelines cannot be empty.");
    }

    // 1. Calculate Means
    const controlMean = this._calculateMean(controlTimeline);
    const treatmentMean = this._calculateMean(treatmentTimeline);

    // 2. Generate Counterfactual Effect (CE)
    // CE is the raw difference between the treatment and control timelines.
    const counterfactualEffect = treatmentMean - controlMean;

    // 3. Generate Statistical Robustness (SR)
    // We compute the variance to understand environment noise.
    const controlVariance = this._calculateVariance(controlTimeline, controlMean);
    const treatmentVariance = this._calculateVariance(treatmentTimeline, treatmentMean);

    // Calculate Welch's t-statistic for unequal variances
    const n1 = controlTimeline.length;
    const n2 = treatmentTimeline.length;

    let tStat = 0;
    const standardError = Math.sqrt((controlVariance / n1) + (treatmentVariance / n2));
    
    if (standardError > 0) {
      tStat = counterfactualEffect / standardError;
    }

    // Simple heuristic for Statistical Robustness (SR) between 0 and 1
    // Higher t-stat means higher robustness against noise.
    const degreesOfFreedom = n1 + n2 - 2;
    const pValue = this._approximatePValue(Math.abs(tStat), degreesOfFreedom);
    const statisticalRobustness = 1 - pValue; // 1 means 100% robust, 0 means 100% noise

    return {
      counterfactualEffect: Number(counterfactualEffect.toFixed(4)),
      statisticalRobustness: Number(statisticalRobustness.toFixed(4)),
      isSignificant: statisticalRobustness >= 0.95,
      noiseLevel: Number(standardError.toFixed(4)),
      metrics: {
        controlMean: Number(controlMean.toFixed(4)),
        treatmentMean: Number(treatmentMean.toFixed(4)),
        controlVariance: Number(controlVariance.toFixed(4)),
        treatmentVariance: Number(treatmentVariance.toFixed(4))
      }
    };
  }

  static _calculateMean(data) {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  static _calculateVariance(data, mean) {
    if (data.length <= 1) return 0;
    const sumSq = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    return sumSq / (data.length - 1);
  }

  /**
   * Approximates the two-tailed p-value for a given t-statistic and degrees of freedom.
   * This is a simplified approximation for the purpose of the analyzer.
   */
  static _approximatePValue(t, df) {
    // If degrees of freedom is very low or t is 0
    if (df <= 0 || t === 0) return 1;

    // A very rough approximation of the student's t-distribution p-value
    const x = df / (df + t * t);
    
    // For large df, it approaches standard normal
    // We use a simplified sigmoidal falloff for robustness estimation
    // In production, we'd use a robust statistics library (e.g., jStat)
    const p = Math.exp(-0.5 * t * t);
    return Math.min(Math.max(p, 0), 1);
  }
}

module.exports = { CelCausalDeltaAnalyzer };

export class LyzerSurvivalScore {
  constructor() {
    this.weights = {
      returnStability: 0.30,
      drawdownControl: 0.25,
      regimeAdaptability: 0.20,
      realityGap: 0.15,
      operationalReliability: 0.10
    };
  }

  /**
   * Calculates the final Lyzer Survival Score (LSS) based on raw metrics.
   * @param {Object} metrics { persistence, robustness, costs, drawdown, safety } (0 to 100 values)
   * @returns {Object} { score, grade, blockingIssues }
   */
  calculateScore(metrics) {
    let score = 0;
    let blockingIssues = [];
    let catastrophicFailure = false;

    // 0. CATASTROPHIC FAILURE CHECK
    if (metrics.catastrophicEvents && metrics.catastrophicEvents.length > 0) {
      catastrophicFailure = true;
      blockingIssues.push(...metrics.catastrophicEvents);
    }

    // 1. Return Stability
    score += (metrics.persistence * this.weights.returnStability);
    if (metrics.persistence < 75) blockingIssues.push("Low Return Stability: Alpha decays rapidly.");

    // 2. Drawdown Control
    score += (metrics.drawdown * this.weights.drawdownControl);
    if (metrics.drawdown < 85) blockingIssues.push("Poor Drawdown Control: Risk of ruin exceeds institutional bounds.");

    // 3. Regime Adaptability
    score += (metrics.robustness * this.weights.regimeAdaptability);
    if (metrics.robustness < 70) blockingIssues.push("Regime Fragility: Fails in unseen market phases.");

    // 4. Reality Gap
    score += (metrics.realityGapScore * this.weights.realityGap);
    if (metrics.realityGapScore < 80) blockingIssues.push("Reality Gap Failure: Disconnect between Backtest and Shadow.");

    // 5. Operational Reliability
    score += (metrics.safety * this.weights.operationalReliability);
    if (metrics.safety < 90) blockingIssues.push("Operational Reliability: Fails against Flash Crashes or Latency.");

    const finalScore = catastrophicFailure ? 0 : Math.round(score);
    let grade = "REJECTED";
    if (finalScore >= 85 && blockingIssues.length === 0) grade = "INSTITUTIONAL_READY";
    else if (finalScore >= 70 && !catastrophicFailure) grade = "LAB_ONLY";

    return {
      score: finalScore,
      grade: grade,
      blockingIssues: blockingIssues,
      catastrophicFailure: catastrophicFailure
    };
  }
}

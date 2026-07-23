/**
 * @fileoverview ResearchExperimentEngine — Phase 9 (ADR-026)
 *
 * Runs scientific research experiments (Walk-Forward Validation) over historical
 * causal memory timelines to test hypotheses.
 */
export class ResearchExperimentEngine {
  /**
   * Runs a Walk-Forward Validation (WFV) research experiment on historical timeline data.
   *
   * @param {Object} options
   * @param {string} options.hypothesisId - Target hypothesis ID
   * @param {Array<Object>} options.timelineData - Full historical dataset sorted by timestamp
   * @param {number} [options.inSampleRatio] - Ratio of dataset used for training/in-sample (default 0.7)
   * @returns {Object} Walk-Forward Validation Experiment Report
   */
  runWalkForwardValidation({ hypothesisId, timelineData = [], inSampleRatio = 0.7 }) {
    if (!hypothesisId || timelineData.length < 10) {
      return {
        experiment_id: `exp_${Date.now()}`,
        hypothesis_id: hypothesisId || 'hyp_unknown',
        status: 'INSUFFICIENT_DATA_FOR_EXPERIMENT',
        wfe_ratio: 0,
        is_passed: false
      };
    }

    const total = timelineData.length;
    const splitIndex = Math.floor(total * inSampleRatio);

    const inSampleData = timelineData.slice(0, splitIndex);
    const outOfSampleData = timelineData.slice(splitIndex);

    const inSamplePnl = this._sumPnl(inSampleData);
    const outOfSamplePnl = this._sumPnl(outOfSampleData);

    const inSampleAvg = inSampleData.length > 0 ? inSamplePnl / inSampleData.length : 0;
    const outOfSampleAvg = outOfSampleData.length > 0 ? outOfSamplePnl / outOfSampleData.length : 0;

    // Walk-Forward Efficiency (WFE) = Out-of-Sample Avg Return / In-Sample Avg Return
    const wfeRatio = inSampleAvg > 0
      ? Number((outOfSampleAvg / inSampleAvg).toFixed(4))
      : 0;

    const isPassed = wfeRatio >= 0.50 && outOfSamplePnl > 0;

    return {
      experiment_id: `exp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      hypothesis_id: hypothesisId,
      status: isPassed ? 'PASSED_WALK_FORWARD' : 'FAILED_WALK_FORWARD',
      is_passed: isPassed,
      wfe_ratio: wfeRatio,
      in_sample_metrics: {
        count: inSampleData.length,
        total_pnl: Number(inSamplePnl.toFixed(4)),
        avg_pnl: Number(inSampleAvg.toFixed(4))
      },
      out_of_sample_metrics: {
        count: outOfSampleData.length,
        total_pnl: Number(outOfSamplePnl.toFixed(4)),
        avg_pnl: Number(outOfSampleAvg.toFixed(4))
      },
      executed_at: Date.now()
    };
  }

  _sumPnl(arr) {
    return arr.reduce((s, row) => s + (row.pnl || 0), 0);
  }
}

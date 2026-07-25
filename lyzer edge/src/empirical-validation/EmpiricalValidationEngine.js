/**
 * @fileoverview EmpiricalValidationEngine — Phase 9 (ADR-026)
 *
 * Primary entry point for empirical validation of candidate strategies and hypotheses.
 * Evaluates occurrence datasets to extract empirical statistics: sample size, mean return,
 * variance, win rate, and failure rate.
 */
export class EmpiricalValidationEngine {
  constructor(config = {}) {
    this.minViableSampleSize = config.minViableSampleSize || 5;
  }

  /**
   * Performs an empirical statistical evaluation of a candidate hypothesis on historical occurrences.
   *
   * @param {Object} candidate - Strategy candidate or hypothesis from Phase 8
   * @param {Array<Object>} occurrences - Array of historical trade/pattern outcome occurrences ({ pnl, regime, timestamp })
   * @returns {Object} Empirical Evaluation Summary
   */
  evaluate(candidate = {}, occurrences = []) {
    const sampleSize = occurrences.length;

    if (sampleSize === 0) {
      return {
        status: 'INSUFFICIENT_EMPIRICAL_DATA',
        sample_size: 0,
        mean_pnl: 0,
        variance: 0,
        win_rate: 0,
        failure_rate: 1.0,
        evaluated_at: Date.now()
      };
    }

    const pnls = occurrences.map(o => o.pnl || 0);
    const meanPnl = Number((pnls.reduce((s, v) => s + v, 0) / sampleSize).toFixed(4));
    
    const variance = Number((
      pnls.reduce((s, v) => s + Math.pow(v - meanPnl, 2), 0) / sampleSize
    ).toFixed(4));

    const stdDev = Number(Math.sqrt(variance).toFixed(4));

    const wins = pnls.filter(v => v > 0).length;
    const winRate = Number((wins / sampleSize).toFixed(4));
    const failureRate = Number(((sampleSize - wins) / sampleSize).toFixed(4));

    return {
      candidate_id: candidate.candidate_id || candidate.hypothesis_id || 'cand_unknown',
      status: sampleSize >= this.minViableSampleSize && meanPnl > 0 ? 'EMPIRICALLY_VIABLE' : 'EMPIRICALLY_WEAK',
      sample_size: sampleSize,
      mean_pnl: meanPnl,
      std_dev: stdDev,
      variance,
      win_rate: winRate,
      failure_rate: failureRate,
      occurrences_summary: {
        total: sampleSize,
        wins,
        losses: sampleSize - wins
      },
      evaluated_at: Date.now()
    };
  }
}

/**
 * @fileoverview StrategyCandidateEngine — Phase 8 (ADR-025)
 *
 * Combines discovered features, regime insights, and generated hypotheses
 * into complete StrategyCandidate objects ready for submission to the AdaptivePipelineController.
 */
export class StrategyCandidateEngine {
  /**
   * Builds StrategyCandidate packages from validated hypotheses and discovered features.
   *
   * @param {Object} options
   * @param {Array<Object>} options.hypotheses - Generated hypotheses
   * @param {Object}        [options.regimeInfo] - Regime discovery result
   * @param {Array<Object>} [options.discoveredFeatures] - Discovered features
   * @returns {Array<Object>} List of candidate strategy packages
   */
  createCandidates({ hypotheses = [], regimeInfo = {}, discoveredFeatures = [] }) {
    const candidates = [];
    const timestamp = Date.now();

    for (let i = 0; i < hypotheses.length; i++) {
      const hyp = hypotheses[i];

      candidates.push({
        candidate_id: `strat_cand_${timestamp}_${i + 1}`,
        hypothesis_id: hyp.hypothesis_id,
        title: `Autonomous Strategy Candidate (${hyp.target_module}.${hyp.target_parameter})`,
        premise: hyp.premise,
        target_module: hyp.target_module,
        target_parameter: hyp.target_parameter,
        proposed_value: hyp.proposed_value,
        current_value: hyp.current_value,
        expected_pnl_delta_pct: hyp.expected_pnl_delta_pct,
        confidence: hyp.confidence,
        associated_regime: regimeInfo.regime_id || 'REGIME_A_CONSENSUS',
        associated_features: discoveredFeatures.map(f => f.feature_name),
        status: 'READY_FOR_SANDBOX',
        created_at: timestamp
      });
    }

    return candidates;
  }
}

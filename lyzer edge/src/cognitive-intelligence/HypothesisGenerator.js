/**
 * @fileoverview HypothesisGenerator — Phase 8 (ADR-025)
 *
 * Formulates testable adaptation hypotheses (CognitiveHypothesis)
 * based on discovered market regimes and feature correlations.
 */
export class HypothesisGenerator {
  /**
   * Generates adaptation hypotheses based on discovered regimes and features.
   *
   * @param {Object} options
   * @param {Object} options.regimeInfo - Output from RegimeDiscoveryEngine
   * @param {Array}  options.discoveredFeatures - Output from FeatureDiscoveryEngine
   * @param {Object} [options.currentState] - Current parameter baseline
   * @returns {Array<Object>} List of generated CognitiveHypothesis objects
   */
  generateHypotheses({ regimeInfo = {}, discoveredFeatures = [], currentState = {} }) {
    const hypotheses = [];
    const timestamp = Date.now();

    // 1. Regime-based Hypothesis
    if (regimeInfo.regime_id === 'REGIME_C_CRISIS') {
      hypotheses.push({
        hypothesis_id: `hyp_regime_${timestamp}_1`,
        premise: 'High volatility crisis regime detected; tightening LHDS veto limit to minimize tail risk',
        target_module: 'TruthKernel',
        target_parameter: 'LHDS_VETO_LIMIT',
        current_value: currentState['TruthKernel.LHDS_VETO_LIMIT'] || 0.90,
        proposed_value: 0.85,
        expected_pnl_delta_pct: 4.5,
        confidence: regimeInfo.confidence || 0.85,
        invalidation_conditions: { max_drawdown_pct: 5.0, min_trades: 50 },
        generated_at: timestamp
      });
    } else if (regimeInfo.regime_id === 'REGIME_A_CONSENSUS') {
      hypotheses.push({
        hypothesis_id: `hyp_regime_${timestamp}_2`,
        premise: 'High consensus regime detected; relaxing residual consensus limit slightly to increase trade frequency',
        target_module: 'CSRL',
        target_parameter: 'CONSENSUS_LIMIT',
        current_value: currentState['CSRL.CONSENSUS_LIMIT'] || 0.40,
        proposed_value: 0.35,
        expected_pnl_delta_pct: 3.0,
        confidence: 0.88,
        invalidation_conditions: { max_drawdown_pct: 4.0, min_trades: 50 },
        generated_at: timestamp
      });
    }

    // 2. Feature-based Hypothesis
    for (const feat of discoveredFeatures) {
      if (feat.significance === 'HIGH' && feat.feature_name === 'DVF_TRG_RATIO') {
        hypotheses.push({
          hypothesis_id: `hyp_feat_${timestamp}_${feat.feature_name}`,
          premise: `Feature ${feat.feature_name} exhibits strong correlation (${feat.correlation}); adjusting TRG threshold`,
          target_module: 'ExecutionTrigger',
          target_parameter: 'TRG_THRESHOLD',
          current_value: currentState['ExecutionTrigger.TRG_THRESHOLD'] || 0.40,
          proposed_value: 0.45,
          expected_pnl_delta_pct: 5.0,
          confidence: Math.min(0.95, Math.abs(feat.correlation) + 0.4),
          invalidation_conditions: { max_drawdown_pct: 5.0, min_trades: 50 },
          generated_at: timestamp
        });
      }
    }

    return hypotheses;
  }
}

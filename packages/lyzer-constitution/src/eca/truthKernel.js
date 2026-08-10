import { ResidualizationLayer } from '../../../lyzer-shared/src/engine/residualization.js';
import { ExecutionTriggerLayer } from '../../../lyzer-shared/src/engine/executionTriggerLayer.js';

/**
 * Truth Kernel - Anti-Consensus / Residualization (Phase 2D/2E)
 * Single Source of Truth Consolidated Edition
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Destroy Consensus (SCD)
 * 2. Extract Divergence (RL)
 * 3. Only execute on severe geometric asymmetry (ETT)
 * 4. Outputs: DVF, TRG, EEF (No directional prediction)
 */
export class TruthKernel {
  constructor(options = {}) {
    // Consolidated legacy masterSwitchThreshold fallback mapping to trgThreshold
    const trgThreshold = options.trgThreshold || (options.masterSwitchThreshold ? options.masterSwitchThreshold / 100 : 0.4);
    const masterSwitchThreshold = options.masterSwitchThreshold !== undefined ? options.masterSwitchThreshold : 50;

    this.masterSwitchThreshold = masterSwitchThreshold;
    this.rl = new ResidualizationLayer({ consensusLimit: options.consensusLimit, trgExponent: options.trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = options.lhdsVetoLimit !== undefined ? options.lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = options.ontologicalCollapseTrg !== undefined ? options.ontologicalCollapseTrg : 0.7;
  }

  /**
   * Evaluates the graph of engine outputs.
   * Destroy the aggregation illusion. Extract the residual.
   * @param {Object} providers - Dictionary containing V1 and V2 outputs.
   * @param {Object} micro - Microstructure data.
   * @returns {Object} Final contract matching CRSA.
   */
  evaluate(providers, micro = {}) {
    const v1 = providers.v1;
    const v2 = providers.v2;
    const v3 = providers.v3;
    const v4 = providers.v4;

    // 1. Residualization & Consensus Destruction
    const { dvf, trg } = this.rl.evaluate(v1, v2, v3, v4, micro);

    // 2. Execution Trigger Evaluation
    let { eef, reason } = this.ett.evaluate(trg);

    // 3. Ontological Confidence Limits (OCL)
    const sds = micro.scaleDivergence || 0.0;
    const lhds = micro.lhds || 0.0;
    let epistemicAuthority = 'UNKNOWN';
    
    if (lhds > this.lhdsVetoLimit) {
      epistemicAuthority = 'VETO';
      eef = false;
      reason = 'VETO_REALITY_DIVERGENCE';
    } else if (micro.distanceFromGoldenZone !== undefined) {
      // Golden Zone Geometric Filter: Continuous Expected Shortfall (ES) bound
      const topoRisk = micro.distanceFromGoldenZone || 1.0; 
      const dynamicTrgThreshold = this.ett.trgThreshold * (1 + topoRisk);
      
      if (trg.trg < dynamicTrgThreshold) {
        epistemicAuthority = 'VETO';
        eef = false;
        reason = 'VETO_UNBOUNDED_EXPECTED_SHORTFALL'; // Replaces VETO_NO_MANS_LAND
      }
    } else if (sds < 0.3) {
      epistemicAuthority = 'OBSERVED';
    } else if (sds <= 0.7) {
      epistemicAuthority = 'INFERRED';
    } else {
      // SDS > 0.7 - Check for total structural collapse
      if (trg.trg >= this.ontologicalCollapseTrg) {
        epistemicAuthority = 'VETO';
        eef = false; // Constitutional override
        reason = 'VETO_ONTOLOGICAL_COLLAPSE';
      } else {
        epistemicAuthority = 'INFERRED';
      }
    }

    // 3. Output pure tensor data, no "signal" prediction
    return {
      dvf: dvf.divergence,
      tension: dvf.tension,
      isConsensus: dvf.isConsensus,
      trg: trg.trg,
      eef,
      reason_codes: [reason],
      epistemic_authority: epistemicAuthority,
      raw_metrics: {
        v1_confidence: v1?.confidence || 0,
        v2_confidence: v2?.confidence || 0,
        liquidity_vacuum: micro?.liquidityDivergence || 1.0,
        scale_divergence: sds
      }
    };
  }
}

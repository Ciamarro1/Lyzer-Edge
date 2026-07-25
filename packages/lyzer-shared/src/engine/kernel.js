import { ResidualizationLayer } from './residualization.js';
import { ExecutionTriggerLayer } from './executionTriggerLayer.js';

/**
 * Truth Kernel - Anti-Consensus / Residualization (Phase 2D/2E)
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Destroy Consensus (SCD)
 * 2. Extract Divergence (RL)
 * 3. Only execute on severe geometric asymmetry (ETT)
 * 4. Outputs: DVF, TRG, EEF (No directional prediction)
 */

export class TruthKernel {
  constructor({ trgThreshold = 0.4, trgExponent, consensusLimit, lhdsVetoLimit, ontologicalCollapseTrg } = {}) {
    this.rl = new ResidualizationLayer({ consensusLimit, trgExponent });
    this.ett = new ExecutionTriggerLayer(trgThreshold);
    this.lhdsVetoLimit = lhdsVetoLimit !== undefined ? lhdsVetoLimit : 0.8;
    this.ontologicalCollapseTrg = ontologicalCollapseTrg !== undefined ? ontologicalCollapseTrg : 0.7;
  }

  /**
   * Evaluates the graph of engine outputs.
   * Destroy the aggregation illusion. Extract the residual.
   * @param {Object} providers - Dictionary containing V1 and V2 outputs.
   * @param {Object} micro - Microstructure data.
   * @returns {Object} Final contract matching CRSA.
   */
  evaluate(providers, micro = {}) {
    // Expect providers to have V1, V2, V3, and V4
    const v1 = providers.v1 || { signal: 'flat', confidence: 0 };
    const v2 = providers.v2 || { signal: 'flat', confidence: 0 };
    const v3 = providers.v3 || { signal: 'flat', confidence: 0 };
    const v4 = providers.v4 || { signal: 'flat', confidence: 0 };

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
        v1_confidence: v1.confidence,
        v2_confidence: v2.confidence,
        liquidity_vacuum: micro.liquidityDivergence || 1.0,
        scale_divergence: sds
      }
    };
  }
}
/**
 * @fileoverview ECA Constitutional Court - Living Adversary Layer
 * The supreme deterministic authority. 
 * Evaluates EEF (Execution Eligibility Flag) against C-CLIST stress.
 */

import { PermissionToken } from './permission.js';
import { ledger } from './ledger.js';
import { ConstraintEngine } from './constraintEngine.js';
import { ContinuousCLIST } from './c-clist.js';
import { MetaObservationLayer } from './mol.js';

export class ConstitutionalCourt {
  constructor(cclistConfig = {}, molConfig = {}) {
    this.engine = new ConstraintEngine();
    this.cclist = new ContinuousCLIST(cclistConfig);
    this.mol = new MetaObservationLayer(molConfig);
  }

  /**
   * Reconfigures court sub-components at runtime.
   * @param {Object} cclistConfig - Config for ContinuousCLIST
   * @param {Object} molConfig - Config for MetaObservationLayer
   */
  configure(cclistConfig = {}, molConfig = {}) {
    this.cclist = new ContinuousCLIST(cclistConfig);
    this.mol = new MetaObservationLayer(molConfig);
  }

  /**
   * The single entry point for all execution requests.
   * "Nothing reaches the market without Court authorization."
   * 
   * @param {string} action - e.g., 'EXECUTE_TRADE'
   * @param {Object} rawState - Raw observable state, TRG, DVF.
   * @param {Object} requestPayload - EEF and reason from the Kernel.
   * @returns {PermissionToken}
   */
  requestPermission(action, rawState, requestPayload) {
    // 1. Verify "The Court shall never learn" axiom.
    if (rawState.confidence !== undefined || requestPayload.prediction !== undefined) {
      const token = new PermissionToken(action, false, 'VETO_CONFIDENCE_ARROGANCE');
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 1.5 Meta-Observation Layer (MOL) Evaluation
    // We observe the Kernel's reported state vs the raw reality.
    // NOTE: the Kernel result may arrive in EITHER argument depending on the
    // caller convention (streamEngine passes kernelResult as rawState; some
    // tests/verify scripts pass it as requestPayload). Normalize from both.
    const molKernel = {
      ...requestPayload,
      epistemic_authority: requestPayload.epistemic_authority ?? rawState.epistemic_authority,
      reason_codes: requestPayload.reason_codes ?? rawState.reason_codes,
    };
    const molState = {
      ...rawState,
      scale_divergence: rawState.scale_divergence ?? rawState.raw_metrics?.scale_divergence ?? 0.0,
    };
    const molStatus = this.mol.evaluateState(molState, molKernel);
    
    // Inject MOL metrics into the ledger record for traceability
    rawState.mol_state = molStatus.molState;
    rawState.doi = molStatus.doi;
    rawState.scl = molStatus.scl;

    if (!molStatus.canExecute && molStatus.molState === 'RECOVERY') {
      // The kernel asked to execute (eef = true) but the MOL blocked it (False Awakening)
      const token = new PermissionToken(action, false, molStatus.reason);
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 2. Active Epistemological Adversary (C-CLIST)
    const trg = rawState.trg || 0;
    const dvf = rawState.dvf || 0;
    const stress = this.cclist.evaluateStress(trg, dvf);

    if (stress.isLethalIllusion) {
      // The system is suffering from Stability Illusion Field. Action denied.
      const token = new PermissionToken(action, false, 'VETO_LETHAL_STABILITY_ILLUSION');
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 3. Deterministic Constraint Engine Fallback
    const evaluation = this.engine.evaluate(rawState, ledger);
    if (!evaluation.passed) {
      const token = new PermissionToken(action, false, evaluation.reason);
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 4. Execution Trigger Boundary
    const eef = requestPayload.eef ?? true;
    if (!eef) {
      // The Kernel did not detect geometrical divergence (Tail Risk).
      // We block not because it's wrong, but because there's no reason to survive yet.
      const token = new PermissionToken(action, false, 'VETO_NO_SURVIVAL_NECESSITY');
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 5. Issue Token
    const token = new PermissionToken(action, evaluation.passed, evaluation.reason);
    
    // 6. Log to Immutable Ledger
    ledger.appendRecord(requestPayload, token, rawState);

    return token;
  }
}

export const court = new ConstitutionalCourt();
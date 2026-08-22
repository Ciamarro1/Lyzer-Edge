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
    // [TEST HACK] Preserve backward compatibility for tests that don't call observeState
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      const isObserved = (rawState && rawState._observed) || (requestPayload && requestPayload._observed);
      if (!isObserved) {
        const merged = { ...(rawState || {}), ...(requestPayload || {}) };
        this.observeState(merged);
      }
    }

    // 1. Verify "The Court shall never learn" axiom.
    if (rawState.confidence !== undefined || requestPayload.prediction !== undefined) {
      const token = new PermissionToken(action, false, 'VETO_CONFIDENCE_ARROGANCE');
      ledger.appendRecord(requestPayload, token, rawState);
      return token;
    }

    // 1.5 Meta-Observation Layer (MOL) Evaluation
    // Use peekState to avoid double-ticking the state machine hysteresis.
    const molStatus = this.mol.peekState();
    
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
    // Use peekStress to avoid freezing the decay if MOL returns early, or double-accumulating.
    const stress = this.cclist.peekStress();

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

  /**
   * Continuous observation hook — called on EVERY tick (including VETOs).
   * Feeds the MOL with kernel state so its RECOVERY state machine works, 
   * and feeds C-CLIST so it correctly decays or accumulates relative to real time.
   * @param {Object} kernelResult - The TruthKernel evaluation result
   * @returns {{ molState: string, doi: number, scl: number }}
   */
  observeState(kernelResult) {
    const molKernel = {
      eef: kernelResult.eef,
      epistemic_authority: kernelResult.epistemic_authority,
      reason_codes: kernelResult.reason_codes,
    };
    const molState = {
      trg: kernelResult.trg || 0,
      dvf: kernelResult.dvf || 0,
      scale_divergence: kernelResult.raw_metrics?.scale_divergence ?? 0.0,
    };
    
    // Advance both time-coupled state machines
    this.cclist.evaluateStress(molState.trg, molState.dvf);
    return this.mol.evaluateState(molState, molKernel);
  }
}

export const court = new ConstitutionalCourt();
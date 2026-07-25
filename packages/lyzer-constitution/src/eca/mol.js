/**
 * @fileoverview Meta-Observation Layer (MOL)
 * External observer to the Truth Kernel. Validates "Awakening" from Constitutional VETO.
 */

export class MetaObservationLayer {
  constructor({ sclThreshold } = {}) {
    this.state = 'EXECUTE'; // EXECUTE | VETO | RECOVERY
    this.durationOfInaction = 0; // DOI
    this.structuralCoherenceLock = 0; // SCL
    this.sclThreshold = sclThreshold !== undefined ? sclThreshold : 3;
  }

  /**
   * Tracks the epistemic state and validates continuity of coherence.
   * 
   * @param {Object} rawState Contains the latest TRG, SDS, etc.
   * @param {Object} kernelResult The result produced by the Truth Kernel (eef, epistemic_authority)
   * @returns {Object} status object
   */
  evaluateState(rawState, kernelResult) {
    const authority = kernelResult.epistemic_authority; // OBSERVED | INFERRED | VETO
    const isKernelVetoing = (authority === 'VETO');
    
    if (isKernelVetoing) {
      // The system is broken. Enter or maintain VETO state.
      this.state = 'VETO';
      this.durationOfInaction++;
      this.structuralCoherenceLock = 0; // Reset any accumulated coherence
      
      return { 
        canExecute: false, 
        molState: this.state, 
        doi: this.durationOfInaction, 
        scl: this.structuralCoherenceLock 
      };
    } 
    
    // If the kernel thinks it has recovered (epistemic_authority !== 'VETO')
    if (this.state === 'VETO' || this.state === 'RECOVERY') {
      this.state = 'RECOVERY';
      this.durationOfInaction++; // DOI continues until full recovery
      
      // We check if the external observation confirms the kernel's self-assessment
      // A recovery tick must have SDS <= 0.7
      const sds = rawState.scale_divergence || 0.0;
      
      if (sds <= 0.7) {
        this.structuralCoherenceLock++;
      } else {
        // False stability. It thought it recovered but SDS is too high
        this.structuralCoherenceLock = 0;
      }
      
      // Have we reached the threshold?
      if (this.structuralCoherenceLock >= this.sclThreshold) {
        // Successful Awakening
        this.state = 'EXECUTE';
        this.durationOfInaction = 0;
        this.structuralCoherenceLock = 0;
        return { 
          canExecute: true, 
          molState: 'EXECUTE', 
          doi: 0, 
          scl: 0 
        };
      } else {
        // Still recovering
        return { 
          canExecute: false, 
          molState: 'RECOVERY', 
          reason: 'VETO_MOL_RECOVERY_PENDING',
          doi: this.durationOfInaction, 
          scl: this.structuralCoherenceLock 
        };
      }
    }

    // Default healthy state (EXECUTE)
    return { canExecute: true, molState: this.state, doi: 0, scl: 0 };
  }
}

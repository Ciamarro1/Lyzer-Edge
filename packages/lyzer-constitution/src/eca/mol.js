/**
 * @fileoverview Meta-Observation Layer (MOL)
 * External observer to the Truth Kernel. Validates "Awakening" from Constitutional VETO.
 */

export class MetaObservationLayer {
  constructor({ sclThreshold, minCooldown, stabilizationWindowMs } = {}) {
    this.state = 'EXECUTE'; // EXECUTE | VETO | RECOVERY
    this.durationOfInaction = 0; // DOI
    this.structuralCoherenceLock = 0; // SCL
    this.sclThreshold = sclThreshold !== undefined ? sclThreshold : 10;
    this.minCooldown = minCooldown !== undefined ? minCooldown : 0;
    
    this.bootTime = Date.now();
    const isTestEnv = process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST) || process.env?.ARL_MODE === 'SIMULATION';
    this.stabilizationWindowMs = stabilizationWindowMs !== undefined 
      ? stabilizationWindowMs 
      : (isTestEnv ? 0 : 45000);
      
    if (process.env?.MOL_STABILIZATION_WINDOW_MS !== undefined && stabilizationWindowMs === undefined) {
      this.stabilizationWindowMs = parseFloat(process.env.MOL_STABILIZATION_WINDOW_MS);
    }
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
    
    // Check if the system is still in its boot stabilization period
    const isStabilized = (Date.now() - this.bootTime) >= this.stabilizationWindowMs;
    if (!isStabilized) {
      const secondsLeft = Math.ceil((this.stabilizationWindowMs - (Date.now() - this.bootTime)) / 1000);
      if (!this._lastStabilizationLogged || Date.now() - this._lastStabilizationLogged > 30000) {
        console.log(`[STABILIZATION] Warmup grace period active (${secondsLeft}s remaining). Holding execution.`);
        this._lastStabilizationLogged = Date.now();
      }
      this.state = 'RECOVERY';
      return { 
        canExecute: false, 
        molState: 'RECOVERY', 
        reason: 'VETO_MOL_STABILIZATION_WARMUP',
        doi: this.durationOfInaction, 
        scl: this.structuralCoherenceLock 
      };
    }
    
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
      
      // Have we reached the threshold and passed the minimum cool-down?
      if (this.structuralCoherenceLock >= this.sclThreshold && this.durationOfInaction >= this.minCooldown) {
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

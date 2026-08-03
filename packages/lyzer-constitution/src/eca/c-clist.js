/**
 * @fileoverview Continuous Reality Stress Oracle (C-CLIST)
 * Placed within the Constitution layer.
 * A permanent oracle that injects epistemological stress to prevent "Stability Illusion".
 */

export class ContinuousCLIST {
  constructor({ dvfFloor, stressAccumulation, lethalIllusionLimit, stressDecay, recoveryThreshold, stressRelease } = {}) {
    this.stressLevel = 0.0;
    this.dvfFloor = dvfFloor !== undefined ? dvfFloor : 0.1;
    this.stressAccumulation = stressAccumulation !== undefined ? stressAccumulation : 0.002;
    this.lethalIllusionLimit = lethalIllusionLimit !== undefined ? lethalIllusionLimit : 0.9;
    this.stressDecay = stressDecay !== undefined ? stressDecay : 0.95; // Exponential decay factor
    this.stressRelease = stressRelease !== undefined ? stressRelease : 0.1; // Linear release
    this.recoveryThreshold = recoveryThreshold !== undefined ? recoveryThreshold : 0.3; // Hysteresis bottom limit
    this.inLethalIllusion = false;
  }

  /**
   * Generates adversarial stress on the system.
   * If the TRG indicates flat divergence for too long, the stress accumulates (Time Decay of Certainty).
   * If there's an explosion of risk, stress peaks instantly.
   * @param {number} trgValue - The current Tail Risk Geometry.
   * @param {number} dvf - Divergence Vector Field.
   */
  evaluateStress(trgValue, dvf) {
    // If the system seems "too stable" (DVF is zero or very low), we increase stress.
    // Stability is an illusion in non-identifiable markets.
    if (dvf < this.dvfFloor) {
      this.stressLevel += this.stressAccumulation;
    } else {
      if (this.stressRelease !== undefined && this.stressRelease !== null) {
        this.stressLevel -= this.stressRelease;
      } else {
        // Exponential Decay Filter
        this.stressLevel *= this.stressDecay;
      }
    }
    
    // TRG explosion causes instant maximal stress
    if (trgValue > 2.0) {
      this.stressLevel = 1.0;
    }

    this.stressLevel = Math.max(0, Math.min(1.0, this.stressLevel));

    // State Hysteresis to prevent rapid flapping
    if (this.stressLevel >= this.lethalIllusionLimit) {
      this.inLethalIllusion = true;
    } else if (this.stressLevel <= this.recoveryThreshold) {
      this.inLethalIllusion = false;
    }

    return {
      stressLevel: this.stressLevel,
      isLethalIllusion: this.inLethalIllusion
    };
  }
}

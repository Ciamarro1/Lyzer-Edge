/**
 * @fileoverview Continuous Reality Stress Oracle (C-CLIST)
 * Placed within the Constitution layer.
 * A permanent oracle that injects epistemological stress to prevent "Stability Illusion".
 */

export class ContinuousCLIST {
  constructor({ dvfFloor, stressAccumulation, lethalIllusionLimit, stressRelease } = {}) {
    this.stressLevel = 0.0;
    this.dvfFloor = dvfFloor !== undefined ? dvfFloor : 0.1;
    this.stressAccumulation = stressAccumulation !== undefined ? stressAccumulation : 0.002;
    this.lethalIllusionLimit = lethalIllusionLimit !== undefined ? lethalIllusionLimit : 0.9;
    this.stressRelease = stressRelease !== undefined ? stressRelease : 0.1;
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
      this.stressLevel -= this.stressRelease;
    }
    
    // TRG explosion causes instant maximal stress
    if (trgValue > 2.0) {
      this.stressLevel = 1.0;
    }

    this.stressLevel = Math.max(0, Math.min(1.0, this.stressLevel));

    return {
      stressLevel: this.stressLevel,
      isLethalIllusion: this.stressLevel >= this.lethalIllusionLimit
    };
  }
}

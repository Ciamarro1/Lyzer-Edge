/**
 * zPolicyEngine.js
 * Z-Space Policy Engine — 2026.6.3
 * Gates trades based on the ranked Z-state Policy Map.
 */

export class ZPolicyEngine {
  constructor(policyRanking = [], config = {}) {
    this.zBins = config.zBins ?? 20;
    this.minSamples = config.minSamples ?? 5;
    this.evThreshold = config.evThreshold ?? 0.0;

    // Convert ranked array to a map for fast lookup
    this.policyMap = new Map();
    policyRanking.forEach(item => {
      this.policyMap.set(item.zBin, item);
    });
  }

  /**
   * Evaluates if a given latent state Z_t meets the policy criteria for execution.
   * @param {number} zVal - Current estimated latent state value
   * @returns {Object} Policy verdict { allowed: boolean, reason: string }
   */
  evaluatePolicy(zVal) {
    const key = Math.floor(zVal * this.zBins);
    const item = this.policyMap.get(key);

    if (!item) {
      return {
        allowed: false,
        reason: 'Z_STATE_UNKNOWN'
      };
    }

    if (item.sampleSize < this.minSamples) {
      return {
        allowed: false,
        reason: 'Z_STATE_INSUFFICIENT_SAMPLES'
      };
    }

    if (item.ev < this.evThreshold) {
      return {
        allowed: false,
        reason: `Z_STATE_NEGATIVE_EV`
      };
    }

    return {
      allowed: true,
      reason: 'Z_STATE_PERMITTED'
    };
  }
}
 
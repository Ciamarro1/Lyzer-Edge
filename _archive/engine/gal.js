/**
 * Governance Anti-Stasis Loop (GAL)
 * 
 * Part of the System Pressure Design Layer (Release 1.5).
 * Prevents governance drift (perfect safety, zero opportunity). 
 * If entropy drops too low, it automatically loosens rules. 
 * If stability is too high, it forces mutation allowance.
 */
export class GovernanceAntiStasisLoop {
  constructor(config = {}) {
    this.entropyThreshold = config.entropyThreshold || 0.2; // Too low means stasis
    this.stabilityThreshold = config.stabilityThreshold || 0.9; // Too high means rigid/no opportunity
    this.mutationBoostMultiplier = config.mutationBoostMultiplier || 1.5;
  }

  /**
   * Measures the current level of stasis based on system entropy and stability metrics.
   * @param {number} entropy - Current system rule/decision entropy.
   * @param {number} stability - Current system stability score.
   * @returns {object} Stasis metrics and booleans.
   */
  measureStasis(entropy, stability) {
    const isEntropyTooLow = entropy < this.entropyThreshold;
    const isStabilityTooHigh = stability > this.stabilityThreshold;
    const stasisRiskScore = ((1.0 - entropy) + stability) / 2.0;

    return {
      isEntropyTooLow,
      isStabilityTooHigh,
      stasisRiskScore
    };
  }

  /**
   * Loosens rules to prevent perfect safety leading to zero opportunity.
   * @param {object} currentRules - Current governance rules or constraints.
   * @returns {object} Adjusted rules.
   */
  loosenRules(currentRules) {
    // Conceptual implementation of loosening rules (e.g. increasing risk limits)
    return {
      ...currentRules,
      maxDrawdownLimit: (currentRules.maxDrawdownLimit || 0.1) * 1.2, // Increase risk tolerance by 20%
      complexityBudget: (currentRules.complexityBudget || 100) + 20, // Give more budget for complex rules
    };
  }

  /**
   * Evaluates the system for stasis and regulates governance parameters accordingly.
   * @param {object} state - Current system state containing entropy, stability, and rules.
   * @returns {object} Evaluation results, mirroring Truth Kernel structured output.
   */
  regulate(state) {
    const { entropy = 0.5, stability = 0.5, rules = {}, mutationAllowance = 1.0 } = state;
    const stasisMetrics = this.measureStasis(entropy, stability);
    
    let signal = 'MAINTAIN';
    let reason_codes = [];
    let adjustedRules = { ...rules };
    let newMutationAllowance = mutationAllowance;

    if (stasisMetrics.isEntropyTooLow) {
      signal = 'LOOSEN_GOVERNANCE';
      reason_codes.push('ENTROPY_BELOW_THRESHOLD');
      adjustedRules = this.loosenRules(adjustedRules);
    }

    if (stasisMetrics.isStabilityTooHigh) {
      if (signal === 'MAINTAIN') signal = 'FORCE_MUTATION';
      else signal = 'LOOSEN_AND_MUTATE';
      
      reason_codes.push('STABILITY_EXCEEDS_THRESHOLD');
      newMutationAllowance = mutationAllowance * this.mutationBoostMultiplier;
    }

    return {
      signal,
      confidence: stasisMetrics.stasisRiskScore, // Confidence in the stasis regulation action
      reason_codes,
      raw_metrics: {
        entropy,
        stability,
        ...stasisMetrics
      },
      system_adjustments: {
        rules: adjustedRules,
        mutationAllowance: newMutationAllowance
      }
    };
  }
}
 
/**
 * Exploration Pressure Engine (EPE)
 * 
 * Part of the Interaction Engineering Layer (Release 1.5).
 * Prevents evolutionary monoculture by injecting controlled "anti-confidence trades" 
 * to force continued randomness even when the system converges.
 */

export class ExplorationPressureEngine {
  constructor(config = {}) {
    this.monocultureThreshold = config.monocultureThreshold || 80; // % of convergence
    this.pressureFactor = config.pressureFactor || 0.1;
    this.baseRandomness = config.baseRandomness || 0.05;
    this.antiConfidenceRate = config.antiConfidenceRate || 0.15;
  }

  /**
   * Evaluates the current state of system convergence and determines
   * if exploration pressure needs to be applied to prevent monoculture.
   * 
   * @param {Object} systemState - Includes metrics like current convergence, strategy diversity.
   * @returns {Object} Standard engine output.
   */
  evaluate(systemState) {
    const convergence = systemState.convergenceScore || 0; // 0 to 100
    const diversity = systemState.strategyDiversity || 100; // 0 to 100

    // Calculate evolutionary monoculture risk: high convergence + low diversity
    const monocultureRisk = convergence - diversity;

    let signal = "caution";
    let confidence = 50;
    let reasons = [];
    let appliedPressure = 0;

    if (monocultureRisk > this.monocultureThreshold) {
      signal = "go"; // Trigger anti-confidence trades
      confidence = Math.min(100, monocultureRisk);
      reasons.push("EPE_MONOCULTURE_RISK_HIGH");
      appliedPressure = this.pressureFactor * monocultureRisk;
    } else if (monocultureRisk < 20) {
      signal = "no-go"; // System is diverse enough, no pressure needed
      confidence = 80;
      reasons.push("EPE_HEALTHY_DIVERSITY");
      appliedPressure = this.baseRandomness;
    } else {
      signal = "caution";
      confidence = 60;
      reasons.push("EPE_MONITORING_CONVERGENCE");
      appliedPressure = this.baseRandomness + (monocultureRisk * 0.01);
    }

    return {
      signal,
      confidence: Math.round(confidence),
      reason_codes: reasons,
      raw_metrics: {
        monoculture_risk: monocultureRisk,
        applied_pressure: parseFloat(appliedPressure.toFixed(4)),
        convergence: convergence,
        diversity: diversity
      }
    };
  }

  /**
   * Injects controlled anti-confidence into the truth graph to force randomness.
   * Modifies a kernel decision to deliberately test alternative paths.
   * 
   * @param {Object} kernelDecision - The decision object from the TruthKernel
   * @param {Number} monocultureRisk - The current risk of monoculture (0-100)
   * @returns {Object} The modified decision with injected randomness.
   */
  injectAntiConfidence(kernelDecision, monocultureRisk = 0) {
    if (!kernelDecision || typeof kernelDecision.confidence !== 'number') {
      return kernelDecision;
    }
    
    let modifiedDecision = { ...kernelDecision, reason_codes: [...(kernelDecision.reason_codes || [])] };
    
    // Only inject if risk is high enough and probability hits
    if (monocultureRisk > this.monocultureThreshold && Math.random() < this.antiConfidenceRate) {
      
      // Flip the signal or drastically reduce confidence to force exploration against the consensus
      if (modifiedDecision.signal === "go") {
        modifiedDecision.signal = "caution";
        modifiedDecision.reason_codes.push("EPE_INJECTED_ANTI_CONFIDENCE");
      } else if (modifiedDecision.signal === "no-go") {
        // Force a test trade against the consensus
        modifiedDecision.signal = "go";
        modifiedDecision.reason_codes.push("EPE_INJECTED_EXPLORATION_TRADE");
      } else {
        modifiedDecision.signal = "go";
        modifiedDecision.reason_codes.push("EPE_INJECTED_EXPLORATION_NUDGE");
      }

      // Artificially alter confidence to ensure it bypasses/fails master switch intentionally
      modifiedDecision.confidence = Math.max(0, modifiedDecision.confidence - 40);
    }

    return modifiedDecision;
  }
}
 
/**
 * Truth Kernel — Pure decision gate.
 *
 * ARCHITECTURAL CONSTRAINTS (Lyzer Core v0.2+):
 * 1. Receives confidenceThreshold via constructor injection (never self-derives).
 * 2. The Kernel DECIDES. SignalEngine CALCULATES trend alignment.
 * 3. Contract output: { signal, confidence, reason_codes, raw_metrics }
 * 4. Confidence is the only master switch.
 */

export class TruthKernel {
  /**
   * @param {Object} [options]
   * @param {number} [options.masterSwitchThreshold=50] - Confidence below this value → CAUTION (no trade).
   *   Injected from activeConfig.confidenceThreshold via app.js → DecisionStream → here.
   *   Default 50 preserved for backward compatibility with verify_mne.js direct instantiation.
   */
  constructor({ masterSwitchThreshold = 50, chopPenalty = 0.7 } = {}) {
    this.masterSwitchThreshold = masterSwitchThreshold;
    this.chopPenalty = chopPenalty;
  }

  /**
   * Evaluates the graph of engine outputs.
   * The SignalEngine already encodes trend alignment (EMA20/50 cross + RSI).
   * The Kernel's only responsibility is the master confidence switch.
   * @param {Object} engines - Dictionary of engine outputs keyed by context.
   * @returns {Object} Final decision matching the Kernel contract.
   */
  evaluate(engines) {
    const regime = engines.regime || { signal: 'caution', confidence: 0, reason_codes: [] };
    const timeframe = engines.timeframe || { signal: 'caution', confidence: 0, reason_codes: [] };
    
    // Non-linear context classification (Chop filter)
    const marketRegime = regime.market_regime || 'trending_up'; // Default to trending for backward compatibility
    const trendStrength = regime.trend_strength || 'strong';
    const isChop = marketRegime === 'ranging' || trendStrength === 'weak';

    // Confidence is the master switch
    const confidence = regime.confidence;
    let adjustedConfidence = confidence;
    const reasons = new Set(regime.reason_codes || []);

    if (isChop) {
      adjustedConfidence = Math.round(confidence * (1 - this.chopPenalty));
      reasons.add('KERNEL_CHOP_FILTER_BLOCKED');
    }
    
    let finalSignal = 'caution';
    
    if (adjustedConfidence < this.masterSwitchThreshold) {
      // Master switch OFF: no trade
      finalSignal = 'caution';
      reasons.add('KERNEL_LOW_CONFIDENCE_MASTER_SWITCH');
    } else {
      // Master switch ON: pass through the signal
      // SignalEngine already encodes trend direction via EMA20/50 cross + RSI
      // 'go' = LONG bias, 'no-go' = SHORT bias, 'caution' = no clear direction
      finalSignal = regime.signal;
      if (regime.signal === 'caution') {
        reasons.add('KERNEL_NO_CLEAR_DIRECTION');
      }
    }
    
    // Return structured contract (compatible with both runtime and verify_mne.js)
    return {
      signal: finalSignal,
      confidence: Math.round(confidence),
      reason_codes: Array.from(reasons),
      raw_metrics: {
        system_equilibrium: regime.signal === 'go' ? 0.350 : (regime.signal === 'no-go' ? -0.350 : 0.000),
        alignments: {},
        context_confidences: {
          regime: regime.confidence / 100,
          timeframe: timeframe.confidence / 100,
          correlation: (engines.correlation?.confidence || 0) / 100,
          behavior: (engines.behavior?.confidence || 0) / 100
        }
      }
    };
  }
}
 
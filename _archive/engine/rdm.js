export class RealityDriftMonitor {
    constructor(config = {}) {
        this.driftThreshold = config.driftThreshold || 0.25;
        this.freezeThreshold = config.freezeThreshold || 0.5;
    }

    /**
     * Calculates the Reality Drift Index (RDI) by comparing the Internal Belief Space
     * against the External Realized Space.
     * 
     * @param {Object} internalBelief - Metrics describing the system's internal beliefs:
     *                                  { edgeScore, confidence, consensus }
     * @param {Object} externalReality - Metrics from the external realized space:
     *                                   { actualReturns, slippage, drawdownShape }
     * @returns {Object} evaluation result including RDI, enforcement actions, and signal
     */
    evaluate(internalBelief, externalReality) {
        // Normalize internal metrics (assume inputs are 0 to 1)
        const internalScore = (internalBelief.edgeScore || 0) * 0.4 + 
                              (internalBelief.confidence || 0) * 0.4 + 
                              (internalBelief.consensus || 0) * 0.2;

        // Calculate external realization score
        // We assume lower slippage and drawdown is better, higher returns are better.
        const externalScore = (externalReality.actualReturns || 0) * 0.5 - 
                              (externalReality.slippage || 0) * 0.25 - 
                              (externalReality.drawdownShape || 0) * 0.25;

        // Normalize external score to roughly between 0 and 1 to compare
        const normalizedExternal = Math.max(0, Math.min(1, externalScore));
        
        // Reality Drift Index is the absolute divergence between internal belief and external reality
        const realityDriftIndex = Math.abs(internalScore - normalizedExternal);

        let signal = 'STABLE';
        let action = 'NONE';
        const reason_codes = [];

        // Enforcement rules based on Reality Drift Monitor specs
        if (realityDriftIndex >= this.freezeThreshold) {
            signal = 'CRITICAL_DRIFT';
            action = 'FREEZE_EVOLUTION';
            reason_codes.push('STABILITY_MIRAGE_DETECTED');
            reason_codes.push('INTERNAL_DECOUPLED_FROM_REALITY');
        } else if (realityDriftIndex >= this.driftThreshold) {
            signal = 'MODERATE_DRIFT';
            action = 'FORCE_RECALIBRATION';
            reason_codes.push('BELIEF_REALITY_DIVERGENCE');
        } else {
            reason_codes.push('INTERNAL_EXTERNAL_COHERENCE');
        }

        return {
            signal,
            confidence: 1 - realityDriftIndex,
            action,
            reason_codes,
            raw_metrics: {
                internalScore,
                normalizedExternal,
                realityDriftIndex
            }
        };
    }
}
 
/**
 * RSIS Minimal Classifier (Regime Shock Injection Simulator - Phase 1)
 * 
 * Classifies the continuous market state into discrete regime states.
 * R_t = argmax_k P(k | \sigma_t, \xi_t, \tau_t)
 */

export const REGIMES = {
    LOW_VOL: 'LOW_VOL',
    MID_VOL: 'MID_VOL',
    HIGH_SHOCK: 'HIGH_SHOCK'
};

export class RSISClassifier {
    constructor(volThresholds = { low: 0.02, high: 0.05 }, shockThreshold = 0.8) {
        this.volThresholds = volThresholds;
        this.shockThreshold = shockThreshold;
    }

    /**
     * Determines the current market regime based on input state.
     * @param {Object} state - { volatility: number, shockIntensity: number, trendCoherence: number }
     * @returns {string} One of REGIMES
     */
    classify(state) {
        const { volatility = 0, shockIntensity = 0 } = state;

        if (shockIntensity >= this.shockThreshold) {
            return REGIMES.HIGH_SHOCK;
        }

        if (volatility >= this.volThresholds.high) {
            return REGIMES.HIGH_SHOCK;
        }

        if (volatility > this.volThresholds.low) {
            return REGIMES.MID_VOL;
        }

        return REGIMES.LOW_VOL;
    }
}

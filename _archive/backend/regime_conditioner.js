import { REGIMES } from './rsis_classifier.js';

/**
 * Regime Conditioning Layer
 * 
 * Translates the discrete regime determined by RSIS into dynamic weight functions
 * for the Arbitrator. W1 (V1/Fast) + W2 (V2/Deep) = 1.0.
 */
export class RegimeConditioner {
    /**
     * Maps the discrete regime into weight allocations.
     * @param {string} regime - The output from RSISClassifier
     * @returns {Object} { w1: number, w2: number }
     */
    getWeights(regime) {
        switch (regime) {
            case REGIMES.LOW_VOL:
                // Low volatility -> High confidence in fast/reactive signals
                return { w1: 0.8, w2: 0.2 };
                
            case REGIMES.HIGH_SHOCK:
                // High shock/volatility -> Rely on deep memory and validation (V2)
                return { w1: 0.2, w2: 0.8 };
                
            case REGIMES.MID_VOL:
            default:
                // Transition state -> Balanced processing
                return { w1: 0.5, w2: 0.5 };
        }
    }
}

/**
 * Arbitration Layer (CPS-1.1 Formal Model)
 * 
 * Synthesizes the outputs of V1 and V2 using weights dictated by the Regime Conditioning Layer.
 * Mathematical basis: A_t = W1(R_t) * V1(S_t) + W2(R_t) * V2(S_t)
 */
export class Arbitrator {
    /**
     * Synthesizes the final action signal.
     * @param {Object} v1Output - The action signal from V1 (e.g., { value: 1.0, confidence: 0.9 })
     * @param {Object} v2Output - The action signal from V2 (e.g., { value: 0.5, confidence: 0.85 })
     * @param {Object} weights - { w1: number, w2: number } from RegimeConditioner
     * @returns {Object} Synthesized output
     */
    arbitrate(v1Output, v2Output, weights) {
        // Handle edge cases where one provider might not have generated an output
        if (!v1Output && !v2Output) return null;
        if (!v1Output) return v2Output;
        if (!v2Output) return v1Output;

        // Apply mathematical synthesis A_t = W1 * a1 + W2 * a2
        const synthesizedValue = (weights.w1 * (v1Output.value || 0)) + 
                                 (weights.w2 * (v2Output.value || 0));
        
        const synthesizedConfidence = (weights.w1 * (v1Output.confidence || 0)) + 
                                      (weights.w2 * (v2Output.confidence || 0));

        return {
            value: synthesizedValue,
            confidence: synthesizedConfidence,
            regimeWeights: weights,
            sources: {
                v1: v1Output,
                v2: v2Output
            }
        };
    }
}

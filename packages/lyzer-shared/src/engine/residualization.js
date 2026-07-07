/**
 * Residualization Layer (RL)
 * 
 * CORE DIRECTIVE (Phase 2D):
 * Extracts divergence vectors from operational providers (V1 vs V2).
 * Converts this divergence into Tail Risk Geometry (TRG).
 * Destroys any "False Consensus Field" (FCF) by nullifying agreement.
 */

export class ResidualizationLayer {
    constructor({ consensusLimit } = {}) {
        this.history = []; // Temporal context for TRG
        this.consensusLimit = consensusLimit !== undefined ? consensusLimit : 0.1;
    }

    /**
     * Extracts residual divergence between V1 and V2.
     * If they agree, the residual is artificially compressed (consensus destruction).
     */
    extractDivergence(v1Output, v2Output, v3Output) {
        // v1, v2, v3 expected shape: { signal: 'long'|'short'|'flat', confidence: 0-100, price: number }
        const fallbackV3 = v3Output || { signal: 'flat', confidence: 0 };
        
        const sigToVec = (sig) => sig === 'long' || sig === 'go' ? 1 : (sig === 'short' || sig === 'no-go' ? -1 : 0);
        
        const v1Vec = sigToVec(v1Output.signal) * (v1Output.confidence / 100);
        const v2Vec = sigToVec(v2Output.signal) * (v2Output.confidence / 100);
        const v3Vec = sigToVec(fallbackV3.signal) * (fallbackV3.confidence / 100);
        
        // DVF: Pairwise maximum distance in the ensemble
        const d12 = Math.abs(v1Vec - v2Vec);
        const d13 = Math.abs(v1Vec - v3Vec);
        const d23 = Math.abs(v2Vec - v3Vec);
        const divergenceScalar = Math.max(d12, d13, d23);
        
        const directionalTension = v1Vec + v2Vec + v3Vec;

        // Streaming Consensus Destruction (SCD)
        // Shrink consensus boundary to < consensusLimit for high-frequency trading
        const isConsensus = this.consensusLimit > 0 && divergenceScalar < this.consensusLimit && Math.abs(directionalTension) > 1.0;
        
        let dvf = divergenceScalar;
        if (isConsensus) {
            dvf = 0; // Destroy consensus
        }

        return {
            divergence: dvf,
            tension: directionalTension,
            isConsensus
        };
    }

    /**
     * Projects the DVF into Tail Risk Geometry (TRG).
     */
    projectTailRisk(dvfResult, microstructureData = {}) {
        const { divergence } = dvfResult;
        
        // TRG defines risk asymmetry.
        // It grows non-linearly with extreme divergence.
        const structuralRisk = Math.pow(divergence, 2); 
        
        // Liquidity Vacuum (from microstructure) acts as a multiplier.
        const liquidityVacuum = microstructureData.liquidityDivergence || 1.0;
        
        const trg = structuralRisk * liquidityVacuum;

        return {
            trg,
            divergenceRaw: divergence,
            destroyedConsensus: dvfResult.isConsensus
        };
    }

    evaluate(v1, v2, v3, micro) {
        // Handle legacy 3-argument call evaluation: evaluate(v1, v2, micro)
        let actualV3 = v3;
        let actualMicro = micro;
        if (micro === undefined && v3 !== undefined && !v3.signal) {
            // v3 is microData
            actualV3 = { signal: 'flat', confidence: 0 };
            actualMicro = v3;
        }
        
        const dvf = this.extractDivergence(v1, v2, actualV3);
        const trg = this.projectTailRisk(dvf, actualMicro);
        return { dvf, trg };
    }
}

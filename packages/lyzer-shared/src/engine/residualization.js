/**
 * Residualization Layer (RL)
 * 
 * CORE DIRECTIVE (Phase 2D):
 * Extracts divergence vectors from operational providers (V1 vs V2).
 * Converts this divergence into Tail Risk Geometry (TRG).
 * Destroys any "False Consensus Field" (FCF) by nullifying agreement.
 */

export class ResidualizationLayer {
    constructor({ consensusLimit, trgExponent } = {}) {
        this.history = []; // Temporal context for TRG
        this.consensusLimit = consensusLimit !== undefined ? consensusLimit : 0.1;
        this.trgExponent = trgExponent !== undefined ? trgExponent : 2; // Was implicitly 4 (divergence²²). Default now 2.
    }

    /**
     * Extracts residual divergence between V1, V2, V3, and V4.
     * If they agree, the residual is artificially compressed (consensus destruction).
     */
    extractDivergence(v1Output, v2Output, v3Output, v4Output) {
        const sigToVec = (sig) => (sig === 'long' || sig === 'go') ? 1 : ((sig === 'short' || sig === 'no-go') ? -1 : 0);
        
        const vectors = [];
        [v1Output, v2Output, v3Output, v4Output].forEach(p => {
            if (p !== undefined && p !== null && typeof p === 'object' && p.signal !== undefined) {
                vectors.push(sigToVec(p.signal) * ((p.confidence || 0) / 100));
            }
        });
        
        if (vectors.length < 2) {
            return { divergence: 0, tension: 0, isConsensus: false };
        }

        let maxDiff = 0;
        let sumTension = 0;
        for (let i = 0; i < vectors.length; i++) {
            sumTension += vectors[i];
            for (let j = i + 1; j < vectors.length; j++) {
                const diff = Math.abs(vectors[i] - vectors[j]);
                if (diff > maxDiff) maxDiff = diff;
            }
        }

        const divergenceScalar = maxDiff;
        const directionalTension = sumTension;

        // Streaming Consensus Destruction (SCD)
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
        const structuralRisk = Math.pow(divergence, this.trgExponent);
        const liquidityVacuum = microstructureData.liquidityDivergence || 1.0;
        const trg = structuralRisk * liquidityVacuum;

        return {
            trg,
            divergenceRaw: divergence,
            destroyedConsensus: dvfResult.isConsensus
        };
    }

    evaluate(v1, v2, v3, v4, micro) {
        let actualV3 = v3;
        let actualV4 = v4;
        let actualMicro = micro;

        if (micro === undefined && v4 !== undefined && !v4.signal) {
            // Called with (v1, v2, v3, micro)
            actualMicro = v4;
            actualV4 = { signal: 'flat', confidence: 0 };
        } else if (v3 !== undefined && !v3.signal && v4 === undefined) {
            // Called with (v1, v2, micro)
            actualMicro = v3;
            actualV3 = { signal: 'flat', confidence: 0 };
            actualV4 = { signal: 'flat', confidence: 0 };
        }
        
        const dvf = this.extractDivergence(v1, v2, actualV3, actualV4);
        const trg = this.projectTailRisk(dvf, actualMicro);
        return { dvf, trg };
    }
}

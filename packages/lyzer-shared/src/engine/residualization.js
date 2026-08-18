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
        this.trgExponent = trgExponent !== undefined ? trgExponent : 2; // Default 2.
    }

    /**
     * Extracts residual divergence between any number of active providers.
     * If they agree, the residual is artificially compressed (consensus destruction).
     */
    extractDivergence(providersList, micro = {}) {
        const sigToVec = (sig) => {
            if (!sig) return 0;
            const s = String(sig).toLowerCase();
            if (s === 'long' || s === 'buy' || s === 'bull' || s === 'go' || s === 'absorption' || s === 'cvd divergence') return 1;
            if (s === 'short' || s === 'sell' || s === 'bear' || s === 'no-go' || s === 'exhaustion') return -1;
            return 0;
        };
        const weights = micro.weights || {};
        
        const vectors = [];
        providersList.flat().forEach(p => {
            if (p !== undefined && p !== null && typeof p === 'object' && p.signal !== undefined) {
                const vec = sigToVec(p.signal);
                const conf = p.confidence !== undefined ? p.confidence : (vec === 0 ? 0 : 50);
                const weightMultiplier = p.id && weights[p.id] !== undefined ? weights[p.id] : 1.0;
                vectors.push(vec * (conf / 100) * weightMultiplier);
            }
        });
        
        if (vectors.length === 0) {
            return { divergence: 0, tension: 0, isConsensus: false };
        }

        if (vectors.length === 1) {
            const divergenceScalar = Math.abs(vectors[0]);
            const directionalTension = vectors[0];
            return {
                divergence: divergenceScalar,
                tension: directionalTension,
                isConsensus: false
            };
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

    evaluate(...args) {
        let micro = {};
        const providers = [];

        if (args.length > 0) {
            const last = args[args.length - 1];
            if (last && typeof last === 'object' && last.signal === undefined) {
                micro = last;
                args.slice(0, -1).forEach(p => providers.push(p));
            } else {
                args.forEach(p => providers.push(p));
            }
        }
        
        const dvf = this.extractDivergence(providers, micro);
        const trg = this.projectTailRisk(dvf, micro);
        return { dvf, trg };
    }
}

export class PhenomenonDiscoveryEngine {
    constructor(lineageGraph) {
        this.lineageGraph = lineageGraph;
    }

    /**
     * Discovers if a specific feature matrix contains incremental information 
     * about forward returns.
     * 
     * @param {string} hypothesisId - The identifier for this hypothesis
     * @param {Array<string>} featureIds - Array of feature IDs being tested
     * @param {Array<Object>} featureMatrixX - Array of feature states over time
     * @param {Array<number>} forwardReturnsY - Array of forward returns corresponding to time t+h
     */
    evaluateInformationContent(hypothesisId, featureIds, featureMatrixX, forwardReturnsY) {
        console.log(`\n🔍 [PHENOMENON DISCOVERY] Evaluating Hypothesis: ${hypothesisId}`);
        
        // 1. Lineage Check (Anti P-Hacking)
        const priorCheck = this.lineageGraph.checkPriorFailure(featureIds);
        if (priorCheck.blocked) {
            console.warn(`❌ BLOCKED BY LINEAGE GRAPH: ${priorCheck.reason}`);
            console.warn(`   Hypothesis ${hypothesisId} is a structural duplicate of a dead hypothesis.`);
            return { status: "BLOCKED", reason: priorCheck.reason };
        }

        // 2. Compute Information Coefficient (Mocked for architecture demonstration)
        console.log(`   -> Computing Information Coefficient (IC) across ${featureMatrixX.length} observations...`);
        const ic = this._computePearson(featureMatrixX, forwardReturnsY);
        
        // 3. Evaluate Asymmetry / Conditional Distribution
        console.log(`   -> Evaluating Conditional Distribution Asymmetry...`);
        const asymmetry = this._measureAsymmetry(featureMatrixX, forwardReturnsY);

        const pValue = this._mockPValueCalculation(ic); // Simplified statistical test
        
        const result = {
            hypothesisId,
            featureIds,
            ic,
            asymmetry,
            pValue,
            isPromising: ic > 0.02 && pValue < 0.05
        };

        const outcome = result.isPromising ? 'PROMISING' : 'REJECTED';
        
        // 4. Record to Lineage Graph
        featureIds.forEach(f => this.lineageGraph.registerFeature(f, 'DISCOVERY'));
        this.lineageGraph.recordExperiment(hypothesisId, featureIds, outcome, ic);

        return result;
    }

    _computePearson(x, y) {
        // Mock computation: returns a random IC between -0.01 and 0.05
        // In reality, this computes the correlation between the composite feature scalar and forward returns.
        return (Math.random() * 0.06) - 0.01; 
    }

    _measureAsymmetry(x, y) {
        // Mock: measures if the distribution has heavy tails conditionally.
        return { skew: 0.12, tail_mass: "normal" };
    }

    _mockPValueCalculation(ic) {
        // Mock p-value inversely related to IC strength
        return Math.max(0.001, 0.5 - (ic * 10));
    }
}

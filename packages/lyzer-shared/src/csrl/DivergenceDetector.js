/**
 * CSRL - Divergence Detector
 * Calculates the Scale Divergence Score (SDS) representing epistemic friction between scales.
 */
export class DivergenceDetector {
    /**
     * @param {Object} topology - The output from CrossScaleTensorGraph
     * @returns {Number} Scale Divergence Score (SDS)
     */
    detect(topology) {
        if (!topology || topology.edges.length === 0) return 0.0;
        
        let totalDivergence = 0;
        let validEdges = 0;
        
        for (const edge of topology.edges) {
            totalDivergence += edge.distance;
            validEdges++;
        }
        
        const sds = validEdges > 0 ? (totalDivergence / validEdges) : 0;
        
        // Return normalized SDS (0 to 1, where 1 means total epistemic collapse across scales)
        return Math.min(1.0, Math.max(0.0, sds));
    }

    calculateDivergence(topology, invariants) {
        return this.detect(topology);
    }
}

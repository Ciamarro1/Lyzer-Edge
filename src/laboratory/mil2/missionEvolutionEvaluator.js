/**
 * LYZER LABS - RELEASE 1.7.8
 * Mission Integrity & Intelligence Evaluation Layer (MIL-2)
 * MissionEvolutionEvaluator
 */

class MissionEvolutionEvaluator {
    constructor() {
        // Minimum viable thresholds for the Mission Intelligence Profile (MIP) vector.
        // A single failure means Dimension Collapse -> Immediate Rejection.
        this.THRESHOLDS = {
            knowledge_gain: 0.20,       // Must demonstrate minimum acquisition of new structural knowledge
            reusability: 0.30,          // Must have structural entropy capable of generalizing
            explainability: 0.50,       // Lethal threshold for Blackbox Oracles
            optionality: 0.10,          // Must not strictly destroy future adaptability
            fragility: 0.30,            // MAX threshold (lower fragility is better)
            intelligence_yield: 0.20    // Must justify added complexity
        };
    }

    /**
     * Calculates the Mission Intelligence Profile (MIP) vector.
     * @param {Object} mutation The structural refactoring proposal.
     * @returns {Object} The 6-dimensional intelligence profile.
     */
    evaluateIntelligenceProfile(mutation) {
        // In a live system, these would rely on AST analysis, dependency graph entropy,
        // LLM explainability scoring, and behavioral fuzzing. 
        // Simulated here based on mutation metadata for Phase 1.7.8 validation.
        
        return {
            knowledge_gain: mutation.metrics?.knowledge_gain || 0.0,
            reusability: mutation.metrics?.reusability || 0.0,
            explainability: mutation.metrics?.explainability || 0.0,
            optionality: mutation.metrics?.optionality || 0.0,
            fragility: mutation.metrics?.fragility || 1.0, // Defaults to total fragility
            intelligence_yield: mutation.metrics?.intelligence_yield || 0.0
        };
    }

    /**
     * Scans the profile for any dimension falling below survival thresholds.
     * @param {Object} profile The MIP vector.
     * @returns {Object} Collapse report.
     */
    checkDimensionCollapse(profile) {
        const collapses = [];
        
        if (profile.knowledge_gain < this.THRESHOLDS.knowledge_gain) collapses.push('Knowledge Gain');
        if (profile.reusability < this.THRESHOLDS.reusability) collapses.push('Reusability');
        if (profile.explainability < this.THRESHOLDS.explainability) collapses.push('Explainability');
        if (profile.optionality < this.THRESHOLDS.optionality) collapses.push('Optionality');
        if (profile.fragility > this.THRESHOLDS.fragility) collapses.push('Fragility'); // Max allowed
        if (profile.intelligence_yield < this.THRESHOLDS.intelligence_yield) collapses.push('Intelligence Yield');

        return {
            hasCollapse: collapses.length > 0,
            collapsedDimensions: collapses
        };
    }

    /**
     * The Master Validation Pipeline.
     * Integrates Governance (MGO), Evolution (CEL), and Intelligence (MIL-2).
     */
    validateMasterMutation(mutation, celResult, ontologyResult, mgoStatus) {
        // 1. Causal Validity (Evolution Delusion Guard)
        if (!celResult || celResult.cvi <= 0) {
            return { approved: false, reason: "REJECTED: Failed Counterfactual Evaluation (CVI <= 0). Evolution Delusion." };
        }

        // 2. Ontological Integrity (Goal Corruption Guard)
        if (!ontologyResult || ontologyResult.status !== 'PASS') {
            return { approved: false, reason: "REJECTED: Failed Ontology Integrity. Mission Erosion detected." };
        }

        // 3. Meta-Governance Status (Governance Capture/Drift Guard)
        if (!mgoStatus || mgoStatus.hasCriticalAlert) {
            return { approved: false, reason: "REJECTED: Critical MGO Alert active. Governance compromised." };
        }

        // 4. Intelligence Quality (Intelligence Delusion Guard)
        const profile = this.evaluateIntelligenceProfile(mutation);
        const collapseCheck = this.checkDimensionCollapse(profile);

        if (collapseCheck.hasCollapse) {
            return {
                approved: false,
                reason: `REJECTED: Intelligence Dimension Collapse in [${collapseCheck.collapsedDimensions.join(', ')}]. Knowledge-Free Optimization detected.`,
                profile: profile
            };
        }

        return {
            approved: true,
            reason: "APPROVED: Mutation successfully preserved Causal Effect, Ontology, Governance, and systemic Intelligence.",
            profile: profile
        };
    }
}

module.exports = MissionEvolutionEvaluator;

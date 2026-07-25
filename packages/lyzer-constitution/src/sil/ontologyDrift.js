import { evaluateDrift } from './evolutionRegistry.js';

/**
 * Ontology Drift Detector
 * 
 * Determines if a proposed semantic change is an Evolutionary Drift (Refinement)
 * or a Corruptive Drift. Outputs escalation levels instead of Kill Switch.
 */

export const DRIFT_LEVELS = {
    HEALTHY: 'HEALTHY',
    WARNING: 'WARNING',
    REFACTORING_FREEZE: 'REFACTORING_FREEZE',
    GOVERNANCE_ESCALATION: 'GOVERNANCE_ESCALATION',
    STRATEGIC_LOCKDOWN: 'STRATEGIC_LOCKDOWN' // Extreme cases only, manual unlock
};

export class OntologyDriftDetector {
    /**
     * Assesses a semantic change proposal.
     * @param {string} concept 
     * @param {string} intendedMeaning 
     * @returns {object} { status: DRIFT_LEVELS, reason: string }
     */
    assessDrift(concept, intendedMeaning) {
        const driftType = evaluateDrift(concept, intendedMeaning);

        if (driftType === 'FORBIDDEN') {
            return {
                status: DRIFT_LEVELS.REFACTORING_FREEZE,
                reason: `Corruptive Drift detected for concept [${concept}]. Refactoring autonomously blocked.`
            };
        }

        if (driftType === 'ALLOWED') {
            return {
                status: DRIFT_LEVELS.HEALTHY,
                reason: `Evolutionary Drift verified for [${concept}]. Meaning refinement accepted.`
            };
        }

        // Unknown meaning. Not strictly forbidden, but not registered as allowed.
        return {
            status: DRIFT_LEVELS.WARNING,
            reason: `Unrecognized semantic drift for [${concept}]. Requires Governance review.`
        };
    }
}

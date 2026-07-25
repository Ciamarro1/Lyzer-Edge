/**
 * Execution Trigger Layer (ETT)
 * 
 * CORE DIRECTIVE:
 * Determines if the system is allowed to act.
 * Execution is driven EXCLUSIVELY by geometric asymmetry in the divergence (TRG).
 * Does not optimize for mean reversion or trend. 
 * Resolves the "Null Decision State" paralysis by defining the divergence threshold for action.
 */

export class ExecutionTriggerLayer {
    constructor(trgThreshold = 0.8) {
        this.trgThreshold = trgThreshold;
    }

    /**
     * Evaluates the Tail Risk Geometry to determine execution eligibility.
     * @param {Object} trgData - Result from the ResidualizationLayer.
     */
    evaluate(trgData) {
        const { trg, destroyedConsensus } = trgData;

        // EEF: Execution Eligibility Flag
        // Only active if there's a geometric fracture in the reality model
        let eef = false;
        let reason = 'NO_ACTION_GEOMETRY_FLAT';

        if (destroyedConsensus) {
            // Consensus means false stability, execution strictly forbidden
            eef = false;
            reason = 'BLOCKED_BY_FALSE_CONSENSUS';
        } else if (trg >= this.trgThreshold) {
            // Structural instability spike detected -> Execution Authorized
            eef = true;
            reason = 'EXECUTION_TRIGGERED_BY_ASYMMETRY';
        }

        return {
            eef,
            reason,
            trgValue: trg
        };
    }
}

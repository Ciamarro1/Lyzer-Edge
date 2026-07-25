class ObjectiveDriftDetector {
    /**
     * Detects when the system destroys value just to preserve a rule.
     * (Rule Preservation > Mission Preservation)
     * @param {Object} stateData - State data from Attack 5 (Objective Drift Trap).
     * @returns {Object|null} - Alert object or null if no drift is detected.
     */
    detect(stateData) {
        if (!stateData) return null;

        let confidence = 0.0;
        let severity = 'NONE';
        let evidence = [];
        let projectedCost = 0;
        let projectedSurvivalImpact = 0;

        // Ensure we have actions to analyze
        if (!stateData.actions || !Array.isArray(stateData.actions)) {
            return null;
        }

        stateData.actions.forEach(action => {
            // Check for rule preservation that destroys more value than it preserves for the mission
            if (action.type === 'RULE_ENFORCEMENT' || action.type === 'POLICY_PRESERVATION') {
                const valueDestroyed = action.value_destroyed || 0;
                const missionValuePreserved = action.mission_value_preserved || 0;

                if (valueDestroyed > missionValuePreserved) {
                    confidence += 0.4;
                    projectedCost += valueDestroyed;
                    evidence.push(
                        `Rule preservation detected destroying value: Destroyed ${valueDestroyed} vs Preserved ${missionValuePreserved} (Rule: ${action.rule_id || 'UNKNOWN'})`
                    );
                }
            }
        });

        // Cap confidence
        if (confidence > 1.0) confidence = 1.0;

        // If no evidence of objective drift, return null
        if (evidence.length === 0) {
            return null;
        }

        // Calculate severity based on confidence and projected cost
        if (confidence > 0.8 || projectedCost > 1000) {
            severity = 'CRITICAL';
            projectedSurvivalImpact = 0.8;
        } else if (confidence > 0.5 || projectedCost > 500) {
            severity = 'HIGH';
            projectedSurvivalImpact = 0.5;
        } else {
            severity = 'MEDIUM';
            projectedSurvivalImpact = 0.2;
        }

        return {
            threat_type: 'OBJECTIVE_DRIFT',
            confidence: parseFloat(confidence.toFixed(2)),
            severity: severity,
            evidence: evidence,
            projected_cost: projectedCost,
            projected_survival_impact: projectedSurvivalImpact
        };
    }
}

module.exports = ObjectiveDriftDetector;

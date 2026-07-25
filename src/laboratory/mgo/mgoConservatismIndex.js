/**
 * MGO DETECTOR: Conservatism Index
 * 
 * Monitors the activation rate of sandboxing versus actual market volatility.
 * Detects when Protection Cost > Protection Benefit (Death by 1000 sandboxes).
 */

class MgoConservatismIndex {
    constructor() {
        this.threat_type = 'CONSERVATISM_PRESSURE';
    }

    /**
     * Evaluates state data from Attack 3 (ECA Conservatism Trap)
     * @param {Object} stateData 
     * @param {number} stateData.totalTicks - Total simulation ticks
     * @param {number} stateData.sandboxTriggers - Number of times sandbox was triggered
     * @param {number} stateData.ecaCapital - Final capital of governed system
     * @param {number} stateData.ungovernedCapital - Final capital of ungoverned system
     * @param {number} stateData.sandboxDuration - Duration of each sandbox period (optional, default 15)
     */
    analyze(stateData) {
        const {
            totalTicks,
            sandboxTriggers,
            ecaCapital,
            ungovernedCapital,
            sandboxDuration = 15
        } = stateData;

        // Activation rate of sandboxing
        const sandboxTicks = sandboxTriggers * sandboxDuration;
        const activationRate = sandboxTicks / totalTicks;

        // Protection Cost = The capital missed out on while in the sandbox
        // In Attack 3, the governed system loses to the ungoverned system because it misses the trend yield.
        const projectedCost = ungovernedCapital - ecaCapital;

        let confidence = 0.0;
        let severity = 'LOW';
        let evidence = [];
        let projectedSurvivalImpact = 'LOW';

        if (projectedCost > 0) {
            evidence.push(`Protection Cost ($${projectedCost}) > Protection Benefit.`);
            evidence.push(`System spent approx ${(activationRate * 100).toFixed(1)}% of time in sandbox mode.`);
            
            if (activationRate > 0.5) {
                // If the system is sandboxed more than 50% of the time, that's critical.
                confidence = 0.95;
                severity = 'CRITICAL';
                projectedSurvivalImpact = 'DEATH_BY_1000_SANDBOXES';
            } else if (activationRate > 0.2) {
                confidence = 0.80;
                severity = 'HIGH';
                projectedSurvivalImpact = 'SEVERE_YIELD_DECAY';
            } else {
                confidence = 0.60;
                severity = 'MEDIUM';
                projectedSurvivalImpact = 'MODERATE_YIELD_DECAY';
            }
        } else {
            evidence.push(`Protection Cost is negative or zero ($${projectedCost}). System is correctly calibrated.`);
            confidence = 0.10;
            projectedSurvivalImpact = 'STABLE';
        }

        return {
            threat_type: this.threat_type,
            confidence: confidence,
            severity: severity,
            evidence: evidence,
            projected_cost: projectedCost,
            projected_survival_impact: projectedSurvivalImpact
        };
    }
}

module.exports = MgoConservatismIndex;

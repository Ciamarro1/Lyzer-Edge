export class SystemThermodynamicsLayer {
    constructor(config = {}) {
        this.energyToEdgeRatio = config.energyToEdgeRatio || 1.5; // Threshold for acceptable energy consumption relative to edge
    }

    /**
     * Regulates system resources based on thermodynamic energy accounting.
     * Enforces the First Law of System Survival: No subsystem may consume more energy
     * (latency/complexity/simulation depth) than its statistically justified contribution to future edge.
     * 
     * @param {Object} subsystemMetrics - Cost/decay/recovery metrics for a given subsystem
     *                                    { governanceOverhead, simulationDepth, latency, staleEdges, redundantKernels, pruning, exploration }
     * @param {Object} state - The overall energy state: { newEdge, volatility, statisticallyJustifiedEdge }
     * @returns {Object} regulation result including signal, energy status, and system parameter adjustments
     */
    regulate(subsystemMetrics, state) {
        // Energy Accounting: Measures Energy Input
        const energyInput = (state.newEdge || 0) * 0.6 + (state.volatility || 0) * 0.4;

        // Energy Cost: Overhead, simulation depth, latency
        const energyCost = (subsystemMetrics.governanceOverhead || 0) * 0.3 + 
                           (subsystemMetrics.simulationDepth || 0) * 0.5 + 
                           (subsystemMetrics.latency || 0) * 0.2;

        // Energy Decay: Stale edges and redundancy
        const energyDecay = (subsystemMetrics.staleEdges || 0) * 0.7 + 
                            (subsystemMetrics.redundantKernels || 0) * 0.3;

        // Energy Recovery: Pruning dead weight, exploration efficiency
        const energyRecovery = (subsystemMetrics.pruning || 0) * 0.5 + 
                               (subsystemMetrics.exploration || 0) * 0.5;

        // Net energy consumed by this specific subsystem
        const netEnergyConsumed = energyCost + energyDecay - energyRecovery;
        const justifiedEdge = state.statisticallyJustifiedEdge || 0;

        let signal = 'NOMINAL';
        let action = 'MAINTAIN_BUDGET';
        const reason_codes = [];
        let recommendedAdjustments = {};

        // Enforcement of First Law of System Survival
        const maxAllowedEnergy = justifiedEdge * this.energyToEdgeRatio;

        if (netEnergyConsumed > maxAllowedEnergy && maxAllowedEnergy > 0) {
            signal = 'THERMODYNAMIC_DEFICIT';
            action = 'THROTTLE_SUBSYSTEM';
            reason_codes.push('FIRST_LAW_VIOLATION');
            reason_codes.push('ENERGY_COST_EXCEEDS_JUSTIFIED_EDGE');
            
            // Generate system parameter adjustments to recover energy
            recommendedAdjustments = {
                reduceSimulationDepth: true,
                forcePruning: true,
                targetComplexityReduction: netEnergyConsumed - maxAllowedEnergy
            };
        } else if (netEnergyConsumed < maxAllowedEnergy * 0.3 && maxAllowedEnergy > 0) {
            signal = 'THERMODYNAMIC_SURPLUS';
            action = 'EXPAND_BUDGET';
            reason_codes.push('HIGH_ENERGY_EFFICIENCY');
            
            // Allow more exploration or deeper simulation due to surplus
            recommendedAdjustments = {
                increaseSimulationDepth: true,
                allowExploration: true
            };
        }

        return {
            signal,
            action,
            reason_codes,
            adjustments: recommendedAdjustments,
            raw_metrics: {
                energyInput,
                energyCost,
                energyDecay,
                energyRecovery,
                netEnergyConsumed,
                justifiedEdge,
                maxAllowedEnergy
            }
        };
    }
}
 
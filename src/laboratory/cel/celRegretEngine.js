/**
 * LYZER LABS - Counterfactual Evaluation Layer (CEL)
 * Module: Regret Engine
 * 
 * Calculates the temporal opportunity cost and drawdown risk of counterfactual scenarios.
 * Specifically answers: "What would have happened if we didn't approve the change and scenario B occurred?"
 */

class CELRegretEngine {
    constructor(config = {}) {
        this.baseRiskFreeRate = config.baseRiskFreeRate || 0.05; // 5% default risk-free rate
        this.timeSteps = config.timeSteps || 252; // e.g., trading days in a year
    }

    /**
     * Calculates the counterfactual outcome if a change was REJECTED and a specific scenario occurred.
     * 
     * @param {Object} baselineState - The state if the change was approved (what actually happened).
     * @param {Object} scenarioB - The alternative scenario (e.g., market shock, growth phase).
     * @param {number} timeHorizonInYears - The time span for the evaluation.
     * @returns {Object} Regret analysis containing opportunity cost, drawdown risk, and regret score.
     */
    evaluateCounterfactual(baselineState, scenarioB, timeHorizonInYears = 1) {
        // 1. Model the baseline vs counterfactual trajectory
        const actualReturn = baselineState.expectedReturn;
        const actualVolatility = baselineState.volatility;
        
        const counterfactualReturn = scenarioB.expectedReturn;
        const counterfactualVolatility = scenarioB.volatility;

        // 2. Temporal Opportunity Cost calculation
        // The cost of what we missed out on by not taking scenario B, adjusted for the risk-free rate and time.
        const actualCompound = Math.pow(1 + actualReturn, timeHorizonInYears);
        const counterfactualCompound = Math.pow(1 + counterfactualReturn, timeHorizonInYears);
        
        // Opportunity cost is positive if the counterfactual performed better than the actual
        const rawOpportunityCost = counterfactualCompound - actualCompound;
        const temporalOpportunityCost = rawOpportunityCost * Math.exp(-this.baseRiskFreeRate * timeHorizonInYears);

        // 3. Drawdown Risk calculation (Scenario B)
        // Simplified Cornish-Fisher approximation or standard VaR scaling for peak-to-trough estimate
        // Assuming a continuous random walk, expected max drawdown scales with volatility
        // E[MDD] roughly ~ volatility * sqrt(pi/2) for Brownian motion over unit time
        const expectedMaxDrawdown = counterfactualVolatility * Math.sqrt(Math.PI / 2) * Math.sqrt(timeHorizonInYears);
        const worstCaseDrawdown = Math.min(0, counterfactualReturn - (2.58 * counterfactualVolatility * Math.sqrt(timeHorizonInYears))); // 99% confidence tail

        // 4. Regret Score calculation
        // Regret = (Missed Upside) + penalty for (Drawdown Risk in the alternative state)
        // If we rejected the change (we got Scenario B) instead of taking Baseline... 
        // Wait, the prompt says: "What would have happened if we didn't approve the change and scenario B occurred?"
        // This implies Baseline = we approved the change. Scenario B = we didn't approve it.
        let regretScore = 0;
        
        if (temporalOpportunityCost > 0) {
            // Scenario B was better, so we regret taking the Baseline.
            // However, we discount the regret if Scenario B had a huge drawdown risk.
            regretScore = temporalOpportunityCost * (1 - Math.abs(worstCaseDrawdown)); 
        } else {
            // Baseline was better. No regret for upside, but did Scenario B save us from a crash?
            // If Baseline crashed, we would regret NOT taking Scenario B. 
            // In this specific model, we evaluate the direct mathematical delta.
            regretScore = temporalOpportunityCost; 
        }

        return {
            scenarioAnalysed: "Change Rejected -> Scenario B Executed",
            metrics: {
                baselineCompoundReturn: parseFloat(actualCompound.toFixed(4)),
                counterfactualCompoundReturn: parseFloat(counterfactualCompound.toFixed(4)),
                temporalOpportunityCost: parseFloat(temporalOpportunityCost.toFixed(4)),
                expectedScenarioBDrawdown: parseFloat((expectedMaxDrawdown * -1).toFixed(4)), // Expressed as negative
                worstCaseScenarioBDrawdown: parseFloat(worstCaseDrawdown.toFixed(4)),
                regretScore: parseFloat(regretScore.toFixed(4))
            },
            conclusion: this._generateConclusion(temporalOpportunityCost, worstCaseDrawdown)
        };
    }

    _generateConclusion(temporalOpportunityCost, drawdown) {
        if (temporalOpportunityCost > 0.05) {
            return `HIGH REGRET: Rejecting the change and taking Scenario B would have yielded significant temporal opportunity cost gains, despite a drawdown risk of ${(drawdown * 100).toFixed(2)}%.`;
        } else if (temporalOpportunityCost > 0) {
            return `MODERATE REGRET: Scenario B was marginally better, yielding a small opportunity cost advantage.`;
        } else {
            return `NO REGRET: The approved change outperformed Scenario B. Taking Scenario B would have resulted in negative opportunity cost.`;
        }
    }
}

module.exports = CELRegretEngine;

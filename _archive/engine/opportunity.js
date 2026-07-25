import { runScenario } from './scenarios.js';

/**
 * Calculates Real Opportunity Cost (Setups identified but missed).
 * Powered by Scenarios Engine.
 * 
 * @param {Array} missedTrades - Array of identified but missed trade setups.
 * @returns {Object} Opportunity cost metrics.
 */
export function calculateRealOpportunityCost(missedTrades) {
    if (!missedTrades || missedTrades.length === 0) {
        return { equityMissed: 0, setupsMissed: 0 };
    }
    
    // Evaluate what would have happened if we took these trades with perfect execution
    // (Assuming missed trades already reflect what would have been a perfect entry/exit)
    const stats = runScenario(missedTrades, {});
    
    return {
        equityMissed: stats.deltaVsReality ? stats.deltaVsReality.expectancy * missedTrades.length : 0, // Mock logic, ideally based on scenario PnL
        setupsMissed: missedTrades.length,
        winRateMissed: stats.winRate || 0,
        rrMissed: stats.expectancy || 0
    };
}

/**
 * Calculates Behavioral Opportunity Cost (The delta between Planned RR and Realized RR. 
 * Evaluates the equity lost due to poor execution).
 * 
 * @param {Array} executedTrades - Array of executed trades containing planned and realized metrics.
 * @returns {Object} Behavioral opportunity cost metrics.
 */
export function calculateBehavioralOpportunityCost(executedTrades) {
    if (!executedTrades || executedTrades.length === 0) {
        return { equityLost: 0, rrDelta: 0 };
    }

    // Baseline stats are realized stats
    // Scenario stats using planned execution rules could be simulated
    // We assume a simple execution scenario vs actual here.
    const plannedScenarioConfig = {
        executionRules: { slippageR: 0, commission: 0 } // representing ideal planned execution
    };
    
    const plannedStats = runScenario(executedTrades, plannedScenarioConfig);
    const realizedStats = runScenario(executedTrades, {}); // Baseline

    // In a real scenario, "planned" PnL vs "realized" PnL would be compared
    const plannedProfit = plannedStats.expectancy * executedTrades.length;
    const realizedProfit = realizedStats.expectancy * executedTrades.length;
    
    const plannedRR = plannedStats.expectancy;
    const realizedRR = realizedStats.expectancy;

    return {
        equityLost: Math.max(0, plannedProfit - realizedProfit),
        equityDelta: realizedProfit - plannedProfit,
        plannedRR,
        realizedRR,
        rrDelta: realizedRR - plannedRR
    };
}

/**
 * Calculates Strategic Opportunity Cost.
 * Evaluates the equity cost of maintaining statistically inferior behavior 
 * (e.g., Delta between Baseline and an optimized scenario like "No Range Trades").
 * 
 * @param {Array} executedTrades - Array of historical executed trades.
 * @param {Object} optimalScenarioRules - The rule configuration for the optimized scenario (e.g., filters: { custom: t => t.regime !== 'Range' }).
 * @returns {Object} Strategic opportunity cost metrics.
 */
export function calculateStrategicOpportunityCost(executedTrades, optimalScenarioRules) {
    if (!executedTrades || executedTrades.length === 0 || !optimalScenarioRules) {
        return { equityLost: 0, delta: null };
    }

    const optimalStats = runScenario(executedTrades, optimalScenarioRules);

    // Delta between Baseline and Optimal Scenario
    return {
        equityLost: Math.max(0, optimalStats.deltaVsReality.expectancy * optimalStats.tradeCount),
        delta: optimalStats.deltaVsReality,
        optimalTradeCount: optimalStats.tradeCount,
        optimalWinRate: optimalStats.winRate,
        optimalExpectancy: optimalStats.expectancy
    };
}
 
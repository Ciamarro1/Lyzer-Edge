/**
 * Strategy VM (Release 1.4.1)
 * Consumes an Intermediate Representation (IR) of a trading strategy,
 * backtests it against historical trades, and computes evaluation metrics.
 */

export class StrategyVM {
    constructor() {
        this.ir = null;
    }

    /**
     * Loads the compiled Intermediate Representation (IR) of the strategy.
     * @param {Object} ir - The Strategy IR containing rules and logic.
     */
    loadIR(ir) {
        if (!ir || typeof ir !== 'object') {
            throw new Error("Invalid IR provided to StrategyVM.");
        }
        this.ir = ir;
    }

    /**
     * Executes the backtest against a dataset of historical trades.
     * @param {Array<Object>} historicalTrades - Array of trade data objects.
     * @returns {Object} Structured output containing curves and scores for UI consumption.
     */
    execute(historicalTrades) {
        if (!this.ir) {
            throw new Error("Strategy IR not loaded. Call loadIR() first.");
        }

        if (!Array.isArray(historicalTrades)) {
            throw new Error("historicalTrades must be an array.");
        }

        const equityCurve = [];
        const regretCurve = [];
        const ruleStats = new Map();

        let currentEquity = 0;
        let cumulativeRegret = 0;

        // Initialize rule tracking based on IR definition
        if (this.ir.rules && Array.isArray(this.ir.rules)) {
            for (const rule of this.ir.rules) {
                ruleStats.set(rule.id, {
                    id: rule.id,
                    name: rule.name || `Rule ${rule.id}`,
                    type: rule.type || 'unknown',
                    triggers: 0,
                    positiveImpact: 0,
                    negativeImpact: 0,
                    missedOpportunityImpact: 0
                });
            }
        }

        // Evaluate each trade chronologically
        for (let i = 0; i < historicalTrades.length; i++) {
            const trade = historicalTrades[i];
            const evaluation = this._evaluateTradeAgainstIR(trade);

            // Determine PnL resulting from the strategy's evaluation
            // If the strategy takes the trade, use actual PnL (or simulated)
            // Default to using trade.pnl if it's already a monetary value
            let tradePnl = 0;
            if (trade.pnl !== undefined) {
                tradePnl = trade.pnl;
            } else if (trade.exitPrice !== undefined && trade.entryPrice !== undefined) {
                const size = trade.positionSize || 1;
                const direction = trade.direction === 'short' ? -1 : 1;
                tradePnl = (trade.exitPrice - trade.entryPrice) * direction * size;
            }

            const simulatedPnl = evaluation.taken ? tradePnl : 0;
            currentEquity += simulatedPnl;

            // Compute Regret
            // Regret = (Best Possible PnL) - (Simulated PnL)
            // If trade was profitable but skipped, that's missed opportunity regret.
            // If trade was taken but negative PnL, that's loss regret.
            let maxPnl = tradePnl; 
            if (trade.maxPotentialPnl !== undefined) {
                maxPnl = trade.maxPotentialPnl;
            } else if (tradePnl < 0) {
                maxPnl = 0; // The best decision would be to not take it
            }

            const tradeRegret = Math.max(0, maxPnl - simulatedPnl);
            cumulativeRegret += tradeRegret;

            // Build curves
            const dateStr = trade.date || trade.exitDate || trade.entryDate || `Trade_${i}`;
            
            equityCurve.push({
                x: dateStr,
                y: currentEquity,
                tradeId: trade.id || i,
                pnl: simulatedPnl
            });

            regretCurve.push({
                x: dateStr,
                y: cumulativeRegret,
                tradeId: trade.id || i,
                regret: tradeRegret
            });

            // Attribute impact to rules
            for (const ruleId of evaluation.triggeredRules) {
                if (ruleStats.has(ruleId)) {
                    const stats = ruleStats.get(ruleId);
                    stats.triggers += 1;

                    if (evaluation.taken) {
                        if (simulatedPnl >= 0) {
                            stats.positiveImpact += simulatedPnl;
                        } else {
                            stats.negativeImpact += Math.abs(simulatedPnl);
                        }
                    } else {
                        // Strategy skipped the trade
                        // If the trade would have been profitable, the blocking rule caused missed opportunity
                        if (tradePnl > 0) {
                            stats.missedOpportunityImpact += tradePnl;
                        }
                    }
                }
            }
        }

        // Compute aggregate rule scores
        const ruleImpactScores = [];
        const ruleToxicityScores = [];

        for (const [ruleId, stats] of ruleStats.entries()) {
            // Impact Score: Net contribution to equity (positive - negative)
            // For filters that successfully block a negative trade, we could give positive impact, 
            // but in a simple model we define impact as PnL generated by trades taken where this rule triggered.
            const impactScore = stats.positiveImpact - stats.negativeImpact;

            // Toxicity Score: Combines realized negative impact and missed opportunity impact.
            // Scaled 0 to 100 based on the proportion of "bad" outcomes vs total potential outcomes
            const totalBadImpact = stats.negativeImpact + stats.missedOpportunityImpact;
            const totalInvolvedImpact = stats.positiveImpact + totalBadImpact;
            
            let toxicityScore = 0;
            if (totalInvolvedImpact > 0) {
                toxicityScore = (totalBadImpact / totalInvolvedImpact) * 100;
            }

            ruleImpactScores.push({
                ruleId: stats.id,
                name: stats.name,
                type: stats.type,
                impactScore,
                triggers: stats.triggers
            });

            ruleToxicityScores.push({
                ruleId: stats.id,
                name: stats.name,
                type: stats.type,
                toxicityScore,
                negativeImpact: stats.negativeImpact,
                missedOpportunity: stats.missedOpportunityImpact
            });
        }

        // Sort scores for UI presentation
        ruleImpactScores.sort((a, b) => b.impactScore - a.impactScore);
        ruleToxicityScores.sort((a, b) => b.toxicityScore - a.toxicityScore);

        return {
            metadata: {
                version: "1.4.1",
                totalTrades: historicalTrades.length,
                finalEquity: currentEquity,
                finalRegret: cumulativeRegret
            },
            equityCurve,
            regretCurve,
            ruleImpactScores,
            ruleToxicityScores
        };
    }

    /**
     * Internal method to evaluate a single historical trade against the IR AST.
     * @param {Object} trade - Historical trade record.
     * @returns {Object} Result of evaluation { taken: boolean, triggeredRules: string[] }
     */
    _evaluateTradeAgainstIR(trade) {
        let taken = true;
        const triggeredRules = [];

        if (!this.ir || !this.ir.rules || !Array.isArray(this.ir.rules)) {
            return { taken, triggeredRules };
        }

        // Iterate through rules defined in the IR
        for (const rule of this.ir.rules) {
            let ruleTriggered = false;
            let conditionPassed = true;

            // Simple condition evaluator
            if (rule.condition && typeof rule.condition === 'object') {
                const { field, operator, value } = rule.condition;
                const tradeValue = trade[field];

                if (tradeValue !== undefined) {
                    switch (operator) {
                        case '>': conditionPassed = tradeValue > value; break;
                        case '<': conditionPassed = tradeValue < value; break;
                        case '>=': conditionPassed = tradeValue >= value; break;
                        case '<=': conditionPassed = tradeValue <= value; break;
                        case '==': 
                        case '===': conditionPassed = tradeValue === value; break;
                        case '!=':
                        case '!==': conditionPassed = tradeValue !== value; break;
                        default: conditionPassed = true; // Unknown operator fallback
                    }
                }
            }

            if (rule.type === 'filter') {
                // For a filter, if condition fails, trade is blocked
                if (!conditionPassed) {
                    taken = false;
                    ruleTriggered = true; // The rule actively did something (blocked)
                } else {
                    ruleTriggered = true; // Filter passed, so it "approved"
                }
            } else if (rule.type === 'trigger' || rule.type === 'entry' || rule.type === 'exit') {
                if (conditionPassed) {
                    ruleTriggered = true;
                }
            } else {
                // Unknown rule types trigger if condition passes
                if (conditionPassed) {
                    ruleTriggered = true;
                }
            }

            if (ruleTriggered) {
                triggeredRules.push(rule.id);
            }
        }

        return { taken, triggeredRules };
    }
}

// Ensure the class is available as default export as well
export default StrategyVM;
 
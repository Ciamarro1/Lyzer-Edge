/**
 * Portfolio Aggregation Engine
 * Measures cross-sectional marginal contribution and negative portfolio controls
 * without discovering new alphas or retrospectively selecting assets.
 */
export class PortfolioAggregationEngine {
    constructor() {
        this.portfolios = [];
        this.marginalContributions = [];
    }

    /**
     * @param {string} name 
     * @param {Object} metrics { return, vol, drawdown, sharpe, correlation }
     */
    registerPortfolio(name, metrics) {
        console.log(`\n💼 [PORTFOLIO SIMULATION] ${name}`);
        console.log(`   -> Annual Return: ${(metrics.return * 100).toFixed(2)}%`);
        console.log(`   -> Volatility: ${(metrics.vol * 100).toFixed(2)}%`);
        console.log(`   -> Max Drawdown: ${(metrics.drawdown * 100).toFixed(2)}%`);
        console.log(`   -> Sharpe: ${metrics.sharpe.toFixed(2)}`);

        this.portfolios.push({ name, ...metrics });
        return metrics;
    }

    /**
     * @param {string} asset 
     * @param {Object} baseMetrics 
     * @param {Object} newMetrics 
     */
    measureMarginalContribution(asset, baseMetrics, newMetrics) {
        console.log(`\n➕ [MARGINAL CONTRIBUTION] Adding ${asset} to Portfolio`);
        
        const deltaReturn = newMetrics.return - baseMetrics.return;
        const deltaVol = newMetrics.vol - baseMetrics.vol;
        const deltaDrawdown = newMetrics.drawdown - baseMetrics.drawdown;
        const deltaSharpe = newMetrics.sharpe - baseMetrics.sharpe;

        console.log(`   -> Δ Return: ${(deltaReturn * 100).toFixed(2)}%`);
        console.log(`   -> Δ Volatility: ${(deltaVol * 100).toFixed(2)}%`);
        console.log(`   -> Δ Max Drawdown: ${(deltaDrawdown * 100).toFixed(2)}%`);
        console.log(`   -> Δ Sharpe: ${deltaSharpe.toFixed(2)}`);

        let conclusion = "ACCRETIVE";
        if (deltaSharpe <= 0 && deltaVol > 0) {
            conclusion = "DILUTIVE (REDUNDANT RISK)";
        }

        console.log(`   -> Status: ${conclusion}`);

        this.marginalContributions.push({
            asset,
            deltaReturn,
            deltaVol,
            deltaDrawdown,
            deltaSharpe,
            conclusion
        });
    }
}

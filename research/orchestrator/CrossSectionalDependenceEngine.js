/**
 * Cross-Sectional Dependence Engine
 * Measures tail correlation and downside co-exceedance probability (Lambda L)
 * under various stress scenarios and negative controls.
 */
export class CrossSectionalDependenceEngine {
    constructor() {
        this.results = [];
    }

    /**
     * Models lambda_L(q) = P(R_i < Q_i(q) | R_j < Q_j(q))
     * Represents the probability that asset i is in its worst q% of returns 
     * given that asset j is in its worst q% of returns.
     */
    evaluateDependenceScenario(name, metrics) {
        console.log(`\n⚙️ [DEPENDENCE SCENARIO] ${name}`);
        console.log(`   -> Normal Correlation (Pearson): ${metrics.normal_corr.toFixed(2)}`);
        console.log(`   -> Downside Co-exceedance (q=10%): ${(metrics.lambda_10 * 100).toFixed(1)}%`);
        console.log(`   -> Downside Co-exceedance (q=5%): ${(metrics.lambda_5 * 100).toFixed(1)}%`);
        console.log(`   -> Downside Co-exceedance (q=1%): ${(metrics.lambda_1 * 100).toFixed(1)}%`);

        let status = "EVALUATED";
        if (metrics.lambda_1 > 0.6) {
            console.log(`   -> ⚠️ CRITICAL TAIL DEPENDENCE: Assets converge strongly in severe drawdowns.`);
        } else if (metrics.lambda_1 <= 0.2) {
            console.log(`   -> ✅ TAIL DIVERSIFICATION: Assets remain structurally independent in severe drawdowns.`);
        }

        this.results.push({ name, metrics });
        return metrics;
    }

    evaluateStressConcentration(name, portfolioMetrics) {
        console.log(`\n🧨 [TAIL CONCENTRATION STRESS TEST] ${name}`);
        console.log(`   -> Expected Shortfall (ES_95): ${(portfolioMetrics.expected_shortfall * 100).toFixed(2)}%`);
        console.log(`   -> Max Drawdown (Stress): ${(portfolioMetrics.stress_drawdown * 100).toFixed(2)}%`);
        console.log(`   -> Effective Independent Bets: ${portfolioMetrics.effective_bets.toFixed(1)}`);
        
        return portfolioMetrics;
    }
}

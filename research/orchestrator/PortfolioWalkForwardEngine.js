/**
 * Portfolio Walk-Forward Engine
 * Simulates strict untouched OOS windows with no feedback.
 * Calculates degradation, runs Kill Tests, and produces binary validation.
 */
export class PortfolioWalkForwardEngine {
    constructor(referenceMetrics) {
        this.referenceMetrics = referenceMetrics; // In-sample or early OOS references to calculate degradation
        this.windows = [];
        this.killTests = [];
    }

    /**
     * @param {string} windowId 
     * @param {Object} metrics { cagr, sharpe, maxDrawdown, winRate, netEdge, turnover, fillRatio, avgExposure, maxExposure }
     */
    evaluateWindow(windowId, metrics, curveType) {
        console.log(`\n⚙️ [WALK-FORWARD OOS] ${windowId} | Curve: ${curveType}`);
        
        let degradation = 0;
        if (curveType === "A - Full Institutional") {
            degradation = 1 - (metrics.sharpe / this.referenceMetrics.sharpe);
            console.log(`   -> Sharpe: ${metrics.sharpe.toFixed(2)} | Degradation vs Ref: ${(degradation * 100).toFixed(1)}%`);
        } else {
            console.log(`   -> Sharpe: ${metrics.sharpe.toFixed(2)}`);
        }

        console.log(`   -> Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%`);
        console.log(`   -> Net Edge: ${(metrics.netEdge * 10000).toFixed(1)} bps`);

        this.windows.push({ windowId, curveType, metrics, degradation });
    }

    evaluateKillTest(testName, metrics) {
        console.log(`\n🧨 [KILL TEST] ${testName}`);
        
        let survived = metrics.sharpe > 0 && metrics.maxDrawdown > -0.30;
        
        console.log(`   -> Sharpe: ${metrics.sharpe.toFixed(2)}`);
        console.log(`   -> Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%`);
        console.log(`   -> Status: ${survived ? 'SURVIVED' : 'FAILED'}`);

        this.killTests.push({ testName, metrics, survived });
    }

    determineVerdict() {
        console.log(`\n🏁 [PORTFOLIO VALIDATION GATE] Determining Verdict...`);

        // Check 1: Did Full Institutional beat the Negative Control massively?
        const fullAvgSharpe = this.windows.filter(w => w.curveType.includes("A")).reduce((sum, w) => sum + w.metrics.sharpe, 0) / 4;
        const negAvgSharpe = this.windows.filter(w => w.curveType.includes("C")).reduce((sum, w) => sum + w.metrics.sharpe, 0) / 4;
        
        console.log(`   -> Full Architecture Avg Sharpe: ${fullAvgSharpe.toFixed(2)}`);
        console.log(`   -> Negative Control Avg Sharpe: ${negAvgSharpe.toFixed(2)}`);

        if (fullAvgSharpe <= negAvgSharpe || fullAvgSharpe < 0.5) {
            return "REJECTED";
        }

        // Check 2: Did the Risk Budget help?
        const noRiskAvgSharpe = this.windows.filter(w => w.curveType.includes("B")).reduce((sum, w) => sum + w.metrics.sharpe, 0) / 4;
        console.log(`   -> No-Risk-Budget Avg Sharpe: ${noRiskAvgSharpe.toFixed(2)}`);
        
        // Check 3: Did it survive the Kill Tests?
        const killTestsFailed = this.killTests.filter(k => !k.survived).length;
        console.log(`   -> Kill Tests Failed: ${killTestsFailed}/5`);

        // Check 4: Was Degradation Acceptable?
        const avgDegradation = this.windows.filter(w => w.curveType.includes("A")).reduce((sum, w) => sum + w.degradation, 0) / 4;
        console.log(`   -> Average OOS Degradation: ${(avgDegradation * 100).toFixed(1)}%`);

        if (killTestsFailed > 2 || avgDegradation > 0.60) {
            return "RESEARCH_SURVIVOR"; // Too fragile for production, needs more work
        }

        if (killTestsFailed === 0 && avgDegradation < 0.40) {
            return "PRODUCTION_ELIGIBLE";
        }

        return "RESEARCH_SURVIVOR";
    }
}

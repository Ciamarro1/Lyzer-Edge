/**
 * Release 1.8A - Evidence Infrastructure
 * Core Experiment Runner & Metric Freeze
 * 
 * "A arquitetura não recebe mais autoridade por coerência.
 * Ela recebe autoridade por evidência." - CIA
 */

class ExperimentMetrics {
    /**
     * FREEZE DIRECTIVE: Metric Capture Prevention
     * Adaptive Advantage is mathematically locked here before any experiment runs.
     * 
     * Definition: Net capital compounded over a multi-regime period containing 
     * at least one structural shift, penalizing catastrophic failure (death) infinitely.
     */
    static calculateAdaptiveAdvantage(govResult, ungovResult, initialCapital) {
        // Survival Rule: Drawdown < 25% and Capital > 0
        const isSurviving = (result) => result.survived && result.maxDrawdown < 0.25;
        
        const S_gov = isSurviving(govResult) ? 1 : 0;
        const C_gov = govResult.finalCapital / initialCapital;

        const S_ungov = isSurviving(ungovResult) ? 1 : 0;
        const C_ungov = ungovResult.finalCapital / initialCapital;

        const AA = (S_gov * C_gov) - (S_ungov * C_ungov);
        return AA;
    }
}

class EvidenceLogger {
    constructor(experimentName) {
        this.experimentName = experimentName;
        console.log(`\n======================================================`);
        console.log(`[EVIDENCE RUNNER] INITIATING: ${experimentName}`);
        console.log(`======================================================\n`);
    }

    logHypothesis(question, nullHypothesis) {
        console.log(`[?] Core Question   : ${question}`);
        console.log(`[!] Null Hypothesis : ${nullHypothesis}\n`);
    }

    logResult(metricName, value, passed) {
        const status = passed ? "FALSIFICATION FAILED (Architecture Holds)" : "FALSIFICATION SUCCESS (Architecture Fails)";
        console.log(`\n------------------------------------------------------`);
        console.log(`[METRIC] ${metricName}: ${value}`);
        console.log(`[VERDICT] ${status}`);
        console.log(`------------------------------------------------------\n`);
    }
}

module.exports = { ExperimentMetrics, EvidenceLogger };

/**
 * Institutional Research Governor
 * Enforces the v2.0 Mandate 10-point statistical checklist.
 * Ensures Effect Size > Statistical Significance.
 */
export class InstitutionalGovernor {
    constructor() {
        this.ledgers = [];
    }

    /**
     * @param {Object} candidate
     * @param {Object} metrics The 10-point evidence matrix
     */
    evaluateDiscovery(candidate, metrics) {
        console.log(`\n⚖️ [INSTITUTIONAL GOVERNOR] Evaluating: ${candidate.feature} -> ${candidate.target}`);
        
        let passedChecks = 0;
        let failures = [];

        // 1. Statistical significance
        if (metrics.p_value < 0.05) passedChecks++;
        else failures.push("Fails Statistical Significance");

        // 2. Economic effect size (Effect > Stat Sig)
        if (metrics.incremental_ic > 0.015 || metrics.effect_size_bps > 5) passedChecks++;
        else failures.push("Fails Economic Effect Size (too small to trade)");

        // 3. Incremental information
        if (metrics.incremental_ic > 0.01) passedChecks++;
        else failures.push("Fails Incremental Information (redundant with baseline)");

        // 4. Negative control superiority
        if (metrics.ic > metrics.negative_control_ic + 0.01) passedChecks++;
        else failures.push("Fails Negative Control Superiority");

        // 5. Robustness across nearby horizons
        if (metrics.horizon_stability) passedChecks++;
        else failures.push("Fails Horizon Stability (effect isolated to single random lag)");

        // 6. Robustness across regimes
        if (metrics.regime_robustness) passedChecks++;
        else failures.push("Fails Regime Robustness");

        // 7. OOS replication
        if (metrics.oos_replication) passedChecks++;
        else failures.push("Fails OOS Replication");

        // 8. Multiple-testing adjustment
        if (metrics.multiple_testing_adjusted_p < 0.05) passedChecks++;
        else failures.push("Fails Multiple Testing Penalty");

        // 9. No tautological relationship
        if (metrics.tautology_delta > 0.005) passedChecks++;
        else failures.push("Fails Tautology Audit");

        // 10. No dependence on arbitrary threshold
        if (metrics.threshold_independent) passedChecks++;
        else failures.push("Fails Threshold Independence (fragile parameter)");

        const isPromising = passedChecks >= 8;
        let classification = "NO_INFORMATION";

        if (isPromising) {
            if (candidate.target.includes("Direction") || candidate.target.includes("Return")) {
                classification = "PROMISING_DIRECTIONAL_INFORMATION";
            } else if (candidate.target.includes("Magnitude") || candidate.target.includes("Volatility")) {
                classification = "INFORMATIONAL_ONLY (RISK)";
            }
        } else if (metrics.tautology_delta <= 0.005) {
            classification = "REDUNDANT_REPRESENTATION";
        } else if (metrics.ic > 0.02 && metrics.incremental_ic <= 0.01) {
            classification = "COMMON_FACTOR_EXPLAINED";
        } else if (passedChecks >= 5 && (candidate.target.includes("Volatility") || candidate.target.includes("Magnitude"))) {
             classification = "INFORMATIONAL_ONLY (RISK)";
        } else {
             classification = "NO_INCREMENTAL_INFORMATION";
        }

        const conclusion = {
            feature: candidate.feature,
            target: candidate.target,
            score: `${passedChecks}/10`,
            failures,
            classification,
            isPromising
        };

        this.ledgers.push(conclusion);
        
        console.log(`   -> Score: ${conclusion.score}`);
        if (failures.length > 0) {
            console.log(`   -> Failures: ${failures.join(', ')}`);
        }
        console.log(`   -> Classification: [${classification}]`);

        return conclusion;
    }
}

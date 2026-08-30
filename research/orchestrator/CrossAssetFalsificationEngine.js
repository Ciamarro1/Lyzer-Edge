/**
 * Cross-Asset Falsification Engine
 * Implements strict controls for temporal information transmission between assets.
 */
export class CrossAssetFalsificationEngine {
    constructor() {
        this.census = [];
    }

    /**
     * @param {string} leaderAsset 
     * @param {string} followerAsset 
     * @param {number} lag
     * @param {number} rawIC
     * @param {Object} controls 
     */
    evaluateLeadLag(leaderAsset, followerAsset, lag, rawIC, controls) {
        console.log(`\n🔍 [CROSS-ASSET FALSIFICATION] Evaluating: ${leaderAsset} -> ${followerAsset} @ t+${lag}`);
        console.log(`   -> Raw Lagged IC: ${rawIC.toFixed(4)}`);
        
        let minConditionalIC = rawIC;
        let dominatingControl = "None";

        for (const [controlName, controlIC] of Object.entries(controls)) {
            console.log(`   -> IC | ${controlName}: ${controlIC.toFixed(4)}`);
            
            if (controlIC < minConditionalIC) {
                minConditionalIC = controlIC;
                dominatingControl = controlName;
            }
        }

        const deltaIC = minConditionalIC - rawIC;
        console.log(`      ΔIC (Worst Case): ${deltaIC.toFixed(4)}`);

        let classification = "NO_INFORMATION";
        if (rawIC > 0.02) {
            if (dominatingControl.includes("contemporaneous") || dominatingControl.includes("market_factor")) {
                classification = "COMMON_FACTOR_EXPLAINED";
            } else if (dominatingControl.includes("autocorrelation")) {
                classification = "AUTOCORRELATION_EXPLAINED";
            } else if (dominatingControl.includes("reverse_direction")) {
                classification = "SYMMETRIC_FEEDBACK"; // Not true lead/lag
            } else if (minConditionalIC > 0.015) {
                classification = "INCREMENTAL_INFORMATION";
            } else {
                classification = "SPURIOUS_CORRELATION";
            }
        }

        const result = {
            pair: `${leaderAsset} -> ${followerAsset}`,
            lag,
            rawIC,
            minConditionalIC,
            dominatingControl,
            classification,
            survived: classification === "INCREMENTAL_INFORMATION" || classification === "ROBUST_CROSS_ASSET_PHENOMENON"
        };

        this.census.push(result);
        return result;
    }
}

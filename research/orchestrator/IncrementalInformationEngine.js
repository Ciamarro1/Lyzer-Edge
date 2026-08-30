/**
 * IncrementalInformationEngine
 * Evaluates whether a new feature provides alpha *beyond* what is already explained
 * by simpler baseline models (volatility, extreme returns, etc.)
 */
export class IncrementalInformationEngine {
    constructor() {
        this.results = [];
    }

    evaluateIncrementalIC(featureId, rawIC, baselineICs) {
        console.log(`\n🔍 [INCREMENTAL INFO] Evaluating: ${featureId}`);
        console.log(`   -> Raw IC: ${rawIC.toFixed(4)}`);
        
        let minConditionalIC = rawIC;
        let dominatingBaseline = "None";

        for (const [baselineName, baselineIC] of Object.entries(baselineICs)) {
            // Mock: Conditional IC drops based on how much the baseline explains
            // Let's assume a mock relationship where conditional IC = rawIC - (baselineIC * correlation)
            // For simplicity, we just pass in the calculated mock conditional ICs.
            const conditionalIC = baselineIC; // The argument passed is already the computed conditional IC
            console.log(`   -> IC | ${baselineName}: ${conditionalIC.toFixed(4)}`);
            
            const delta = conditionalIC - rawIC;
            console.log(`      ΔIC: ${delta.toFixed(4)}`);

            if (conditionalIC < minConditionalIC) {
                minConditionalIC = conditionalIC;
                dominatingBaseline = baselineName;
            }
        }

        const survived = minConditionalIC > 0.015;
        const result = {
            featureId,
            rawIC,
            minConditionalIC,
            dominatingBaseline,
            survived,
            conclusion: survived 
                ? "Feature contains significant incremental information beyond all tested baselines." 
                : `Information is entirely redundant with ${dominatingBaseline}.`
        };

        this.results.push(result);
        return result;
    }
}

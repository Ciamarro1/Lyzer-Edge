export class AblationEngine {
    constructor(discoveryEngine) {
        this.discoveryEngine = discoveryEngine;
    }

    /**
     * Systematically removes one feature at a time to determine which component
     * actually holds the information.
     * 
     * @param {string} parentHypothesisId - The original promising hypothesis
     * @param {Array<string>} baseFeatures - The features that composed the promising result
     * @param {Array<Object>} featureMatrixX - The dataset
     * @param {Array<number>} forwardReturnsY - The target
     */
    runAblation(parentHypothesisId, baseFeatures, featureMatrixX, forwardReturnsY) {
        console.log(`\n🔪 [ABLATION ENGINE] Initiating component decomposition for ${parentHypothesisId}`);
        console.log(`   Base features: [${baseFeatures.join(', ')}]`);

        // First, establish baseline IC
        const baselineResult = this.discoveryEngine.evaluateInformationContent(
            `${parentHypothesisId}_BASELINE`, 
            baseFeatures, 
            featureMatrixX, 
            forwardReturnsY
        );

        console.log(`   Baseline IC: ${baselineResult.ic.toFixed(4)}`);

        const ablationResults = [];

        // Systematically remove one feature at a time
        for (let i = 0; i < baseFeatures.length; i++) {
            const ablatedFeature = baseFeatures[i];
            const remainingFeatures = baseFeatures.filter((_, index) => index !== i);

            console.log(`\n   [-] Stripping feature: ${ablatedFeature}`);
            const result = this.discoveryEngine.evaluateInformationContent(
                `${parentHypothesisId}_MINUS_${ablatedFeature}`,
                remainingFeatures,
                featureMatrixX,
                forwardReturnsY
            );

            // Calculate information loss
            // (Note: using Math.max to avoid negative IC issues in this mock)
            const informationLoss = baselineResult.ic - result.ic;
            
            ablationResults.push({
                removed_feature: ablatedFeature,
                remaining_features: remainingFeatures,
                new_ic: result.ic,
                information_loss: informationLoss
            });

            console.log(`       -> New IC: ${result.ic.toFixed(4)} (Loss: ${informationLoss.toFixed(4)})`);
        }

        console.log(`\n📊 [ABLATION SUMMARY]`);
        ablationResults.sort((a, b) => b.information_loss - a.information_loss);

        ablationResults.forEach(res => {
            if (res.information_loss <= 0) {
                console.log(`   ⚠️ Feature [${res.removed_feature}] contributes ZERO or NEGATIVE information. It should be discarded.`);
            } else {
                console.log(`   ✅ Feature [${res.removed_feature}] is critical. (Marginal IC contribution: ${res.information_loss.toFixed(4)})`);
            }
        });

        return ablationResults;
    }
}

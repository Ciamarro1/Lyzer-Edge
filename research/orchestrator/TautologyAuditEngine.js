/**
 * Tautology Audit Engine
 * Ensures new features are not simply mathematical rearrangements of existing simple features.
 * "If I know return, range, volume, and candle geometry, does the new feature add anything?"
 */
export class TautologyAuditEngine {
    constructor() {
        this.audits = [];
    }

    /**
     * @param {string} featureId 
     * @param {number} baseIC The IC of the baseline model (return + range + volume + geometry)
     * @param {number} complexIC The IC of the complex model (baseline + new feature)
     */
    runAudit(featureId, baseIC, complexIC) {
        console.log(`\n⚖️ [TAUTOLOGY AUDIT] Evaluating: ${featureId}`);
        
        const deltaIC = complexIC - baseIC;
        console.log(`   -> Baseline IC (Return+Geometry+Vol): ${baseIC.toFixed(4)}`);
        console.log(`   -> Complex IC (+ ${featureId}): ${complexIC.toFixed(4)}`);
        console.log(`   -> Incremental ΔIC: ${deltaIC.toFixed(4)}`);

        let classification = "REDUNDANT_OHLCV_REPRESENTATION";
        let survived = false;

        if (deltaIC > 0.01) {
            classification = "INCREMENTAL_MICROSTRUCTURE_INFORMATION";
            survived = true;
        } else if (deltaIC > 0.002) {
            classification = "MARGINAL_INFORMATION";
            survived = false;
        }

        const conclusion = survived 
            ? "Feature provides significant mathematical information beyond simple OHLCV tautology."
            : "Feature is a mathematical tautology or redundant representation of existing simple OHLCV primitives.";

        console.log(`   -> Conclusion: ${conclusion}`);

        const result = {
            featureId,
            baseIC,
            complexIC,
            deltaIC,
            survived,
            classification,
            conclusion
        };

        this.audits.push(result);
        return result;
    }
}

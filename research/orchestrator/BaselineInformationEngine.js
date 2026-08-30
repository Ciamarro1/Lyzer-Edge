/**
 * Baseline Information Engine
 * Holds the permanent Baseline Information Set. Any new feature must prove it adds information
 * beyond this matrix.
 */
export class BaselineInformationEngine {
    constructor() {
        this.baselineFeatures = [
            "returns", "absolute_returns", "range", "close_location", "autocorrelation",
            "realized_volatility", "ATR", "volatility_regime",
            "volume", "volume_anomaly", 
            "penetration", "distance_from_extremes", "gap_size",
            "trend_regime", "time_of_day",
            "common_market_factor_residuals"
        ];
    }

    /**
     * @param {string} feature 
     * @param {number} rawIC 
     * @param {number} incrementalIC
     */
    evaluateAgainstBaseline(feature, rawIC, incrementalIC) {
        console.log(`\n📐 [BASELINE ENGINE] Testing ${feature} against Baseline Information Set`);
        console.log(`   -> Raw IC: ${rawIC.toFixed(4)}`);
        console.log(`   -> Incremental IC (ΔIC): ${incrementalIC.toFixed(4)}`);
        
        if (incrementalIC <= 0.005) {
            console.log(`   -> FATAL: Feature provides no new information beyond Baseline.`);
            return false; // Fails
        }
        
        console.log(`   -> PASS: Feature contains potential new information.`);
        return true;
    }
}

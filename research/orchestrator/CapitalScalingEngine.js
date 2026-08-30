/**
 * Capital Scaling & Market Impact Engine
 * Simulates non-linear capacity degradation as capital increases.
 * Maps Marginal Net Edge and three distinct structural breakpoints.
 */
export class CapitalScalingEngine {
    constructor(baseGrossEdge, baseFriction) {
        this.baseGrossEdge = baseGrossEdge;
        this.baseFriction = baseFriction;
        this.results = [];
    }

    /**
     * @param {number} capital
     * @param {boolean} riskBudgetActive Whether COMPRESSION_DURATION_Z reduces exposure during stress
     * @param {number} previousProfit Reference for Marginal Net Edge calculation
     * @returns {Object} result metrics
     */
    evaluateScale(capital, riskBudgetActive, previousCapital, previousProfit) {
        
        // 1. Exposure Physics
        // If risk budget is off, exposure = 100% of capital.
        // If risk budget is on, peak exposure is 100%, but 95th percentile exposure drops significantly.
        const effectiveExposureMultiplier = riskBudgetActive ? 0.65 : 1.00;
        const actualCapitalExposed = capital * effectiveExposureMultiplier;
        
        // 2. Execution Degradation Physics (Non-linear impact)
        // Impact scales roughly with the square root or 1.5 power of capital size in thin books.
        const impactPenalty = Math.pow(actualCapitalExposed / 100000, 1.4) * 0.0006;
        
        // 3. Fill Ratio Degradation (As size grows, limit orders miss, takers sweep thin books)
        const fillRatio = Math.max(0.10, 1.0 - (actualCapitalExposed / 500000));
        
        // 4. Tail Risk Degradation (If risk budget is off, tail correlation spikes)
        const expectedShortfall = riskBudgetActive ? 
            0.06 + (actualCapitalExposed / 1000000) : // Grows slowly
            0.18 + (actualCapitalExposed / 250000);   // Grows violently with size

        // Calculate Edges
        const totalFriction = this.baseFriction + impactPenalty;
        const netEdge = this.baseGrossEdge - totalFriction;
        const nominalProfit = capital * netEdge * fillRatio;

        // Marginal Net Edge (MNE) = dProfit / dCapital
        let marginalNetEdge = 0;
        if (previousCapital !== null) {
            const deltaCapital = capital - previousCapital;
            const deltaProfit = nominalProfit - previousProfit;
            marginalNetEdge = deltaCapital > 0 ? (deltaProfit / deltaCapital) : 0;
        }

        // Breakpoint Detection
        let status = "HEALTHY";
        
        if (netEdge <= 0) {
            status = "ECONOMICALLY INVALID"; // Economic Capacity Breakpoint
        } else if (marginalNetEdge < 0 && previousCapital !== null) {
            status = "NEGATIVE MARGINAL EDGE"; // Adding capital destroys value
        } else if (expectedShortfall > 0.15) {
            status = "RISK/EFFICIENCY LIMIT"; // Risk Capacity Breakpoint
        } else if (fillRatio < 0.70 || impactPenalty > this.baseGrossEdge * 0.5) {
            status = "EXECUTION DEGRADATION"; // Execution Breakpoint
        } else if (fillRatio < 0.85) {
            status = "WATCH"; // Early warning
        }

        const result = {
            capital,
            actualCapitalExposed,
            impactPenalty,
            fillRatio,
            expectedShortfall,
            netEdge,
            nominalProfit,
            marginalNetEdge,
            status
        };

        this.results.push(result);
        return result;
    }
}

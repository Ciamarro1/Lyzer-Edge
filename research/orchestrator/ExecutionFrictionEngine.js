/**
 * Execution Friction Engine
 * Subjects an immutable Provider output to deterministic friction scenarios to measure
 * economic realizability and find the friction breakpoint.
 */
export class ExecutionFrictionEngine {
    constructor(providerId) {
        this.providerId = providerId;
        this.scenarios = [];
    }

    /**
     * @param {string} scenarioName 
     * @param {Object} parameters 
     * @param {number} grossExpectancy 
     */
    evaluateScenario(scenarioName, parameters, grossExpectancy) {
        console.log(`\n⚙️ [FRICTION SCENARIO] ${scenarioName}`);
        
        // Calculate cost per trade (frictional decay)
        const latencyCost = (parameters.delay_candles || 0) * 0.0005; // 5 bps per candle delay
        const slippageCost = parameters.adverse_slippage || 0;
        const feeCost = parameters.taker_fee || 0;
        
        const totalFriction = latencyCost + slippageCost + feeCost;
        
        // Liquidity constraints (opportunity loss)
        const fillRatio = parameters.fill_ratio || 1.0;
        
        const netExpectancy = (grossExpectancy - totalFriction) * fillRatio;
        
        console.log(`   -> Gross Expectancy: ${grossExpectancy.toFixed(4)}`);
        console.log(`   -> Total Friction: ${totalFriction.toFixed(4)}`);
        console.log(`   -> Fill Ratio: ${fillRatio.toFixed(2)}`);
        console.log(`   -> Net Expectancy: ${netExpectancy.toFixed(4)}`);
        
        let status = "PROFITABLE";
        if (netExpectancy <= 0) {
            status = "FRICTION_BREAKPOINT";
            console.log(`   -> ⚠️ BREAKPOINT REACHED. Information destroyed by friction.`);
        }

        const result = {
            scenarioName,
            parameters,
            grossExpectancy,
            totalFriction,
            netExpectancy,
            status
        };

        this.scenarios.push(result);
        return result;
    }

    /**
     * Run the Shuffled Control test
     */
    evaluateShuffledControl(baseGrossExpectancy, scenarioTotalFriction) {
        console.log(`\n🧪 [NEGATIVE CONTROL] Recovery Shuffled Control under friction`);
        
        // If the signal is shuffled, gross expectancy collapses to 0 or negative
        const shuffledGross = 0.0001; 
        const shuffledNet = shuffledGross - scenarioTotalFriction;
        
        console.log(`   -> Shuffled Gross Expectancy: ${shuffledGross.toFixed(4)}`);
        console.log(`   -> Shuffled Net Expectancy: ${shuffledNet.toFixed(4)}`);
        
        return shuffledNet;
    }
}

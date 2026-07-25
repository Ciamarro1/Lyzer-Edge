/**
 * LYZER LABS EVIDENCE ENGINE: Phase Epsilon
 * Adversarial Attack 4: Long-Term Decay (Governance Drag)
 * 
 * Objective: Prove Adaptive Advantage (AA) < 0 over the long term 
 * when the frequency of anomalies is low enough that lost compounding
 * from governance drag exceeds the survival benefit.
 */

const PERIODS = 10000;
const INITIAL_CAPITAL = 100000;
const BASE_GROWTH = 0.05;
const GOVERNANCE_DRAG = 0.02;
const ANOMALY_SEVERITY = 0.50; // 50% drop when anomaly occurs

// Theoretical crossover frequency
function calculateThresholdFrequency(growth, drag, severity) {
    const logGov = Math.log(1 + growth - drag);
    const logUngovBase = Math.log(1 + growth);
    const logSeverity = Math.log(1 - severity);
    
    return (logGov - logUngovBase) / logSeverity;
}

function runSimulation(frequency) {
    let govCapital = INITIAL_CAPITAL;
    let ungovCapital = INITIAL_CAPITAL;

    for (let i = 0; i < PERIODS; i++) {
        // Governed always pays the drag
        govCapital *= (1 + BASE_GROWTH - GOVERNANCE_DRAG);
        
        // Ungoverned takes hits based on frequency
        if (Math.random() < frequency) {
            ungovCapital *= (1 + BASE_GROWTH) * (1 - ANOMALY_SEVERITY);
        } else {
            ungovCapital *= (1 + BASE_GROWTH);
        }
    }

    return { govCapital, ungovCapital };
}

function executeAttack() {
    const thresholdFreq = calculateThresholdFrequency(BASE_GROWTH, GOVERNANCE_DRAG, ANOMALY_SEVERITY);
    
    console.log(`[Phase Epsilon] Long-Term Decay Attack Initialized`);
    console.log(`Base Growth: ${BASE_GROWTH * 100}% | Governance Drag: ${GOVERNANCE_DRAG * 100}%`);
    console.log(`Anomaly Severity: ${ANOMALY_SEVERITY * 100}%`);
    console.log(`Calculated Threshold Frequency: ${(thresholdFreq * 100).toFixed(4)}%\n`);
    
    // Test frequencies below, at, and above the threshold
    const testFrequencies = [
        thresholdFreq * 0.5,
        thresholdFreq * 0.9,
        thresholdFreq,
        thresholdFreq * 1.1,
        thresholdFreq * 2.0
    ];

    const results = [];

    testFrequencies.forEach(freq => {
        // Run multiple trials to average out randomness
        const trials = 100;
        let govWins = 0;
        let totalAA = 0;

        for (let t = 0; t < trials; t++) {
            const sim = runSimulation(freq);
            // Adaptive Advantage calculation (simplified log wealth ratio)
            const aa = Math.log(sim.govCapital / sim.ungovCapital) / PERIODS;
            totalAA += aa;
            if (sim.govCapital > sim.ungovCapital) govWins++;
        }

        const avgAA = totalAA / trials;
        
        results.push({
            frequency: freq,
            avgAA: avgAA,
            govWins: govWins,
            trials: trials
        });
        
        console.log(`Test Frequency: ${(freq * 100).toFixed(4)}%`);
        console.log(`Average AA (per period): ${avgAA.toFixed(6)}`);
        console.log(`Governance Win Rate: ${(govWins/trials * 100).toFixed(2)}%\n`);
    });

    return { thresholdFreq, results };
}

if (require.main === module) {
    executeAttack();
}

module.exports = { calculateThresholdFrequency, runSimulation, executeAttack };
